import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, StyleSheet, Alert,
  ActivityIndicator, ScrollView, TouchableOpacity,
} from "react-native";
import OsmMap from "../components/OsmMap";
import PillButton from "../components/PillButton";
import { estimateFare, createBooking, geocodeSearch, getMyBookings } from "../api/client";
import { colors, radius, spacing, font, cardShadow } from "../theme";

const KIGALI = { lat: -1.9441, lng: 30.0619 };

// The map crashes/misbehaves if handed a non-finite coordinate.
// These guards ensure we never pass null/undefined/NaN to a region or marker.
const isNum = (n) => typeof n === "number" && Number.isFinite(n);
const isCoord = (c) => !!c && isNum(c.lat) && isNum(c.lng);

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
  // Only trust userLocation if both coords are finite numbers; else fall back to Kigali.
  const pickup = isCoord(userLocation) ? userLocation : KIGALI;

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
    // Geocode results may arrive as strings — coerce, then require finite numbers.
    const lat = Number(place?.lat);
    const lng = Number(place?.lng);
    if (!isNum(lat) || !isNum(lng)) {
      Alert.alert("Invalid place", "That place has no valid coordinates. Try another.");
      return;
    }
    const name = place?.name || "Selected place";
    setDestination({ lat, lng, name });
    // Show only the first segment (before first comma) as display text
    setSearchText(name.split(",")[0].trim());
    setSuggestions([]);
    setEstimate(null);
    setMapRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    });
  }

  function handleMapTap(lat, lng) {
    if (!isNum(lat) || !isNum(lng)) return;
    setDestination({ lat, lng, name: "Tapped on map" });
    setSearchText("Tapped on map");
    setSuggestions([]);
    setEstimate(null);
    setMapRegion({
      latitude: lat,
      longitude: lng,
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
    if (!taxi?.id) {
      Alert.alert("Missing taxi", "Go back and pick a taxi again.");
      return;
    }
    // Never build a booking with an undefined/NaN destination.
    if (!isCoord(destination)) {
      Alert.alert("Choose a destination", "Please choose a destination first.");
      return;
    }
    if (!isCoord(pickup)) {
      Alert.alert("Location unavailable", "Your pickup location isn't ready yet. Try again.");
      return;
    }

    const payload = {
      vehicle_id: taxi.id,
      pickup_lat: pickup.lat,
      pickup_lng: pickup.lng,
      destination_lat: destination.lat,
      destination_lng: destination.lng,
    };
    console.log("[handleConfirm] about to POST /bookings →", JSON.stringify(payload));

    setConfirming(true);
    try {
      const result = await createBooking(payload);
      console.log("[handleConfirm] POST /bookings OK →", JSON.stringify(result));
      setBooking(result);
    } catch (e) {
      console.log("[handleConfirm] POST /bookings FAILED →", describeError(e));
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
        <PillButton title="Go back" onPress={() => navigation.goBack()} style={{ marginTop: spacing.lg }} />
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
        <PillButton
          title="Track Trip on Map"
          onPress={() => navigation.replace("Trip", { booking, taxi })}
        />
      </View>
    );
  }

  // ── Booking input screen ──────────────────────────────────────────────────
  // Never hand the map a non-finite region; default to Kigali.
  const safeRegion = (isNum(mapRegion?.latitude) && isNum(mapRegion?.longitude))
    ? mapRegion
    : { latitude: KIGALI.lat, longitude: KIGALI.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 };

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
        <View style={styles.map}>
          <OsmMap
            style={{ flex: 1 }}
            center={{ lat: safeRegion.latitude, lng: safeRegion.longitude }}
            tappable
            onPress={handleMapTap}
            markers={[
              isCoord(pickup) && { lat: pickup.lat, lng: pickup.lng, color: "#f90", title: "Pickup" },
              isCoord(destination) && {
                lat: destination.lat, lng: destination.lng, color: "#c00",
                title: (destination.name || "").split(",")[0],
              },
            ].filter(Boolean)}
          />
        </View>

        {/* Estimate button */}
        <View style={styles.buttonRow}>
          <PillButton
            title="Get Fare Estimate"
            onPress={handleEstimate}
            disabled={!destination}
          />
        </View>

        {estimating && <ActivityIndicator style={{ marginTop: 16 }} color={colors.primary} />}

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
            <PillButton
              title="Confirm Booking"
              onPress={handleConfirm}
              loading={confirming}
              color={colors.success}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.screen },
  scroll: { padding: spacing.lg, paddingBottom: 40 },
  container: { flex: 1, padding: spacing.xl, backgroundColor: colors.screen },
  title: { fontFamily: font.family, fontSize: 22, color: colors.text, marginBottom: 2 },
  sub: { fontFamily: font.familyRegular, color: colors.textMuted, marginBottom: 18, fontSize: 14 },

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
  locationLabel: { fontFamily: font.familyRegular, fontSize: 15, color: colors.text },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    padding: 12,
    fontFamily: font.familyRegular,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.card,
  },

  suggestions: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    backgroundColor: colors.card,
    marginBottom: 10,
    overflow: "hidden",
  },
  suggestionItem: { paddingHorizontal: 14, paddingVertical: 11 },
  suggestionBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  suggestionText: { fontFamily: font.familyRegular, fontSize: 14, color: colors.text },

  hint: { fontFamily: font.familyRegular, fontSize: 13, color: colors.textMuted, marginBottom: 6 },
  map: { height: 220, borderRadius: radius.card, marginBottom: 14, overflow: "hidden", backgroundColor: "#e8e8e8" },

  buttonRow: { marginTop: spacing.sm, marginBottom: spacing.xs },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginVertical: spacing.md,
    ...cardShadow,
  },
  label: { fontFamily: font.familyRegular, color: colors.textMuted, fontSize: 12, marginTop: 8 },
  value: { fontFamily: font.familyMedium, fontSize: 16, color: colors.text },
  fare: { fontFamily: font.familyBold, fontSize: 20, color: colors.primary },
  statusBanner: {
    borderWidth: 2, borderRadius: radius.card, padding: spacing.lg,
    marginBottom: spacing.md, alignItems: "center", backgroundColor: colors.card,
  },
  statusText: { fontFamily: font.family, fontSize: 16, textAlign: "center" },
});
