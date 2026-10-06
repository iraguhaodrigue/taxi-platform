import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, Button, StyleSheet, Alert,
  ScrollView, Switch, ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import {
  createVehicle, getMyVehicles, createSubscription, setVehicleAvailability,
} from "../api/client";
import { startSendingLocation } from "../api/tracking";

const BACKGROUND_TASK = "DRIVER_LOCATION_TASK";

TaskManager.defineTask(BACKGROUND_TASK, async ({ data, error }) => {
  if (error) return;
  if (data) {
    const { locations } = data;
    // Background task just collects locations; the WebSocket timer in
    // startSendingLocation handles the actual sending from the foreground.
  }
});

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

  // Active trip
  const stopTrackingRef = useRef(null);
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    loadVehicles();
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

  async function handleStartTrip(bookingId) {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Location needed", "Allow location to track the trip.");
      return;
    }
    await Location.requestBackgroundPermissionsAsync();

    const stop = startSendingLocation(bookingId);
    stopTrackingRef.current = stop;
    setTracking(true);
    Alert.alert("Tracking started", "Your location is being sent to the passenger.");
  }

  function handleStopTrip() {
    if (stopTrackingRef.current) {
      stopTrackingRef.current();
      stopTrackingRef.current = null;
    }
    setTracking(false);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Driver Dashboard</Text>

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

          {/* ── Trip tracking ── */}
          <Text style={styles.section}>Trip Tracking</Text>
          <Text style={styles.hint}>
            When a passenger books you, enter the booking ID to start sending your
            location to them over the live WebSocket.
          </Text>
          {tracking ? (
            <>
              <Text style={{ color: "#2a7", marginBottom: 8 }}>
                ● Tracking active — passenger can see your location
              </Text>
              <Button title="Stop Trip" onPress={handleStopTrip} color="#c00" />
            </>
          ) : (
            <StartTripInput onStart={handleStartTrip} />
          )}
        </>
      )}
    </ScrollView>
  );
}

function StartTripInput({ onStart }) {
  const [bookingId, setBookingId] = useState("");
  return (
    <View>
      <TextInput
        style={styles.input}
        placeholder="Booking ID"
        value={bookingId}
        onChangeText={setBookingId}
        keyboardType="numeric"
      />
      <Button
        title="Start Trip Tracking"
        onPress={() => {
          if (!bookingId) return;
          onStart(parseInt(bookingId, 10));
        }}
        color="#2a7"
      />
    </View>
  );
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
});
