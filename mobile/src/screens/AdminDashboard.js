import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, TextInput, Alert, TouchableOpacity,
} from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import PillButton from "../components/PillButton";
import {
  getAdminSummary, getAdminUsers, getAdminVehicles, getAdminBookings, updatePricing, logout,
} from "../api/client";
import { colors, radius, spacing, font, cardShadow } from "../theme";

const Tab = createBottomTabNavigator();

const TYPE_LABEL = { taxi: "Taxi", safari: "Safari", private_car: "Private car" };

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString([], {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso || "";
  }
}

function statusBadgeStyle(status) {
  const map = {
    requested: { color: colors.warning, backgroundColor: colors.tintWarning },
    accepted: { color: colors.primary, backgroundColor: colors.tintPrimary },
    ongoing: { color: colors.success, backgroundColor: colors.tintSuccess },
    completed: { color: colors.textMuted, backgroundColor: colors.tintMuted },
    cancelled: { color: colors.danger, backgroundColor: colors.tintDanger },
  };
  return map[status] || { color: colors.textMuted, backgroundColor: colors.tintMuted };
}

// ── Dashboard (summary stat cards) ────────────────────────────────────────
function AdminSummaryScreen() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setSummary(await getAdminSummary());
    } catch {
      setError("Could not load reports. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <PillButton title="Try again" onPress={load} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  const stats = [
    { label: "Total users", value: summary.total_users },
    { label: "Vehicles", value: summary.total_vehicles },
    { label: "Listed vehicles", value: summary.listed_vehicles },
    { label: "Bookings", value: summary.total_bookings },
    { label: "Active subscriptions", value: summary.active_subscriptions },
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Overview</Text>
        <PillButton title="Refresh" onPress={load} style={styles.smallBtn} />
      </View>
      <View style={styles.statGrid}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Generic themed list screen ────────────────────────────────────────────
function AdminListScreen({ fetcher, keyName, renderItem, emptyText }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      setItems(await fetcher());
    } catch {
      setError("Could not load. Is the backend running?");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <PillButton title="Try again" onPress={() => load()} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.list}
      data={items}
      keyExtractor={(item) => String(item[keyName])}
      refreshing={refreshing}
      onRefresh={() => load(true)}
      ListEmptyComponent={
        <View style={styles.card}><Text style={styles.emptyText}>{emptyText}</Text></View>
      }
      renderItem={renderItem}
    />
  );
}

function AdminUsersScreen() {
  return (
    <AdminListScreen
      fetcher={getAdminUsers}
      keyName="id"
      emptyText="No users."
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle}>{item.full_name}</Text>
            <Text style={styles.rolePill}>{cap(item.role)}</Text>
          </View>
          <Text style={styles.muted}>{item.phone}{item.email ? ` · ${item.email}` : ""}</Text>
        </View>
      )}
    />
  );
}

function AdminVehiclesScreen() {
  return (
    <AdminListScreen
      fetcher={getAdminVehicles}
      keyName="id"
      emptyText="No vehicles."
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle}>{item.plate_number}</Text>
            <Text style={styles.typePill}>{TYPE_LABEL[item.vehicle_type] || item.vehicle_type || "Taxi"}</Text>
          </View>
          <Text style={styles.muted}>{item.driver_name} · {item.driver_phone}</Text>
          <Text style={[styles.muted, { marginTop: 2 }]}>
            {item.is_listed ? "Listed" : "Not listed"} · {item.is_available ? "Available" : "Offline"}
          </Text>
        </View>
      )}
    />
  );
}

function AdminBookingsScreen() {
  return (
    <AdminListScreen
      fetcher={getAdminBookings}
      keyName="id"
      emptyText="No bookings."
      renderItem={({ item }) => {
        const badge = statusBadgeStyle(item.status);
        return (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>Booking #{item.id}</Text>
              <Text style={[styles.statusBadge, badge]}>{cap(item.status)}</Text>
            </View>
            <Text style={styles.muted}>{formatDate(item.created_at)}</Text>
            <Text style={[styles.muted, { marginTop: 2 }]}>
              {item.estimated_distance_km ?? "—"} km · {item.estimated_time_min ?? "—"} min
            </Text>
            <Text style={styles.fare}>{item.final_fare ?? item.estimated_fare ?? "—"} RWF</Text>
          </View>
        );
      }}
    />
  );
}

function AdminPricingScreen() {
  const [baseFare, setBaseFare] = useState("");
  const [perKm, setPerKm] = useState("");
  const [perMin, setPerMin] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const b = Number(baseFare), k = Number(perKm), m = Number(perMin);
    if (![b, k, m].every((n) => Number.isFinite(n))) {
      Alert.alert("Invalid values", "Enter numbers for all three fields.");
      return;
    }
    setSaving(true);
    try {
      await updatePricing(b, k, m);
      Alert.alert("Saved", "Pricing updated.");
    } catch (e) {
      Alert.alert("Could not save", e?.response?.data?.detail || "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.heading}>Update pricing</Text>
        <Text style={styles.muted}>Set the fare formula used for all new bookings.</Text>

        <Text style={styles.label}>Base fare (RWF)</Text>
        <TextInput style={styles.input} placeholder="e.g. 1000" placeholderTextColor={colors.textMuted}
          value={baseFare} onChangeText={setBaseFare} keyboardType="numeric" />

        <Text style={styles.label}>Rate per km (RWF)</Text>
        <TextInput style={styles.input} placeholder="e.g. 500" placeholderTextColor={colors.textMuted}
          value={perKm} onChangeText={setPerKm} keyboardType="numeric" />

        <Text style={styles.label}>Rate per min (RWF)</Text>
        <TextInput style={styles.input} placeholder="e.g. 100" placeholderTextColor={colors.textMuted}
          value={perMin} onChangeText={setPerMin} keyboardType="numeric" />

        <PillButton title="Save pricing" onPress={save} loading={saving} style={{ marginTop: spacing.md }} />
      </View>
    </View>
  );
}

function LogoutButton({ navigation }) {
  return (
    <TouchableOpacity
      onPress={() => {
        logout();
        const root = navigation.getParent() || navigation;
        root.reset({ index: 0, routes: [{ name: "Login" }] });
      }}
      style={{ marginRight: 12, paddingVertical: 4, paddingHorizontal: 8 }}
    >
      <Text style={{ color: "#ffd0d0", fontFamily: font.familyMedium }}>Logout</Text>
    </TouchableOpacity>
  );
}

export default function AdminDashboard() {
  return (
    <Tab.Navigator
      screenOptions={({ navigation, route }) => ({
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.white,
        headerTitleStyle: { fontFamily: font.family },
        headerRight: () => <LogoutButton navigation={navigation} />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: font.familyMedium, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, height: 60, paddingBottom: 6, paddingTop: 6 },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Dashboard: "stats-chart", Users: "people", Vehicles: "car",
            Bookings: "list", Pricing: "pricetag",
          };
          return <Ionicons name={icons[route.name] || "ellipse"} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={AdminSummaryScreen} />
      <Tab.Screen name="Users" component={AdminUsersScreen} />
      <Tab.Screen name="Vehicles" component={AdminVehiclesScreen} />
      <Tab.Screen name="Bookings" component={AdminBookingsScreen} />
      <Tab.Screen name="Pricing" component={AdminPricingScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  list: { padding: spacing.lg, flexGrow: 1 },
  center: {
    flex: 1, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.screen, padding: spacing.xl,
  },
  headerRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: spacing.lg, paddingBottom: spacing.sm,
  },
  heading: { fontFamily: font.family, fontSize: 20, color: colors.text },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 18 },

  statGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: spacing.lg, gap: spacing.md },
  statCard: {
    backgroundColor: colors.card, borderRadius: radius.card, padding: spacing.lg,
    width: "47%", ...cardShadow,
  },
  statValue: { fontFamily: font.familyBold, fontSize: 30, color: colors.primary },
  statLabel: { fontFamily: font.familyRegular, fontSize: 13, color: colors.textMuted, marginTop: 2 },

  card: {
    backgroundColor: colors.card, borderRadius: radius.card, padding: spacing.lg,
    marginBottom: spacing.md, ...cardShadow,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontFamily: font.familyBold, fontSize: 16, color: colors.text, flexShrink: 1 },
  muted: { fontFamily: font.familyRegular, fontSize: 13, color: colors.textMuted, marginTop: 4 },
  fare: { fontFamily: font.familyBold, fontSize: 16, color: colors.primary, marginTop: 4 },
  rolePill: {
    fontFamily: font.familyMedium, fontSize: 12, color: colors.primary,
    backgroundColor: colors.tintPrimary, paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: radius.pill, overflow: "hidden",
  },
  typePill: {
    fontFamily: font.familyMedium, fontSize: 12, color: colors.primary,
    backgroundColor: colors.tintPrimary, paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: radius.pill, overflow: "hidden",
  },
  statusBadge: {
    fontFamily: font.familyMedium, fontSize: 12, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 12, overflow: "hidden",
  },
  label: {
    fontFamily: font.familyMedium, fontSize: 13, color: colors.textMuted,
    marginTop: spacing.md, marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.input,
    padding: 12, fontFamily: font.familyRegular, fontSize: 15, color: colors.text,
    backgroundColor: colors.white,
  },
  emptyText: { fontFamily: font.familyRegular, fontSize: 14, color: colors.textMuted, textAlign: "center" },
  errorText: { fontFamily: font.familyRegular, fontSize: 15, color: colors.danger, textAlign: "center" },
});
