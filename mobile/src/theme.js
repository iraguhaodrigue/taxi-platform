// Single source of visual style for the whole app.
// Import { colors, radius, spacing, font, cardShadow } from "../theme".

export const colors = {
  primary: "#1E6FFF",      // brand blue (buttons, active icons)
  primaryDark: "#1557C7",
  header: "#0D1B4C",       // navy header bar
  screen: "#F2F4F8",       // light grey page background
  card: "#FFFFFF",         // white cards
  text: "#1A1A2E",         // primary text
  textMuted: "#6B7280",    // secondary / muted text
  border: "#E3E8EF",       // light input / divider border
  star: "#F5A623",         // gold rating star
  white: "#FFFFFF",
  success: "#16A34A",
  danger: "#DC2626",
};

export const radius = {
  card: 16,
  button: 999,   // full pill
  input: 12,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const font = {
  family: "Poppins_600SemiBold",        // headings
  familyRegular: "Poppins_400Regular",  // body
  familyMedium: "Poppins_500Medium",
  familyBold: "Poppins_700Bold",
};

export const cardShadow = {
  shadowColor: "#0D1B4C",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
};

export default { colors, radius, spacing, font, cardShadow };
