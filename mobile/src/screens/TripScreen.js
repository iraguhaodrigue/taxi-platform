import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Modal, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
} from "react-native";
import MapView, { Marker, UrlTile } from "react-native-maps";
import { listenToDriver } from "../api/tracking";
import { getMyBookings, submitRating } from "../api/client";

const DONE_STATUSES = ["completed", "cancelled"];

export default function TripScreen({ route, navigation }) {
  // Guard against missing params so a bad navigation can't crash on render.
  const { booking, taxi } = route.params || {};

  const mapRef = useRef(null);
  const userPannedRef = useRef(false);   // true once the user manually drags the map

  const [driverLocation, setDriverLocation] = useState(
    taxi?.lat && taxi?.lng ? { latitude: taxi.lat, longitude: taxi.lng } : null
  );
  const [liveStatus, setLiveStatus] = useState(booking?.status);
  const [wsStatus, setWsStatus] = useState("connecting"); // 'connecting' | 'live'

  // Rating prompt (shown once the trip completes)
  const [showRating, setShowRating] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const ratingPromptedRef = useRef(false);

  // ── WebSocket listener with auto-reconnect ────────────────────────────────
  useEffect(() => {
    if (booking?.id == null) return;
    const stop = listenToDriver(
      booking.id,
      (loc) => setDriverLocation({ latitude: loc.lat, longitude: loc.lng }),
      (s) => setWsStatus(s),
    );
    return stop;
  }, [booking?.id]);

  // ── Status polling — every 5 s, stop when trip is done ───────────────────
  useEffect(() => {
    if (DONE_STATUSES.includes(liveStatus)) return;

    const interval = setInterval(async () => {
      try {
        const list = await getMyBookings();
        const fresh = list.find((b) => b.id === booking?.id);
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
    if (booking?.pickup_lat)      coords.push({ latitude: booking.pickup_lat,      longitude: booking.pickup_lng });
    if (booking?.destination_lat) coords.push({ latitude: booking.destination_lat, longitude: booking.destination_lng });

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

  // ── Show the rating prompt once, when the trip completes ──────────────────
  useEffect(() => {
    if (liveStatus === "completed" && !ratingPromptedRef.current) {
      ratingPromptedRef.current = true;
      setShowRating(true);
    }
  }, [liveStatus]);

  function goHome() {
    navigation.navigate("NearbyTaxis");
  }

  async function handleSubmitRating() {
    if (stars < 1) {
      Alert.alert("Pick a rating", "Tap a star from 1 to 5 first.");
      return;
    }
    setSubmittingRating(true);
    try {
      await submitRating(booking?.id, stars, comment);
      setShowRating(false);
      Alert.alert("Thank you!", "Your rating has been submitted.", [
        { text: "OK", onPress: goHome },
      ]);
    } catch (e) {
      Alert.alert("Could not submit", e?.response?.data?.detail || "Please try again.");
    } finally {
      setSubmittingRating(false);
    }
  }

  // Passenger dismissed the prompt without rating — don't nag, just go home.
  function dismissRating() {
    setShowRating(false);
    goHome();
  }

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

  // Missing navigation params — show a safe fallback instead of crashing.
  if (!booking || !taxi) {
    return (
      <View style={[styles.container, { padding: 24, justifyContent: "center" }]}>
        <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>
          Trip details unavailable
        </Text>
        <Text style={{ color: "#666", marginBottom: 20 }}>
          This trip is missing its booking or taxi info. Go back and try again.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("NearbyTaxis")}
          style={{ backgroundColor: "#2a7", borderRadius: 10, paddingVertical: 14, alignItems: "center" }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Back to taxis</Text>
        </TouchableOpacity>
      </View>
    );
  }

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

      {/* Rating prompt */}
      <Modal
        visible={showRating}
        transparent
        animationType="slide"
        onRequestClose={dismissRating}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rate your trip</Text>
            <Text style={styles.modalSub}>
              {taxi.plate_number} · {taxi.driver_name}
            </Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setStars(n)} hitSlop={6}>
                  <Text style={[styles.star, n <= stars ? styles.starOn : styles.starOff]}>
                    {n <= stars ? "★" : "☆"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.commentBox}
              placeholder="Add a comment (optional)"
              value={comment}
              onChangeText={setComment}
              multiline
            />

            <View style={styles.modalActions}>
              {submittingRating ? (
                <ActivityIndicator />
              ) : (
                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitRating}>
                  <Text style={styles.submitBtnText}>Submit Rating</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.skipBtn} onPress={dismissRating}>
                <Text style={styles.skipBtnText}>Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 32,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", textAlign: "center" },
  modalSub: { color: "#777", textAlign: "center", marginTop: 2, marginBottom: 16 },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
  },
  star: { fontSize: 44, marginHorizontal: 4 },
  starOn: { color: "#f5a623" },
  starOff: { color: "#ccc" },
  commentBox: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    minHeight: 70,
    textAlignVertical: "top",
    fontSize: 15,
    marginBottom: 16,
  },
  modalActions: { gap: 10 },
  submitBtn: {
    backgroundColor: "#2a7",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  skipBtn: { paddingVertical: 10, alignItems: "center" },
  skipBtnText: { color: "#888", fontSize: 15 },
});
