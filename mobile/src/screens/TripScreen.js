import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Modal, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
} from "react-native";
import OsmMap from "../components/OsmMap";
import { listenToDriver } from "../api/tracking";
import { getMyBookings, submitRating } from "../api/client";
import { colors, radius, font } from "../theme";

const DONE_STATUSES = ["completed", "cancelled"];
const KIGALI = { latitude: -1.9441, longitude: 30.0619 };

// Guard against non-finite coordinates ever reaching the map.
const isNum = (n) => typeof n === "number" && Number.isFinite(n);

export default function TripScreen({ route, navigation }) {
  // Guard against missing params so a bad navigation can't crash on render.
  const { booking, taxi } = route.params || {};

  const [driverLocation, setDriverLocation] = useState(
    isNum(taxi?.lat) && isNum(taxi?.lng) ? { latitude: taxi.lat, longitude: taxi.lng } : null
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
      (loc) => {
        // Drop any malformed GPS packet so NaN never reaches the map camera.
        if (isNum(loc?.lat) && isNum(loc?.lng)) {
          setDriverLocation({ latitude: loc.lat, longitude: loc.lng });
        }
      },
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
    requested: colors.warning,
    accepted:  colors.primary,
    ongoing:   colors.success,
    completed: colors.textMuted,
    cancelled: colors.danger,
  };
  const statusColor = STATUS_COLOR[liveStatus] || colors.textMuted;

  // Missing navigation params — show a safe fallback instead of crashing.
  if (!booking || !taxi) {
    return (
      <View style={[styles.container, { padding: 24, justifyContent: "center" }]}>
        <Text style={{ fontFamily: font.family, fontSize: 18, color: colors.text, marginBottom: 8 }}>
          Trip details unavailable
        </Text>
        <Text style={{ fontFamily: font.familyRegular, color: colors.textMuted, marginBottom: 20 }}>
          This trip is missing its booking or taxi info. Go back and try again.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("NearbyTaxis")}
          style={{ backgroundColor: colors.primary, borderRadius: radius.button, paddingVertical: 14, alignItems: "center" }}
        >
          <Text style={{ fontFamily: font.family, color: colors.white }}>Back to taxis</Text>
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
      <OsmMap
        style={styles.map}
        center={{
          lat: isNum(driverLocation?.latitude)  ? driverLocation.latitude
             : isNum(booking?.pickup_lat)         ? booking.pickup_lat
             : KIGALI.latitude,
          lng: isNum(driverLocation?.longitude) ? driverLocation.longitude
             : isNum(booking?.pickup_lng)         ? booking.pickup_lng
             : KIGALI.longitude,
        }}
        follow={
          isNum(driverLocation?.latitude) && isNum(driverLocation?.longitude)
            ? { lat: driverLocation.latitude, lng: driverLocation.longitude }
            : undefined
        }
        markers={[
          isNum(driverLocation?.latitude) && isNum(driverLocation?.longitude) && {
            lat: driverLocation.latitude, lng: driverLocation.longitude,
            color: colors.pinVehicle, title: taxi.plate_number,
          },
          isNum(booking?.pickup_lat) && isNum(booking?.pickup_lng) && {
            lat: booking.pickup_lat, lng: booking.pickup_lng, color: colors.pinPickup, title: "Pickup",
          },
          isNum(booking?.destination_lat) && isNum(booking?.destination_lng) && {
            lat: booking.destination_lat, lng: booking.destination_lng, color: colors.pinDestination, title: "Destination",
          },
        ].filter(Boolean)}
      />

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
  container: { flex: 1, backgroundColor: colors.screen },

  statusBar: {
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusValue: { fontFamily: font.family, fontSize: 16 },
  bookingId: { fontFamily: font.familyRegular, color: colors.textMuted, fontSize: 12, marginTop: 2 },

  wsPill: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 12,
  },
  wsLive:       { backgroundColor: colors.tintSuccess },
  wsConnecting: { backgroundColor: colors.tintWarning },
  wsText: { fontFamily: font.familyMedium, fontSize: 11 },

  map: { flex: 1 },

  footer: {
    backgroundColor: colors.card,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: { fontFamily: font.familyMedium, fontSize: 16, color: colors.text },
  fare: { fontFamily: font.familyBold, color: colors.primary, marginTop: 4, fontSize: 16 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 32,
  },
  modalTitle: { fontFamily: font.family, fontSize: 20, color: colors.text, textAlign: "center" },
  modalSub: { fontFamily: font.familyRegular, color: colors.textMuted, textAlign: "center", marginTop: 2, marginBottom: 16 },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
  },
  star: { fontSize: 44, marginHorizontal: 4 },
  starOn: { color: colors.star },
  starOff: { color: colors.border },
  commentBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    padding: 12,
    minHeight: 70,
    textAlignVertical: "top",
    fontFamily: font.familyRegular,
    fontSize: 15,
    color: colors.text,
    marginBottom: 16,
  },
  modalActions: { gap: 10 },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitBtnText: { fontFamily: font.family, color: colors.white, fontSize: 16 },
  skipBtn: { paddingVertical: 10, alignItems: "center" },
  skipBtnText: { fontFamily: font.familyRegular, color: colors.textMuted, fontSize: 15 },
});
