import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import MapView, { Marker, UrlTile } from "react-native-maps";
import { listenToDriver } from "../api/tracking";

export default function TripScreen({ route }) {
  const { booking, taxi } = route.params;

  const [driverLocation, setDriverLocation] = useState(
    taxi.lat && taxi.lng ? { latitude: taxi.lat, longitude: taxi.lng } : null
  );
  const [status, setStatus] = useState(booking.status);
  const cleanupRef = useRef(null);

  const initialRegion = driverLocation
    ? {
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : {
        latitude: booking.pickup_lat || -1.9441,
        longitude: booking.pickup_lng || 30.0619,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  useEffect(() => {
    const cleanup = listenToDriver(booking.id, (loc) => {
      setDriverLocation({ latitude: loc.lat, longitude: loc.lng });
    });
    cleanupRef.current = cleanup;
    return () => cleanup();
  }, [booking.id]);

  const statusColor = {
    requested: "#f90",
    accepted: "#29a",
    ongoing: "#2a7",
    completed: "#777",
    cancelled: "#c00",
  }[status] || "#555";

  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        <Text style={styles.statusLabel}>Trip status</Text>
        <Text style={[styles.statusValue, { color: statusColor }]}>
          {status.replace("_", " ").toUpperCase()}
        </Text>
        <Text style={styles.bookingId}>Booking #{booking.id}</Text>
      </View>

      <MapView style={styles.map} initialRegion={initialRegion} mapType="none">
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />
        {driverLocation && (
          <Marker
            coordinate={driverLocation}
            title={taxi.plate_number}
            description={taxi.driver_name}
            pinColor="#2a7"
          />
        )}
        {booking.pickup_lat && booking.pickup_lng && (
          <Marker
            coordinate={{ latitude: booking.pickup_lat, longitude: booking.pickup_lng }}
            title="Pickup"
            pinColor="#f90"
          />
        )}
        {booking.destination_lat && booking.destination_lng && (
          <Marker
            coordinate={{ latitude: booking.destination_lat, longitude: booking.destination_lng }}
            title="Destination"
            pinColor="#c00"
          />
        )}
      </MapView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {taxi.plate_number} · {taxi.driver_name}
        </Text>
        <Text style={styles.fare}>Est. fare: {booking.estimated_fare} RWF</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statusBar: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  statusLabel: { fontSize: 11, color: "#888", textTransform: "uppercase" },
  statusValue: { fontSize: 18, fontWeight: "bold" },
  bookingId: { color: "#aaa", fontSize: 12, marginTop: 2 },
  map: { flex: 1 },
  footer: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  footerText: { fontSize: 16, fontWeight: "500" },
  fare: { color: "#2a7", fontWeight: "bold", marginTop: 4, fontSize: 16 },
});
