import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from "react-native";
import PillButton from "../components/PillButton";
import { login, getMe, routeForRole } from "../api/client";
import { colors, radius, spacing, font, cardShadow } from "../theme";

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState("0780000003");
  const [password, setPassword] = useState("pass123");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      await login(phone, password);
      const me = await getMe();
      if (!me.is_verified) {
        navigation.replace("VerifyEmail", { phone, password });
      } else {
        navigation.replace(routeForRole(me.role));
      }
    } catch (e) {
      if (e.response) {
        Alert.alert(
          "Login failed",
          `Status: ${e.response.status} - ${JSON.stringify(e.response.data)}`
        );
      } else {
        Alert.alert("Login failed", `Network error: ${e.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.brand}>
        <Text style={styles.brandMark}>🚕</Text>
        <Text style={styles.brandName}>Taxi Booking</Text>
        <Text style={styles.brandTag}>Your ride, one tap away</Text>
      </View>

      <View style={styles.card}>
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
        <PillButton
          title="Sign In"
          onPress={handleLogin}
          loading={loading}
          style={{ marginTop: spacing.md }}
        />
      </View>

      <TouchableOpacity onPress={() => navigation.navigate("Register")} style={styles.linkWrap}>
        <Text style={styles.link}>Create account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.screen,
  },
  brand: { alignItems: "center", marginBottom: spacing.xl },
  brandMark: { fontSize: 56, marginBottom: spacing.sm },
  brandName: { fontFamily: font.family, fontSize: 28, color: colors.header },
  brandTag: { fontFamily: font.familyRegular, fontSize: 14, color: colors.textMuted, marginTop: 2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.xl,
    ...cardShadow,
  },
  label: {
    fontFamily: font.familyMedium,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  linkWrap: { marginTop: spacing.lg, alignItems: "center" },
  link: { fontFamily: font.familyMedium, color: colors.primary, fontSize: 15 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    padding: 12,
    fontFamily: font.familyRegular,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.white,
  },
});
