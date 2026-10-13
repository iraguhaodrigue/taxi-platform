import React from "react";
import { Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { colors, radius, font } from "../theme";

// A blue pill button. Same onPress semantics as the old <Button>, just styled.
export default function PillButton({
  title,
  onPress,
  color = colors.primary,
  textColor = colors.white,
  disabled = false,
  loading = false,
  style,
}) {
  const bg = disabled ? colors.border : color;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.btn, { backgroundColor: bg }, style]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: disabled ? colors.textMuted : textColor }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.button,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontFamily: font.family,
    fontSize: 16,
  },
});
