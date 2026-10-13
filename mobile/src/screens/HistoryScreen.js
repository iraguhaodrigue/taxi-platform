import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
} from "react-native";
import PillButton from "../components/PillButton";
import { getMe, getMyBookings, getDriverBookings } from "../api/client";
import { colors, radius, spacing, font, cardShadow } from "../theme";

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

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.errorText}>{error}</Text>
        <PillButton title="Try again" onPress={() => load()} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.list}
      data={bookings}
      keyExtractor={(item) => String(item.id)}
      refreshing={refreshing}
      onRefresh={() => load(true)}
      ListHeaderComponent={
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Trip History</Text>
          <PillButton
            title="Refresh"
            onPress={() => load(true)}
            style={{ paddingVertical: 8, paddingHorizontal: 18 }}
          />
        </View>
      }
      ListEmptyComponent={
        <View style={styles.card}>
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
  screen: { flex: 1, backgroundColor: colors.screen },
  list: { padding: spacing.lg, flexGrow: 1 },
  centerScreen: {
    flex: 1, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.screen, paddingHorizontal: spacing.xl,
  },
  headerRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: spacing.md,
  },
  heading: { fontFamily: font.family, fontSize: 22, color: colors.text },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...cardShadow,
  },
  cardTop: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 6,
  },
  date: { fontFamily: font.familyMedium, fontSize: 14, color: colors.text, flex: 1, marginRight: 8 },
  badge: {
    fontFamily: font.familyMedium, fontSize: 12, paddingHorizontal: 8,
    paddingVertical: 2, borderRadius: 12, overflow: "hidden",
  },
  detail: { fontFamily: font.familyRegular, color: colors.textMuted, fontSize: 14, marginBottom: 2 },
  fare: { fontFamily: font.familyBold, color: colors.primary, fontSize: 16 },
  bookingId: { fontFamily: font.familyRegular, color: colors.textMuted, fontSize: 12, marginTop: 4 },
  emptyTitle: {
    fontFamily: font.family, fontSize: 17, color: colors.text,
    textAlign: "center", marginBottom: spacing.sm,
  },
  emptyBody: { fontFamily: font.familyRegular, fontSize: 14, color: colors.textMuted, textAlign: "center", lineHeight: 20 },
  errorText: {
    fontFamily: font.familyRegular, fontSize: 15, color: colors.danger, textAlign: "center", paddingHorizontal: 24,
  },
});
