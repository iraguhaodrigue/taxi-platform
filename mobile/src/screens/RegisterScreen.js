import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ScrollView } from "react-native";
import PillButton from "../components/PillButton";
import { register } from "../api/client";
import { colors, radius, spacing, font, cardShadow } from "../theme";

const ROLES = [
  { key: "passenger", label: "Passenger" },
  { key: "driver", label: "Driver" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordStrength(pw) {
  // Must be 8+ with a letter and a number to pass at all.
  if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) {
    return { level: "weak", ok: false };
  }
  let score = 0;
  if (pw.length >= 10) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return { level: score >= 2 ? "strong" : "ok", ok: true };
}

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("passenger");
  const [loading, setLoading] = useState(false);

  const pw = passwordStrength(password);
  const emailValid = EMAIL_RE.test(email);
  const canSubmit = !!fullName && !!phone && emailValid && pw.ok;

  const strengthColor = pw.level === "strong" ? colors.success : pw.level === "ok" ? colors.warning : colors.danger;
  const strengthLabel = password.length === 0 ? "" : pw.level === "strong" ? "Strong" : pw.level === "ok" ? "OK" : "Weak — need 8+ chars with a letter and a number";

  async function handleRegister() {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await register({ full_name: fullName, phone, email, password, role });
      // Account created (unverified) → go verify the email, then continue home.
      navigation.replace("VerifyEmail", { phone, password });
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
    <ScrollView contentContainerStyle={styles.screen}>
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
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {email.length > 0 && !emailValid && (
          <Text style={styles.hintBad}>Enter a valid email address.</Text>
        )}

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {strengthLabel ? (
          <Text style={[styles.strength, { color: strengthColor }]}>{strengthLabel}</Text>
        ) : null}

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
          disabled={!canSubmit}
          style={{ marginTop: spacing.md }}
        />
      </View>

      <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.linkWrap}>
        <Text style={styles.link}>Back to login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, justifyContent: "center", padding: spacing.xl, backgroundColor: colors.screen },
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
  strength: { fontFamily: font.familyMedium, fontSize: 12, marginTop: spacing.xs },
  hintBad: { fontFamily: font.familyRegular, fontSize: 12, color: colors.danger, marginTop: spacing.xs },
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
