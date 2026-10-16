import React, { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import PillButton from "../components/PillButton";
import { getDriverBookings } from "../api/client";
import { colors, radius, spacing, font, cardShadow } from "../theme";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso || "";
  }
}

export default function DriverEarningsScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBookings(await getDriverBookings());
    } catch {
      setError("Could not load earnings. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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

  const completed = bookings.filter((b) => b.status === "completed");
  const ongoing = bookings.filter((b) => b.status === "ongoing");
  const totalEarned = completed.reduce((sum, b) => sum + (b.final_fare ?? b.estimated_fare ?? 0), 0);

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.list}
      data={completed}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <View>
          <View style={styles.statGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalEarned} RWF</Text>
              <Text style={styles.statLabel}>Total earned</Text>
            </View>
            <View style={styles.statCardSmall}>
              <Text style={styles.statValue}>{completed.length}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statCardSmall}>
              <Text style={styles.statValue}>{ongoing.length}</Text>
              <Text style={styles.statLabel}>Ongoing</Text>
            </View>
          </View>
          <Text style={styles.heading}>Completed trips</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.card}><Text style={styles.muted}>No completed trips yet.</Text></View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Booking #{item.id}</Text>
            <Text style={styles.fare}>{item.final_fare ?? item.estimated_fare ?? "—"} RWF</Text>
          </View>
          <Text style={styles.muted}>{formatDate(item.created_at)} · {item.estimated_distance_km ?? "—"} km</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  list: { padding: spacing.lg, flexGrow: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.screen, padding: spacing.xl },
  statGrid: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { backgroundColor: colors.card, borderRadius: radius.card, padding: spacing.lg, flex: 2, ...cardShadow },
  statCardSmall: { backgroundColor: colors.card, borderRadius: radius.card, padding: spacing.lg, flex: 1, alignItems: "center", ...cardShadow },
  statValue: { fontFamily: font.familyBold, fontSize: 22, color: colors.primary },
  statLabel: { fontFamily: font.familyRegular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  heading: { fontFamily: font.family, fontSize: 18, color: colors.text, marginBottom: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: spacing.lg, marginBottom: spacing.md, ...cardShadow },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontFamily: font.familyBold, fontSize: 15, color: colors.text },
  fare: { fontFamily: font.familyBold, fontSize: 15, color: colors.primary },
  muted: { fontFamily: font.familyRegular, fontSize: 13, color: colors.textMuted, marginTop: 4 },
  errorText: { fontFamily: font.familyRegular, fontSize: 15, color: colors.danger, textAlign: "center" },
});
