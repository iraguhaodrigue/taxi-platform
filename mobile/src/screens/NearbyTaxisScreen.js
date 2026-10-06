import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity,
} from "react-native";
import * as Location from "expo-location";
import { getNearbyTaxis } from "../api/client";

export default function NearbyTaxisScreen({ navigation }) {
  const [taxis, setTaxis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError("Location permission is needed to find taxis near you.");
          setLoading(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        const data = await getNearbyTaxis(pos.coords.latitude, pos.coords.longitude, 5);
        setTaxis(data);
      } catch (e) {
        setError("Could not load taxis. Is the backend running?");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;
  if (error) return <Text style={styles.error}>{error}</Text>;

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={taxis}
      keyExtractor={(item) => String(item.id)}
      ListEmptyComponent={<Text style={styles.empty}>No taxis near you right now.</Text>}
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
  list: { padding: 16 },
  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 10, padding: 16, marginBottom: 12 },
  plate: { fontSize: 18, fontWeight: "bold" },
  distance: { marginTop: 4, color: "#2a7" },
  tap: { marginTop: 6, color: "#555", fontSize: 12 },
  error: { flex: 1, textAlign: "center", marginTop: 40, paddingHorizontal: 24, color: "#c00" },
  empty: { textAlign: "center", marginTop: 40, color: "#777" },
});
