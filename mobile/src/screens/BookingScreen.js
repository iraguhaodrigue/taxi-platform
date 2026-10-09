import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, Button, StyleSheet, Alert,
  ActivityIndicator, ScrollView, TouchableOpacity,
} from "react-native";
import MapView, { Marker, UrlTile } from "react-native-maps";
import { estimateFare, createBooking, geocodeSearch, getMyBookings } from "../api/client";

const KIGALI = { lat: -1.9441, lng: 30.0619 };

// Build a human-readable description of an error: the message, plus the HTTP
// status and response body when the server actually answered.
function describeError(e) {
  const parts = [];
  if (e?.message) parts.push(e.message);
  if (e?.response?.status != null) parts.push(`Status: ${e.response.status}`);
  if (e?.response?.data != null) parts.push(JSON.stringify(e.response.data));
  return parts.join("\n") || "Unknown error";
}

export default function BookingScreen({ route, navigation }) {
  // Guard against a missing navigation param so a bad route never crashes the app.
  const { taxi, userLocation } = route.params || {};
  const pickup = userLocation || KIGALI;

  // Address search
  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [destination, setDestination] = useState(null); // { lat, lng, name }

  // Map region tracks destination (or pickup while none chosen)
  const [mapRegion, setMapRegion] = useState({
    latitude: pickup.lat,
    longitude: pickup.lng,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // Fare + booking
  const [estimate, setEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [booking, setBooking] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [liveStatus, setLiveStatus] = useState(null);

  // Debounced geocode search
  useEffect(() => {
    if (searchText.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await geocodeSearch(searchText);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Poll booking status after confirmation (every 5 s until completed/cancelled)
  useEffect(() => {
    if (!booking) return;
    const DONE = ["completed", "cancelled"];
    if (DONE.includes(liveStatus)) return;

    const interval = setInterval(async () => {
      try {
        const list = await getMyBookings();
        const fresh = list.find((b) => b.id === booking.id);
        if (fresh) {
          setLiveStatus(fresh.status);
          if (DONE.includes(fresh.status)) clearInterval(interval);
        }
      } catch {
        // ignore transient errors
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [booking, liveStatus]);

  function selectSuggestion(place) {
    const name = place?.name || "Selected place";
    setDestination({ lat: place.lat, lng: place.lng, name });
    // Show only the first segment (before first comma) as display text
    setSearchText(name.split(",")[0].trim());
    setSuggestions([]);
    setEstimate(null);
    setMapRegion({
      latitude: place.lat,
      longitude: place.lng,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    });
  }

  function handleMapPress(e) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setDestination({ lat: latitude, lng: longitude, name: "Tapped on map" });
    setSearchText("Tapped on map");
    setSuggestions([]);
    setEstimate(null);
    setMapRegion({
      latitude,
      longitude,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    });
  }

  async function handleEstimate() {
    if (!destination) {
      Alert.alert("No destination", "Search for a place or tap the map to set a destination.");
      return;
    }
    setEstimating(true);
    setEstimate(null);
    try {
      const result = await estimateFare(
        { lat: pickup.lat, lng: pickup.lng },
        { lat: destination.lat, lng: destination.lng }
      );
      setEstimate(result);
    } catch (e) {
      Alert.alert("Estimate failed", describeError(e));
    } finally {
      setEstimating(false);
    }
  }

  async function handleConfirm() {
    // Guard required values so we never read a property off undefined.
    if (!taxi?.id) {
      Alert.alert("Missing taxi", "This taxi has no id. Go back and pick a taxi again.");
      return;
    }
    if (!destination) {
      Alert.alert("No destination", "Set a destination before confirming.");
      return;
    }
    setConfirming(true);
    try {
      const result = await createBooking({
        vehicle_id: taxi.id,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
      });
      setBooking(result);
    } catch (e) {
      // Show the real error and stay on the screen — never navigate away.
      Alert.alert("Booking failed", describeError(e));
    } finally {
      setConfirming(false);
    }
  }

  // ── Missing navigation param — show a safe fallback, don't crash ──────────
  if (!taxi) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.sub}>
          No taxi was passed to this screen. Go back and choose a taxi again.
        </Text>
        <Button title="Go back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  // ── Booking confirmed screen ──────────────────────────────────────────────
  if (booking) {
    const currentStatus = liveStatus || booking.status;
    const STATUS_LABEL = {
      requested: "Waiting for driver to accept…",
      accepted: "Driver accepted! On the way 🚗",
      ongoing: "Trip in progress 🛣️",
      completed: "Trip completed ✓",
      cancelled: "Booking cancelled",
    };
    const STATUS_COLOR = {
      requested: "#b45309",
      accepted: "#1d4ed8",
      ongoing: "#166534",
      completed: "#555",
      cancelled: "#991b1b",
    };
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Booking Confirmed!</Text>
        <View style={[styles.statusBanner, { borderColor: STATUS_COLOR[currentStatus] || "#ccc" }]}>
          <Text style={[styles.statusText, { color: STATUS_COLOR[currentStatus] || "#555" }]}>
            {STATUS_LABEL[currentStatus] || currentStatus}
          </Text>
          {!["completed", "cancelled"].includes(currentStatus) && (
            <ActivityIndicator size="small" style={{ marginTop: 4 }} />
          )}
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Booking ID</Text>
          <Text style={styles.value}>#{booking.id}</Text>
          <Text style={styles.label}>Distance</Text>
          <Text style={styles.value}>{booking.estimated_distance_km} km</Text>
          <Text style={styles.label}>Est. time</Text>
          <Text style={styles.value}>{booking.estimated_time_min} min</Text>
          <Text style={styles.label}>Est. fare</Text>
          <Text style={[styles.value, styles.fare]}>{booking.estimated_fare} RWF</Text>
        </View>
        <Button
          title="Track Trip on Map"
          onPress={() => navigation.replace("Trip", { booking, taxi })}
        />
      </View>
    );
  }

  // ── Booking input screen ──────────────────────────────────────────────────
  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Book {taxi.plate_number}</Text>
        <Text style={styles.sub}>{taxi.driver_name} · {taxi.driver_phone}</Text>

        {/* Pickup row */}
        <View style={styles.locationRow}>
          <View style={[styles.dot, { backgroundColor: "#f90" }]} />
          <Text style={styles.locationLabel}>Your location (GPS)</Text>
        </View>

        {/* Destination search row */}
        <View style={styles.locationRow}>
          <View style={[styles.dot, { backgroundColor: "#c00" }]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Where to? Search address…"
            value={searchText}
            onChangeText={(t) => {
              setSearchText(t);
              setEstimate(null);
            }}
            returnKeyType="search"
          />
          {searching && <ActivityIndicator size="small" style={{ marginLeft: 8 }} />}
        </View>

        {/* Autocomplete suggestions */}
        {suggestions.length > 0 && (
          <View style={styles.suggestions}>
            {suggestions.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.suggestionItem,
                  i < suggestions.length - 1 && styles.suggestionBorder,
                ]}
                onPress={() => selectSuggestion(s)}
              >
                <Text style={styles.suggestionText} numberOfLines={2}>
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Mini map */}
        <Text style={styles.hint}>
          {destination ? `📍 ${destination.name.split(",")[0]}` : "Tap the map to set destination"}
        </Text>
        <MapView
          style={styles.map}
          region={mapRegion}
          mapType="none"
          scrollEnabled={false}
          onPress={handleMapPress}
        >
          <UrlTile
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />
          <Marker
            coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
            title="Pickup"
            pinColor="#f90"
          />
          {destination && (
            <Marker
              coordinate={{ latitude: destination.lat, longitude: destination.lng }}
              title="Destination"
              description={destination.name.split(",")[0]}
              pinColor="#c00"
            />
          )}
        </MapView>

        {/* Estimate button */}
        <View style={styles.buttonRow}>
          <Button
            title="Get Fare Estimate"
            onPress={handleEstimate}
            disabled={!destination}
          />
        </View>

        {estimating && <ActivityIndicator style={{ marginTop: 16 }} />}

        {estimate && (
          <View style={styles.card}>
            <Text style={styles.label}>Distance</Text>
            <Text style={styles.value}>{estimate.distance_km} km</Text>
            <Text style={styles.label}>Est. time</Text>
            <Text style={styles.value}>{estimate.time_min} min</Text>
            <Text style={styles.label}>Est. fare</Text>
            <Text style={[styles.value, styles.fare]}>{estimate.fare} RWF</Text>
          </View>
        )}

        {estimate && (
          <View style={styles.buttonRow}>
            {confirming ? (
              <ActivityIndicator />
            ) : (
              <Button title="Confirm Booking" onPress={handleConfirm} color="#2a7" />
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  scroll: { padding: 20, paddingBottom: 40 },
  container: { flex: 1, padding: 24 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 2 },
  sub: { color: "#555", marginBottom: 18, fontSize: 14 },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
    flexShrink: 0,
  },
  locationLabel: { fontSize: 15, color: "#444" },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
  },

  suggestions: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
    marginBottom: 10,
    overflow: "hidden",
  },
  suggestionItem: { paddingHorizontal: 14, paddingVertical: 11 },
  suggestionBorder: { borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  suggestionText: { fontSize: 14, color: "#333" },

  hint: { fontSize: 13, color: "#888", marginBottom: 6 },
  map: { height: 220, borderRadius: 10, marginBottom: 14, overflow: "hidden" },

  buttonRow: { marginTop: 4, marginBottom: 4 },

  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    padding: 16,
    marginVertical: 12,
  },
  label: { color: "#888", fontSize: 12, marginTop: 8 },
  value: { fontSize: 16, fontWeight: "500" },
  fare: { fontSize: 20, color: "#2a7", fontWeight: "bold" },
  statusBanner: {
    borderWidth: 2, borderRadius: 10, padding: 14,
    marginBottom: 12, alignItems: "center",
  },
  statusText: { fontSize: 16, fontWeight: "600", textAlign: "center" },
});
