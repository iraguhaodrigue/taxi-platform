import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator } from "react-native";
import PillButton from "../components/PillButton";
import { getMe, updateProfile, logout } from "../api/client";
import { colors, radius, spacing, font, cardShadow } from "../theme";

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export default function ProfileScreen({ navigation }) {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const m = await getMe();
      setMe(m);
      setFullName(m.full_name || "");
      setEmail(m.email || "");
    } catch {
      // ignore — show whatever we have
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Invalid email", "Enter a valid email address.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateProfile({ full_name: fullName, email });
      setMe(updated);
      Alert.alert("Saved", "Your profile has been updated.");
    } catch (e) {
      Alert.alert("Could not save", e?.response?.data?.detail || "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    logout();
    const root = navigation.getParent() || navigation;
    root.reset({ index: 0, routes: [{ name: "Login" }] });
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.name}>{me?.full_name}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.rolePill}>{cap(me?.role)}</Text>
          {me?.is_verified ? (
            <Text style={[styles.verifyPill, styles.verified]}>Verified ✓</Text>
          ) : (
            <Text style={[styles.verifyPill, styles.unverified]}>Unverified</Text>
          )}
        </View>
        <Text style={styles.phone}>{me?.phone}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Edit profile</Text>
        <Text style={styles.label}>Full name</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Full name"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <PillButton title="Save changes" onPress={handleSave} loading={saving} style={{ marginTop: spacing.md }} />
      </View>

      <PillButton title="Log out" color={colors.danger} onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen, padding: spacing.lg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.screen },
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: spacing.lg, marginBottom: spacing.md, ...cardShadow },
  name: { fontFamily: font.familyBold, fontSize: 20, color: colors.text },
  metaRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  rolePill: {
    fontFamily: font.familyMedium, fontSize: 12, color: colors.primary,
    backgroundColor: colors.tintPrimary, paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: radius.pill, overflow: "hidden",
  },
  verifyPill: {
    fontFamily: font.familyMedium, fontSize: 12, paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: radius.pill, overflow: "hidden",
  },
  verified: { color: colors.success, backgroundColor: colors.tintSuccess },
  unverified: { color: colors.warning, backgroundColor: colors.tintWarning },
  phone: { fontFamily: font.familyRegular, fontSize: 14, color: colors.textMuted, marginTop: spacing.sm },
  sectionTitle: { fontFamily: font.family, fontSize: 16, color: colors.text, marginBottom: spacing.sm },
  label: { fontFamily: font.familyMedium, fontSize: 13, color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xs },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, padding: 12,
    fontFamily: font.familyRegular, fontSize: 15, color: colors.text, backgroundColor: colors.white,
  },
});
