import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, Button,
} from "react-native";
import * as Location from "expo-location";
import { getNearbyTaxis } from "../api/client";

export default function NearbyTaxisScreen({ navigation }) {
  const [taxis, setTaxis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermissionDenied(true);
        setLoading(false);
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({});
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        const data = await getNearbyTaxis(loc.lat, loc.lng, 5);
        setTaxis(data);
      } catch (e) {
        setError("Could not load taxis. Is the backend running?");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function searchWider() {
    if (!userLocation) return;
    setSearching(true);
    setRadiusKm(20);
    try {
      const data = await getNearbyTaxis(userLocation.lat, userLocation.lng, 20);
      setTaxis(data);
    } catch {
      setError("Could not load taxis. Is the backend running?");
    } finally {
      setSearching(false);
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  if (permissionDenied) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Location permission required</Text>
        <Text style={styles.emptyBody}>
          This app needs your location to find taxis near you.{"\n"}
          Go to Settings → Apps → Taxi Booking → Permissions and allow Location.
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const isEmpty = taxis.length === 0 && !searching;

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={taxis}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        searching ? <ActivityIndicator style={{ marginBottom: 12 }} /> : null
      }
      ListEmptyComponent={
        isEmpty ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>No taxis within {radiusKm} km of you</Text>
            <Text style={styles.emptyBody}>
              There are no available taxis nearby right now.
            </Text>
            {radiusKm < 20 && (
              <View style={{ marginTop: 16 }}>
                <Button title="Search wider (20 km)" onPress={searchWider} />
              </View>
            )}
            {radiusKm >= 20 && (
              <Text style={styles.emptyBody}>
                No taxis found within 20 km either. Try again later.
              </Text>
            )}
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate("Booking", { taxi: item, userLocation })}
        >
          <Text style={styles.plate}>{item.plate_number}</Text>
          <Text>{item.driver_name} · {item.driver_phone}</Text>
          <Text style={styles.distance}>{item.distance_km} km away</Text>
          <Text style={styles.tap}>Tap to book →</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, flexGrow: 1 },
  card: {
    borderWidth: 1, borderColor: "#eee", borderRadius: 10,
    padding: 16, marginBottom: 12,
  },
  plate: { fontSize: 18, fontWeight: "bold" },
  distance: { marginTop: 4, color: "#2a7" },
  tap: { marginTop: 6, color: "#555", fontSize: 12 },
  center: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 32, paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 17, fontWeight: "600", color: "#333",
    textAlign: "center", marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14, color: "#777", textAlign: "center", lineHeight: 20,
  },
  errorText: {
    fontSize: 15, color: "#c00", textAlign: "center", paddingHorizontal: 24,
  },
});
