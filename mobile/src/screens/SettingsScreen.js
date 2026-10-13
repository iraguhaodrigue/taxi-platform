import React from "react";
import { View, Text, StyleSheet } from "react-native";
import PillButton from "../components/PillButton";
import { logout } from "../api/client";
import { colors, radius, spacing, font, cardShadow } from "../theme";

export default function SettingsScreen({ navigation }) {
  function handleLogout() {
    logout();
    // Reset the root navigator back to Login.
    const root = navigation.getParent() || navigation;
    root.reset({ index: 0, routes: [{ name: "Login" }] });
  }

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.body}>
          You're signed in. Sign out to return to the login screen.
        </Text>
        <PillButton title="Log out" color={colors.danger} onPress={handleLogout} style={{ marginTop: spacing.lg }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.screen,
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.xl,
    ...cardShadow,
  },
  title: { fontFamily: font.family, fontSize: 22, color: colors.text, marginBottom: spacing.sm },
  body: { fontFamily: font.familyRegular, fontSize: 14, color: colors.textMuted, lineHeight: 20 },
});
