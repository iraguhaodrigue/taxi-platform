import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from "react-native";
import PillButton from "../components/PillButton";
import { register } from "../api/client";
import { colors, radius, spacing, font, cardShadow } from "../theme";

const ROLES = [
  { key: "passenger", label: "Passenger" },
  { key: "driver", label: "Driver" },
];

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("passenger");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!fullName || !phone || !password) {
      Alert.alert("Missing fields", "Fill in your name, phone, and password.");
      return;
    }
    setLoading(true);
    try {
      await register({ full_name: fullName, phone, password, role });
      // register() logs in; route to the right home.
      if (role === "driver") {
        navigation.replace("DriverHome");
      } else {
        navigation.replace("Main");
      }
    } catch (e) {
      if (e.response) {
        Alert.alert("Registration failed", `Status: ${e.response.status} - ${JSON.stringify(e.response.data)}`);
      } else {
        Alert.alert("Registration failed", `Network error: ${e.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Create account</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Full name</Text>
        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor={colors.textMuted}
          value={fullName}
          onChangeText={setFullName}
        />
        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          placeholder="Phone"
          placeholderTextColor={colors.textMuted}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Text style={styles.label}>I am a</Text>
        <View style={styles.roleRow}>
          {ROLES.map((r) => {
            const active = role === r.key;
            return (
              <TouchableOpacity
                key={r.key}
                onPress={() => setRole(r.key)}
                style={[styles.rolePill, active ? styles.rolePillActive : styles.rolePillIdle]}
              >
                <Text style={[styles.roleText, active ? styles.roleTextActive : styles.roleTextIdle]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <PillButton
          title="Create account"
          onPress={handleRegister}
          loading={loading}
          style={{ marginTop: spacing.md }}
        />
      </View>

      <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.linkWrap}>
        <Text style={styles.link}>Back to login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", padding: spacing.xl, backgroundColor: colors.screen },
  title: { fontFamily: font.family, fontSize: 26, color: colors.header, textAlign: "center", marginBottom: spacing.lg },
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: spacing.xl, ...cardShadow },
  label: {
    fontFamily: font.familyMedium, fontSize: 13, color: colors.textMuted,
    marginBottom: spacing.xs, marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.input,
    padding: 12, fontFamily: font.familyRegular, fontSize: 15,
    color: colors.text, backgroundColor: colors.white,
  },
  roleRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  rolePill: {
    flex: 1, borderRadius: radius.button, paddingVertical: 12, alignItems: "center",
    borderWidth: 1,
  },
  rolePillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  rolePillIdle: { backgroundColor: colors.white, borderColor: colors.border },
  roleText: { fontFamily: font.familyMedium, fontSize: 15 },
  roleTextActive: { color: colors.white },
  roleTextIdle: { color: colors.text },
  linkWrap: { marginTop: spacing.lg, alignItems: "center" },
  link: { fontFamily: font.familyMedium, color: colors.primary, fontSize: 15 },
});
