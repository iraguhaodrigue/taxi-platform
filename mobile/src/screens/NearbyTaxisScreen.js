import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import PillButton from "../components/PillButton";
import { getNearbyTaxis, getMyBookings } from "../api/client";
import { colors, radius, spacing, font, cardShadow } from "../theme";

const VEHICLE_TYPES = [
  { key: "taxi", label: "Taxi" },
  { key: "safari", label: "Safari" },
  { key: "private_car", label: "Private car" },
];
const TYPE_LABEL = { taxi: "Taxi", safari: "Safari", private_car: "Private car" };

export default function NearbyTaxisScreen({ navigation }) {
  const [taxis, setTaxis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [searching, setSearching] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [activeBooking, setActiveBooking] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermissionDenied(true);
        setLoading(false);
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({});
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        const data = await getNearbyTaxis(loc.lat, loc.lng, 5, null);
        setTaxis(data);
      } catch (e) {
        setError("Could not load taxis. Is the backend running?");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Check for an active trip whenever the screen is focused (also covers "after login").
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getMyBookings()
        .then((list) => {
          if (!alive) return;
          const active = (list || []).find((b) => ["accepted", "ongoing"].includes(b.status));
          setActiveBooking(active || null);
        })
        .catch(() => {});
      return () => { alive = false; };
    }, [])
  );

  async function selectType(key) {
    const next = selectedType === key ? null : key; // tap again to clear
    setSelectedType(next);
    if (!userLocation) return;
    setSearching(true);
    setError(null);
    try {
      const data = await getNearbyTaxis(userLocation.lat, userLocation.lng, radiusKm, next);
      setTaxis(data);
    } catch {
      setError("Could not load taxis. Is the backend running?");
    } finally {
      setSearching(false);
    }
  }

  async function searchWider() {
    if (!userLocation) return;
    setSearching(true);
    setRadiusKm(20);
    try {
      const data = await getNearbyTaxis(userLocation.lat, userLocation.lng, 20, selectedType);
      setTaxis(data);
    } catch {
      setError("Could not load taxis. Is the backend running?");
    } finally {
      setSearching(false);
    }
  }

  function openActiveTrip() {
    if (!activeBooking) return;
    navigation.navigate("Trip", {
      booking: activeBooking,
      taxi: { id: activeBooking.vehicle_id, plate_number: "Your taxi", driver_name: "Driver" },
    });
  }

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (permissionDenied) {
    return (
      <View style={styles.centerScreen}>
        <View style={styles.card}>
          <Text style={styles.emptyTitle}>Location permission required</Text>
          <Text style={styles.emptyBody}>
            This app needs your location to find taxis near you.{"\n"}
            Go to Settings → Apps → Taxi Booking → Permissions and allow Location.
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const isEmpty = taxis.length === 0 && !searching;

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.list}
      data={taxis}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <View>
          {activeBooking && (
            <TouchableOpacity style={styles.activeBanner} onPress={openActiveTrip} activeOpacity={0.85}>
              <Text style={styles.activeText}>You have an active trip</Text>
              <Text style={styles.activeAction}>View map →</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.heading}>Best deals near you</Text>

          {/* Transport type picker */}
          <View style={styles.typeRow}>
            {VEHICLE_TYPES.map((t) => {
              const active = selectedType === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => selectType(t.key)}
                  style={[styles.typePill, active ? styles.typePillActive : styles.typePillIdle]}
                >
                  <Text style={[styles.typeText, active ? styles.typeTextActive : styles.typeTextIdle]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {searching && <ActivityIndicator style={{ marginBottom: 12 }} color={colors.primary} />}
        </View>
      }
      ListEmptyComponent={
        isEmpty ? (
          <View style={styles.card}>
            <Text style={styles.emptyTitle}>
              No {selectedType ? TYPE_LABEL[selectedType].toLowerCase() : "taxis"} within {radiusKm} km of you
            </Text>
            <Text style={styles.emptyBody}>
              There are none available nearby right now.
            </Text>
            {radiusKm < 20 && (
              <PillButton title="Search wider (20 km)" onPress={searchWider} style={{ marginTop: spacing.lg }} />
            )}
            {radiusKm >= 20 && (
              <Text style={styles.emptyBody}>
                Nothing found within 20 km either. Try again later.
              </Text>
            )}
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.plate}>{item.plate_number}</Text>
            <View style={styles.rating}>
              <Text style={styles.star}>★</Text>
              <Text style={styles.ratingText}>New</Text>
            </View>
          </View>
          <Text style={styles.typeTag}>{TYPE_LABEL[item.vehicle_type] || item.vehicle_type || "Taxi"}</Text>
          <Text style={styles.driver}>{item.driver_name} · {item.driver_phone}</Text>
          <View style={styles.cardBottom}>
            <Text style={styles.distance}>{item.distance_km} km away</Text>
            <PillButton
              title="Book"
              onPress={() => navigation.navigate("Booking", { taxi: item, userLocation })}
              style={styles.bookBtn}
            />
          </View>
        </View>
      )}
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
  heading: { fontFamily: font.family, fontSize: 20, color: colors.text, marginBottom: spacing.md },

  activeBanner: {
    backgroundColor: colors.header,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...cardShadow,
  },
  activeText: { fontFamily: font.familyMedium, color: colors.white, fontSize: 15 },
  activeAction: { fontFamily: font.family, color: colors.headerLink, fontSize: 15 },

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

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...cardShadow,
  },
  cardTop: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  plate: { fontFamily: font.familyBold, fontSize: 18, color: colors.text },
  rating: { flexDirection: "row", alignItems: "center" },
  star: { color: colors.star, fontSize: 16, marginRight: 4 },
  ratingText: { fontFamily: font.familyMedium, fontSize: 13, color: colors.textMuted },
  typeTag: {
    fontFamily: font.familyMedium, fontSize: 12, color: colors.primary,
    marginTop: 2,
  },
  driver: { fontFamily: font.familyRegular, fontSize: 13, color: colors.textMuted, marginTop: 4 },
  cardBottom: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: spacing.md,
  },
  distance: { fontFamily: font.familyMedium, fontSize: 14, color: colors.primary },
  bookBtn: { paddingVertical: 10, paddingHorizontal: 28 },
  emptyTitle: {
    fontFamily: font.family, fontSize: 17, color: colors.text,
    textAlign: "center", marginBottom: spacing.sm,
  },
  emptyBody: {
    fontFamily: font.familyRegular, fontSize: 14, color: colors.textMuted,
    textAlign: "center", lineHeight: 20,
  },
  errorText: {
    fontFamily: font.familyRegular, fontSize: 15, color: colors.danger,
    textAlign: "center", paddingHorizontal: 24,
  },
});
