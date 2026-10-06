import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import MapView, { Marker, UrlTile } from "react-native-maps";
import { listenToDriver } from "../api/tracking";
import { getMyBookings } from "../api/client";

const DONE_STATUSES = ["completed", "cancelled"];

export default function TripScreen({ route }) {
  const { booking, taxi } = route.params;

  const mapRef = useRef(null);
  const userPannedRef = useRef(false);   // true once the user manually drags the map

  const [driverLocation, setDriverLocation] = useState(
    taxi.lat && taxi.lng ? { latitude: taxi.lat, longitude: taxi.lng } : null
  );
  const [liveStatus, setLiveStatus] = useState(booking.status);
  const [wsStatus, setWsStatus] = useState("connecting"); // 'connecting' | 'live'

  // ── WebSocket listener with auto-reconnect ────────────────────────────────
  useEffect(() => {
    const stop = listenToDriver(
      booking.id,
      (loc) => setDriverLocation({ latitude: loc.lat, longitude: loc.lng }),
      (s) => setWsStatus(s),
    );
    return stop;
  }, [booking.id]);

  // ── Status polling — every 5 s, stop when trip is done ───────────────────
  useEffect(() => {
    if (DONE_STATUSES.includes(liveStatus)) return;

    const interval = setInterval(async () => {
      try {
        const list = await getMyBookings();
        const fresh = list.find((b) => b.id === booking.id);
        if (fresh) {
          setLiveStatus(fresh.status);
          if (DONE_STATUSES.includes(fresh.status)) clearInterval(interval);
        }
      } catch {
        // transient error — keep polling
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [liveStatus]);

  // ── Initial map fit — run once when driver location is first known ────────
  const fittedRef = useRef(false);
  useEffect(() => {
    if (!driverLocation || fittedRef.current || !mapRef.current) return;
    fittedRef.current = true;

    const coords = [{ latitude: driverLocation.latitude, longitude: driverLocation.longitude }];
    if (booking.pickup_lat)      coords.push({ latitude: booking.pickup_lat,      longitude: booking.pickup_lng });
    if (booking.destination_lat) coords.push({ latitude: booking.destination_lat, longitude: booking.destination_lng });

    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 80, right: 60, bottom: 80, left: 60 },
      animated: true,
    });
  }, [driverLocation]);

  // ── Follow taxi gently — only if user has not manually panned ────────────
  useEffect(() => {
    if (!driverLocation || userPannedRef.current || !mapRef.current) return;
    mapRef.current.animateCamera(
      { center: { latitude: driverLocation.latitude, longitude: driverLocation.longitude } },
      { duration: 800 },
    );
  }, [driverLocation]);

  // ── Derived display values ────────────────────────────────────────────────
  const STATUS_LABEL = {
    requested: "Waiting for driver",
    accepted:  "Driver is on the way",
    ongoing:   "Trip in progress",
    completed: "Trip completed",
    cancelled: "Booking cancelled",
  };
  const STATUS_COLOR = {
    requested: "#b45309",
    accepted:  "#1d4ed8",
    ongoing:   "#166534",
    completed: "#555",
    cancelled: "#991b1b",
  };
  const statusColor = STATUS_COLOR[liveStatus] || "#555";

  return (
    <View style={styles.container}>

      {/* Status bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusRow}>
          <Text style={[styles.statusValue, { color: statusColor }]}>
            {STATUS_LABEL[liveStatus] || liveStatus}
          </Text>
          <View style={[styles.wsPill, wsStatus === "live" ? styles.wsLive : styles.wsConnecting]}>
            <Text style={styles.wsText}>
              {wsStatus === "live" ? "● live" : "◌ connecting…"}
            </Text>
          </View>
        </View>
        <Text style={styles.bookingId}>Booking #{booking.id}</Text>
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType="none"
        initialRegion={{
          latitude:  driverLocation?.latitude  ?? booking.pickup_lat  ?? -1.9441,
          longitude: driverLocation?.longitude ?? booking.pickup_lng  ?? 30.0619,
          latitudeDelta:  0.04,
          longitudeDelta: 0.04,
        }}
        onPanDrag={() => { userPannedRef.current = true; }}
      >
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
        {booking.pickup_lat != null && (
          <Marker
            coordinate={{ latitude: booking.pickup_lat, longitude: booking.pickup_lng }}
            title="Pickup"
            pinColor="#f90"
          />
        )}
        {booking.destination_lat != null && (
          <Marker
            coordinate={{ latitude: booking.destination_lat, longitude: booking.destination_lng }}
            title="Destination"
            pinColor="#c00"
          />
        )}
      </MapView>

      {/* Footer */}
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
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusValue: { fontSize: 16, fontWeight: "bold" },
  bookingId: { color: "#aaa", fontSize: 12, marginTop: 2 },

  wsPill: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 12,
  },
  wsLive:       { backgroundColor: "#dcfce7" },
  wsConnecting: { backgroundColor: "#fef3c7" },
  wsText: { fontSize: 11, fontWeight: "600" },

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
