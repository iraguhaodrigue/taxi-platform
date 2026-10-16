import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from "react-native";
import PillButton from "../components/PillButton";
import { verifyEmail, resendCode, login, getMe, routeForRole } from "../api/client";
import { colors, radius, spacing, font, cardShadow } from "../theme";

export default function VerifyEmailScreen({ route, navigation }) {
  const paramPhone = route.params?.phone;
  const paramPassword = route.params?.password;

  const [phone, setPhone] = useState(paramPhone || "");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  // When we arrive from session-restore (already logged in), resolve the phone.
  useEffect(() => {
    if (!paramPhone) {
      getMe().then((me) => setPhone(me.phone)).catch(() => {});
    }
  }, []);

  async function handleVerify() {
    if (code.trim().length !== 6) {
      Alert.alert("Enter the code", "The verification code is 6 digits.");
      return;
    }
    setVerifying(true);
    try {
      await verifyEmail(phone, code.trim());
      // If we came from register, we still need a token — log in now.
      if (paramPassword) await login(phone, paramPassword);
      const me = await getMe();
      navigation.replace(routeForRole(me.role));
    } catch (e) {
      Alert.alert("Verification failed", e?.response?.data?.detail || "Check the code and try again.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (!phone) return;
    setResending(true);
    try {
      await resendCode(phone);
      Alert.alert("Code sent", "We've sent a new code to your email.");
    } catch (e) {
      Alert.alert("Could not resend", e?.response?.data?.detail || "Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.sub}>Enter the 6-digit code we emailed you.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Verification code</Text>
        <TextInput
          style={styles.input}
          placeholder="000000"
          placeholderTextColor={colors.textMuted}
          value={code}
          onChangeText={(t) => setCode(t.replace(/[^0-9]/g, "").slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
        />
        <PillButton title="Verify" onPress={handleVerify} loading={verifying} style={{ marginTop: spacing.md }} />
        <TouchableOpacity onPress={handleResend} disabled={resending} style={styles.linkWrap}>
          <Text style={styles.link}>{resending ? "Sending…" : "Resend code"}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => navigation.replace("Login")} style={styles.linkWrap}>
        <Text style={styles.linkMuted}>Back to login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", padding: spacing.xl, backgroundColor: colors.screen },
  title: { fontFamily: font.family, fontSize: 24, color: colors.header, textAlign: "center" },
  sub: { fontFamily: font.familyRegular, fontSize: 14, color: colors.textMuted, textAlign: "center", marginTop: 4, marginBottom: spacing.lg },
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: spacing.xl, ...cardShadow },
  label: { fontFamily: font.familyMedium, fontSize: 13, color: colors.textMuted, marginBottom: spacing.xs },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, padding: 12,
    fontFamily: font.familyBold, fontSize: 22, letterSpacing: 6, textAlign: "center",
    color: colors.text, backgroundColor: colors.white,
  },
  linkWrap: { marginTop: spacing.lg, alignItems: "center" },
  link: { fontFamily: font.familyMedium, color: colors.primary, fontSize: 15 },
  linkMuted: { fontFamily: font.familyMedium, color: colors.textMuted, fontSize: 14 },
});
