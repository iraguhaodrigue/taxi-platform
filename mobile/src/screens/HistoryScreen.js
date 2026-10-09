import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, Button,
} from "react-native";
import { getMe, getMyBookings, getDriverBookings } from "../api/client";

const STATUS_LABEL = {
  requested: "Requested",
  accepted: "Accepted",
  ongoing: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};
const STATUS_COLOR = {
  requested: { color: "#b45309", backgroundColor: "#fef3c7" },
  accepted: { color: "#1d4ed8", backgroundColor: "#dbeafe" },
  ongoing: { color: "#166534", backgroundColor: "#dcfce7" },
  completed: { color: "#166534", backgroundColor: "#dcfce7" },
  cancelled: { color: "#991b1b", backgroundColor: "#fee2e2" },
};

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString([], {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso || "";
  }
}

export default function HistoryScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const me = await getMe();
      const list = me.role === "driver"
        ? await getDriverBookings()
        : await getMyBookings();
      // Newest first (backend already sorts, but be defensive).
      const sorted = [...list].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setBookings(sorted);
    } catch (e) {
      setError("Could not load trip history. Is the backend running?");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <View style={{ marginTop: 16 }}>
          <Button title="Try again" onPress={() => load()} />
        </View>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={bookings}
      keyExtractor={(item) => String(item.id)}
      refreshing={refreshing}
      onRefresh={() => load(true)}
      ListHeaderComponent={
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Trip History</Text>
          <Button title="Refresh" onPress={() => load(true)} />
        </View>
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No trips yet</Text>
          <Text style={styles.emptyBody}>
            Your past trips will appear here once you've taken one.
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const badge = STATUS_COLOR[item.status] || {};
        return (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.date}>{formatDate(item.created_at)}</Text>
              <Text style={[styles.badge, badge]}>
                {STATUS_LABEL[item.status] || item.status}
              </Text>
            </View>
            <Text style={styles.detail}>
              {item.estimated_distance_km ?? "—"} km · {item.estimated_time_min ?? "—"} min
            </Text>
            <Text style={styles.fare}>
              {item.final_fare ?? item.estimated_fare ?? "—"} RWF
            </Text>
            <Text style={styles.bookingId}>Booking #{item.id}</Text>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, flexGrow: 1 },
  headerRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 12,
  },
  heading: { fontSize: 22, fontWeight: "bold" },
  card: {
    borderWidth: 1, borderColor: "#eee", borderRadius: 10,
    padding: 16, marginBottom: 12,
  },
  cardTop: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 6,
  },
  date: { fontSize: 14, color: "#333", fontWeight: "500", flex: 1, marginRight: 8 },
  badge: {
    fontSize: 12, fontWeight: "600", paddingHorizontal: 8,
    paddingVertical: 2, borderRadius: 12, overflow: "hidden",
  },
  detail: { color: "#555", fontSize: 14, marginBottom: 2 },
  fare: { color: "#2a7", fontWeight: "bold", fontSize: 16 },
  bookingId: { color: "#aaa", fontSize: 12, marginTop: 4 },
  center: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 32, paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 17, fontWeight: "600", color: "#333",
    textAlign: "center", marginBottom: 8,
  },
  emptyBody: { fontSize: 14, color: "#777", textAlign: "center", lineHeight: 20 },
  errorText: {
    fontSize: 15, color: "#c00", textAlign: "center", paddingHorizontal: 24,
  },
});
