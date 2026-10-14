import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, StyleSheet, Alert,
  ScrollView, Switch, ActivityIndicator, TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import PillButton from "../components/PillButton";
import {
  createVehicle, getMyVehicles, createSubscription, setVehicleAvailability,
  getDriverBookings, updateBookingStatus, updateVehicleLocation, getToken,
} from "../api/client";
import { startBackgroundLocation, stopBackgroundLocation } from "../api/tracking";
import { colors, radius, spacing, font, cardShadow } from "../theme";

const PLANS = [
  { key: "weekly", label: "Weekly — 5,000 RWF / 7 days" },
  { key: "monthly", label: "Monthly — 15,000 RWF / 30 days" },
  { key: "annual", label: "Annual — 120,000 RWF / 1 year" },
];

const VEHICLE_TYPES = [
  { key: "taxi", label: "Taxi" },
  { key: "safari", label: "Safari" },
  { key: "private_car", label: "Private car" },
];

export default function DriverHomeScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(true);

  // Register vehicle form
  const [plate, setPlate] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [newVehicleType, setNewVehicleType] = useState("taxi");
  const [registering, setRegistering] = useState(false);

  // Subscription
  const [subscribing, setSubscribing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("monthly");

  // Availability
  const [available, setAvailable] = useState(false);
  const [togglingAvail, setTogglingAvail] = useState(false);

  // Location updates
  const [locUpdating, setLocUpdating] = useState(false);
  const [lastLocUpdate, setLastLocUpdate] = useState(null);

  // Active trip
  const stopTrackingRef = useRef(null);
  const [tracking, setTracking] = useState(false);
  const [activeBookingId, setActiveBookingId] = useState(null);

  // Incoming bookings
  const [driverBookings, setDriverBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    loadVehicles();
    loadBookings();
  }, []);

  async function loadVehicles() {
    setLoading(true);
    try {
      const list = await getMyVehicles();
      setVehicles(list);
      if (list.length > 0) {
        setSelectedVehicle(list[0]);
        setAvailable(list[0].is_available);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function loadBookings() {
    setBookingsLoading(true);
    try {
      const list = await getDriverBookings();
      setDriverBookings(list);
    } catch {
      // silently ignore — vehicles section will show the main loading error
    } finally {
      setBookingsLoading(false);
    }
  }

  async function handleStatusUpdate(bookingId, newStatus) {
    setUpdatingId(bookingId);
    try {
      const updated = await updateBookingStatus(bookingId, newStatus);
      setDriverBookings((prev) =>
        prev.map((b) => (b.id === updated.id ? updated : b))
      );
      // Stop GPS stream when the trip is completed
      if (newStatus === "completed" && activeBookingId === bookingId) {
        handleStopTracking();
      }
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.detail || "Could not update status.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleStopTracking() {
    await stopBackgroundLocation();
    if (stopTrackingRef.current) {
      stopTrackingRef.current();
      stopTrackingRef.current = null;
    }
    setTracking(false);
    setActiveBookingId(null);
  }

  async function handleAcceptAndTrack(bookingId) {
    await handleStatusUpdate(bookingId, "accepted");
    try {
      const { backgroundGranted, stopFallback } = await startBackgroundLocation(bookingId);
      // stopFallback is only set when background permission was denied (foreground-only mode).
      stopTrackingRef.current = stopFallback || null;
      setActiveBookingId(bookingId);
      setTracking(true);
      if (!backgroundGranted) {
        Alert.alert(
          "Foreground tracking only",
          "Background location was denied. GPS will pause if you close the app."
        );
      }
    } catch (e) {
      Alert.alert("Location error", e.message);
    }
  }

  async function handleUpdateLocation(silent = false) {
    // Never fire with a stale/empty token (e.g. just after logout).
    if (!getToken()) return;
    if (!selectedVehicle) {
      if (!silent) Alert.alert("No vehicle", "Register a vehicle first.");
      return;
    }
    if (!silent) setLocUpdating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (!silent) Alert.alert("Location needed", "Allow location to update your position.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const updated = await updateVehicleLocation(
        selectedVehicle.id,
        pos.coords.latitude,
        pos.coords.longitude
      );
      setSelectedVehicle(updated);
      setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      setLastLocUpdate(new Date());
    } catch (e) {
      if (!silent) Alert.alert("Error", "Could not update location.");
    } finally {
      if (!silent) setLocUpdating(false);
    }
  }

  // Auto-refresh location every 30 s — only while this screen is focused AND
  // the driver is available. Stops on blur (screen left) or when unavailable,
  // and the cleanup clears the timer so it never leaks.
  useFocusEffect(
    useCallback(() => {
      if (!available || !selectedVehicle) return;
      const interval = setInterval(() => handleUpdateLocation(true), 30000);
      return () => clearInterval(interval);
    }, [available, selectedVehicle])
  );

  async function handleRegister() {
    if (!plate || !driverName || !driverPhone) {
      Alert.alert("Missing fields", "Fill in all vehicle details.");
      return;
    }
    setRegistering(true);
    try {
      const pos = await Location.getCurrentPositionAsync({}).catch(() => null);
      const v = await createVehicle({
        plate_number: plate,
        driver_name: driverName,
        driver_phone: driverPhone,
        vehicle_type: newVehicleType,
        lat: pos?.coords.latitude,
        lng: pos?.coords.longitude,
      });
      setVehicles((prev) => [...prev, v]);
      setSelectedVehicle(v);
      setPlate("");
      setDriverName("");
      setDriverPhone("");
      Alert.alert("Done!", "Vehicle registered. Now buy a subscription to get listed.");
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.detail || "Registration failed.");
    } finally {
      setRegistering(false);
    }
  }

  async function handleSubscribe() {
    if (!selectedVehicle) return;
    setSubscribing(true);
    try {
      await createSubscription(selectedVehicle.id, selectedPlan);
      await loadVehicles();
      Alert.alert("Subscribed!", "Your taxi is now listed on the platform.");
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.detail || "Subscription failed.");
    } finally {
      setSubscribing(false);
    }
  }

  async function handleToggleAvailability(value) {
    if (!selectedVehicle) return;
    setTogglingAvail(true);
    try {
      const updated = await setVehicleAvailability(selectedVehicle.id, value);
      setAvailable(updated.is_available);
      setSelectedVehicle(updated);
    } catch (e) {
      Alert.alert("Error", "Could not update availability.");
    } finally {
      setTogglingAvail(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {/* ── Active trip banner ── */}
      {tracking && (
        <View style={styles.trackingBanner}>
          <Text style={styles.trackingText}>
            ● Sharing location — Booking #{activeBookingId}
          </Text>
          <PillButton
            title="Stop GPS"
            onPress={handleStopTracking}
            color={colors.danger}
            style={styles.smallBtn}
          />
        </View>
      )}

      {/* ── Incoming bookings ── */}
      <View style={styles.sectionRow}>
        <Text style={styles.section}>Incoming Bookings</Text>
        <PillButton title="Refresh" onPress={loadBookings} style={styles.smallBtn} />
      </View>
      {bookingsLoading && <ActivityIndicator style={{ marginBottom: 8 }} color={colors.primary} />}
      {!bookingsLoading && driverBookings.filter(
        (b) => ["requested", "accepted", "ongoing"].includes(b.status)
      ).length === 0 && (
        <Text style={styles.hint}>No active bookings right now.</Text>
      )}
      {driverBookings
        .filter((b) => ["requested", "accepted", "ongoing"].includes(b.status))
        .map((b) => (
          <View key={b.id} style={styles.bookingCard}>
            <View style={styles.bookingHeader}>
              <Text style={styles.bookingId}>Booking #{b.id}</Text>
              <Text style={[styles.statusBadge, statusStyle(b.status)]}>
                {b.status.replace("_", " ")}
              </Text>
            </View>
            <Text style={styles.bookingDetail}>
              Fare: {b.estimated_fare} RWF · {b.estimated_distance_km} km · {b.estimated_time_min} min
            </Text>
            <View style={styles.bookingActions}>
              {b.status === "requested" && (
                <PillButton
                  title="Accept & Start GPS"
                  onPress={() => handleAcceptAndTrack(b.id)}
                  loading={updatingId === b.id}
                  color={colors.success}
                  style={styles.smallBtn}
                />
              )}
              {b.status === "accepted" && (
                <PillButton
                  title="Mark In Progress"
                  onPress={() => handleStatusUpdate(b.id, "ongoing")}
                  loading={updatingId === b.id}
                  style={styles.smallBtn}
                />
              )}
              {b.status === "ongoing" && (
                <PillButton
                  title="Complete Trip"
                  onPress={() => handleStatusUpdate(b.id, "completed")}
                  loading={updatingId === b.id}
                  color={colors.textMuted}
                  style={styles.smallBtn}
                />
              )}
            </View>
          </View>
        ))}

      {/* ── Register vehicle ── */}
      <Text style={styles.section}>Register a Vehicle</Text>
      <TextInput
        style={styles.input}
        placeholder="Plate number (e.g. RAC 123A)"
        placeholderTextColor={colors.textMuted}
        value={plate}
        onChangeText={setPlate}
        autoCapitalize="characters"
      />
      <TextInput
        style={styles.input}
        placeholder="Driver name"
        placeholderTextColor={colors.textMuted}
        value={driverName}
        onChangeText={setDriverName}
      />
      <TextInput
        style={styles.input}
        placeholder="Driver phone"
        placeholderTextColor={colors.textMuted}
        value={driverPhone}
        onChangeText={setDriverPhone}
        keyboardType="phone-pad"
      />
      <Text style={styles.hint}>Vehicle type</Text>
      <View style={styles.typeRow}>
        {VEHICLE_TYPES.map((t) => {
          const active = newVehicleType === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setNewVehicleType(t.key)}
              style={[styles.typePill, active ? styles.typePillActive : styles.typePillIdle]}
            >
              <Text style={[styles.typeText, active ? styles.typeTextActive : styles.typeTextIdle]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <PillButton title="Register Vehicle" onPress={handleRegister} loading={registering} />

      {/* ── My vehicles ── */}
      {vehicles.length > 0 && (
        <>
          <Text style={styles.section}>My Vehicles</Text>
          {vehicles.map((v) => (
            <View key={v.id} style={styles.card}>
              <View style={styles.vehHeader}>
                <Text style={styles.plate}>{v.plate_number}</Text>
                <Text style={styles.vehTypePill}>{typeLabel(v.vehicle_type)}</Text>
              </View>
              <Text style={{ fontFamily: font.familyMedium, marginTop: 4, color: v.is_listed ? colors.success : colors.textMuted }}>
                {v.is_listed ? "Listed ✓" : "Not listed — buy a subscription"}
              </Text>
            </View>
          ))}

          {/* ── Subscription ── */}
          <Text style={styles.section}>Buy Subscription</Text>
          <Text style={styles.hint}>
            Subscribing lists {selectedVehicle?.plate_number} on the platform immediately.
          </Text>
          {PLANS.map((p) => (
            <PillButton
              key={p.key}
              title={`${selectedPlan === p.key ? "✓ " : ""}${p.label}`}
              onPress={() => setSelectedPlan(p.key)}
              color={selectedPlan === p.key ? colors.primary : colors.border}
              textColor={selectedPlan === p.key ? colors.white : colors.text}
              style={{ marginBottom: spacing.sm }}
            />
          ))}
          <View style={{ marginTop: spacing.sm }}>
            <PillButton
              title={`Subscribe (${selectedPlan})`}
              onPress={handleSubscribe}
              loading={subscribing}
              color={colors.success}
            />
          </View>

          {/* ── Availability toggle ── */}
          <Text style={styles.section}>Availability</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.availLabel}>
                {available ? "Available for bookings" : "Offline"}
              </Text>
              {togglingAvail ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Switch
                  value={available}
                  onValueChange={handleToggleAvailability}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor={colors.white}
                />
              )}
            </View>
          </View>

          {/* ── My location ── */}
          <Text style={styles.section}>My Location</Text>
          <Text style={styles.hint}>
            Update your GPS so passengers can find you.
            {available ? " Auto-refreshing every 30 s while available." : ""}
          </Text>
          <PillButton
            title="Update my location"
            onPress={() => handleUpdateLocation(false)}
            loading={locUpdating}
          />
          {lastLocUpdate && (
            <Text style={styles.locTime}>
              Location updated {lastLocUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

function statusStyle(status) {
  const palette = {
    requested: { color: colors.warning, backgroundColor: colors.tintWarning },
    accepted: { color: colors.primary, backgroundColor: colors.tintPrimary },
    ongoing: { color: colors.success, backgroundColor: colors.tintSuccess },
    completed: { color: colors.textMuted, backgroundColor: colors.tintMuted },
    cancelled: { color: colors.danger, backgroundColor: colors.tintDanger },
  };
  return palette[status] || { color: colors.textMuted, backgroundColor: colors.tintMuted };
}

function typeLabel(key) {
  const t = VEHICLE_TYPES.find((v) => v.key === key);
  return t ? t.label : "Taxi";
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  loader: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.screen },
  container: { padding: spacing.lg, flexGrow: 1 },
  section: { fontFamily: font.family, fontSize: 17, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  hint: { fontFamily: font.familyRegular, color: colors.textMuted, marginBottom: spacing.sm, fontSize: 13 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.input,
    padding: 12, marginBottom: spacing.md, backgroundColor: colors.card,
    fontFamily: font.familyRegular, fontSize: 15, color: colors.text,
  },
  card: {
    backgroundColor: colors.card, borderRadius: radius.card,
    padding: spacing.lg, marginBottom: spacing.sm, ...cardShadow,
  },
  plate: { fontFamily: font.familyBold, fontSize: 17, color: colors.text },
  vehHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  vehTypePill: {
    fontFamily: font.familyMedium, fontSize: 12, color: colors.primary,
    backgroundColor: colors.tintPrimary, paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: radius.pill, overflow: "hidden",
  },
  row: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
  },
  availLabel: { fontFamily: font.familyMedium, fontSize: 16, color: colors.text },
  locTime: { fontFamily: font.familyMedium, color: colors.primary, fontSize: 13, marginTop: spacing.sm },
  sectionRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginTop: spacing.xl, marginBottom: spacing.sm,
  },
  smallBtn: { paddingVertical: 10, paddingHorizontal: 18 },
  typeRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  typePill: {
    flex: 1, borderRadius: radius.button, paddingVertical: 10,
    alignItems: "center", borderWidth: 1,
  },
  typePillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typePillIdle: { backgroundColor: colors.white, borderColor: colors.border },
  typeText: { fontFamily: font.familyMedium, fontSize: 13 },
  typeTextActive: { color: colors.white },
  typeTextIdle: { color: colors.text },
  bookingCard: {
    backgroundColor: colors.card, borderRadius: radius.card,
    padding: spacing.lg, marginBottom: spacing.md, ...cardShadow,
  },
  bookingHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 4,
  },
  bookingId: { fontFamily: font.familyBold, fontSize: 15, color: colors.text },
  statusBadge: {
    fontFamily: font.familyMedium, fontSize: 12, paddingHorizontal: 8,
    paddingVertical: 2, borderRadius: 12, overflow: "hidden",
    textTransform: "capitalize",
  },
  bookingDetail: { fontFamily: font.familyRegular, color: colors.textMuted, fontSize: 13, marginBottom: spacing.md },
  bookingActions: { flexDirection: "row", gap: 8 },
  trackingBanner: {
    backgroundColor: colors.tintSuccess,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radius.card,
    padding: 12,
    marginBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  trackingText: { fontFamily: font.familyMedium, color: colors.success, fontSize: 14, flex: 1, marginRight: 8 },
});
