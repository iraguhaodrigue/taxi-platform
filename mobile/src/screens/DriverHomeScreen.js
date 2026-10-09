import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, Button, StyleSheet, Alert,
  ScrollView, Switch, ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import {
  createVehicle, getMyVehicles, createSubscription, setVehicleAvailability,
  getDriverBookings, updateBookingStatus, updateVehicleLocation,
} from "../api/client";
import { startBackgroundLocation, stopBackgroundLocation } from "../api/tracking";

const PLANS = [
  { key: "weekly", label: "Weekly — 5,000 RWF / 7 days" },
  { key: "monthly", label: "Monthly — 15,000 RWF / 30 days" },
  { key: "annual", label: "Annual — 120,000 RWF / 1 year" },
];

export default function DriverHomeScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(true);

  // Register vehicle form
  const [plate, setPlate] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
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

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Driver Dashboard</Text>

      {/* ── Active trip banner ── */}
      {tracking && (
        <View style={styles.trackingBanner}>
          <Text style={styles.trackingText}>
            ● Sharing location — Booking #{activeBookingId}
          </Text>
          <Button title="Stop GPS" onPress={handleStopTracking} color="#c00" />
        </View>
      )}

      {/* ── Incoming bookings ── */}
      <View style={styles.sectionRow}>
        <Text style={styles.section}>Incoming Bookings</Text>
        <Button title="Refresh" onPress={loadBookings} />
      </View>
      {bookingsLoading && <ActivityIndicator style={{ marginBottom: 8 }} />}
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
                updatingId === b.id ? <ActivityIndicator /> : (
                  <Button
                    title="Accept & Start GPS"
                    onPress={() => handleAcceptAndTrack(b.id)}
                    color="#2a7"
                  />
                )
              )}
              {b.status === "accepted" && (
                updatingId === b.id ? <ActivityIndicator /> : (
                  <Button
                    title="Mark In Progress"
                    onPress={() => handleStatusUpdate(b.id, "ongoing")}
                    color="#29a"
                  />
                )
              )}
              {b.status === "ongoing" && (
                updatingId === b.id ? <ActivityIndicator /> : (
                  <Button
                    title="Complete Trip"
                    onPress={() => handleStatusUpdate(b.id, "completed")}
                    color="#555"
                  />
                )
              )}
            </View>
          </View>
        ))}

      {/* ── Register vehicle ── */}
      <Text style={styles.section}>Register a Vehicle</Text>
      <TextInput
        style={styles.input}
        placeholder="Plate number (e.g. RAC 123A)"
        value={plate}
        onChangeText={setPlate}
        autoCapitalize="characters"
      />
      <TextInput
        style={styles.input}
        placeholder="Driver name"
        value={driverName}
        onChangeText={setDriverName}
      />
      <TextInput
        style={styles.input}
        placeholder="Driver phone"
        value={driverPhone}
        onChangeText={setDriverPhone}
        keyboardType="phone-pad"
      />
      {registering ? (
        <ActivityIndicator />
      ) : (
        <Button title="Register Vehicle" onPress={handleRegister} />
      )}

      {/* ── My vehicles ── */}
      {vehicles.length > 0 && (
        <>
          <Text style={styles.section}>My Vehicles</Text>
          {vehicles.map((v) => (
            <View key={v.id} style={styles.card}>
              <Text style={styles.plate}>{v.plate_number}</Text>
              <Text style={{ color: v.is_listed ? "#2a7" : "#888" }}>
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
            <Button
              key={p.key}
              title={`${selectedPlan === p.key ? "✓ " : ""}${p.label}`}
              onPress={() => setSelectedPlan(p.key)}
              color={selectedPlan === p.key ? "#2a7" : "#aaa"}
            />
          ))}
          <View style={{ marginTop: 8 }}>
            {subscribing ? (
              <ActivityIndicator />
            ) : (
              <Button
                title={`Subscribe (${selectedPlan})`}
                onPress={handleSubscribe}
                color="#2a7"
              />
            )}
          </View>

          {/* ── Availability toggle ── */}
          <Text style={styles.section}>Availability</Text>
          <View style={styles.row}>
            <Text style={styles.availLabel}>
              {available ? "Available for bookings" : "Offline"}
            </Text>
            {togglingAvail ? (
              <ActivityIndicator />
            ) : (
              <Switch value={available} onValueChange={handleToggleAvailability} />
            )}
          </View>

          {/* ── My location ── */}
          <Text style={styles.section}>My Location</Text>
          <Text style={styles.hint}>
            Update your GPS so passengers can find you.
            {available ? " Auto-refreshing every 30 s while available." : ""}
          </Text>
          {locUpdating ? (
            <ActivityIndicator />
          ) : (
            <Button title="Update my location" onPress={() => handleUpdateLocation(false)} />
          )}
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
  const colors = {
    requested: { color: "#b45309", backgroundColor: "#fef3c7" },
    accepted: { color: "#1d4ed8", backgroundColor: "#dbeafe" },
    ongoing: { color: "#166534", backgroundColor: "#dcfce7" },
    completed: { color: "#555", backgroundColor: "#f3f4f6" },
    cancelled: { color: "#991b1b", backgroundColor: "#fee2e2" },
  };
  return colors[status] || {};
}

const styles = StyleSheet.create({
  container: { padding: 24, flexGrow: 1 },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 20 },
  section: { fontSize: 17, fontWeight: "700", marginTop: 24, marginBottom: 8 },
  hint: { color: "#777", marginBottom: 8, fontSize: 13 },
  input: {
    borderWidth: 1, borderColor: "#ccc", borderRadius: 8,
    padding: 12, marginBottom: 12,
  },
  card: {
    borderWidth: 1, borderColor: "#eee", borderRadius: 10,
    padding: 14, marginBottom: 8,
  },
  plate: { fontSize: 17, fontWeight: "bold" },
  row: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingVertical: 8,
  },
  availLabel: { fontSize: 16 },
  locTime: { color: "#2a7", fontSize: 13, marginTop: 8 },
  sectionRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginTop: 24, marginBottom: 8,
  },
  bookingCard: {
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10,
    padding: 14, marginBottom: 10, backgroundColor: "#fafafa",
  },
  bookingHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 4,
  },
  bookingId: { fontWeight: "700", fontSize: 15 },
  statusBadge: {
    fontSize: 12, fontWeight: "600", paddingHorizontal: 8,
    paddingVertical: 2, borderRadius: 12, overflow: "hidden",
    textTransform: "capitalize",
  },
  bookingDetail: { color: "#555", fontSize: 13, marginBottom: 10 },
  bookingActions: { flexDirection: "row", gap: 8 },
  trackingBanner: {
    backgroundColor: "#dcfce7",
    borderWidth: 1,
    borderColor: "#86efac",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  trackingText: { color: "#166534", fontWeight: "600", fontSize: 14, flex: 1, marginRight: 8 },
});
