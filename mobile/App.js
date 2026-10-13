import React, { useEffect, useState } from "react";
import { View, ScrollView, TouchableOpacity, Text, Button, ActivityIndicator } from "react-native";
// Register the background location task before any navigation loads.
import "./src/api/tracking";
import { NavigationContainer, getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import NearbyTaxisScreen from "./src/screens/NearbyTaxisScreen";
import BookingScreen from "./src/screens/BookingScreen";
import TripScreen from "./src/screens/TripScreen";
import DriverHomeScreen from "./src/screens/DriverHomeScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import { logout, loadToken, getMe } from "./src/api/client";
import { colors, font } from "./src/theme";

const RootStack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Shared navy header styling for all stack headers.
const navyHeader = {
  headerStyle: { backgroundColor: colors.header },
  headerTintColor: colors.white,
  headerTitleStyle: { fontFamily: font.family },
};

const baseTabBar = {
  backgroundColor: colors.card,
  borderTopColor: colors.border,
  height: 60,
  paddingBottom: 6,
  paddingTop: 6,
};

// Hide the tab bar while inside the booking/trip detail screens.
function tabBarForRoute(route) {
  const name = getFocusedRouteNameFromRoute(route) ?? "NearbyTaxis";
  if (name === "Booking" || name === "Trip") return { display: "none" };
  return baseTabBar;
}

// ── Full-screen error display (shows message + stack instead of a silent reload) ──
function ErrorScreen({ error, componentStack, onReset }) {
  return (
    <ScrollView contentContainerStyle={errStyles.container}>
      <Text style={errStyles.heading}>App error (caught)</Text>
      <Text style={errStyles.message}>
        {String(error?.message || error || "Unknown error")}
      </Text>
      {error?.stack ? (
        <Text selectable style={errStyles.mono}>{String(error.stack)}</Text>
      ) : null}
      {componentStack ? (
        <>
          <Text style={errStyles.subheading}>Component stack</Text>
          <Text selectable style={errStyles.monoDim}>{componentStack}</Text>
        </>
      ) : null}
      <View style={{ marginTop: 20 }}>
        <Button title="Try again" onPress={onReset} />
      </View>
    </ScrollView>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, componentStack: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info?.componentStack);
    this.setState({ componentStack: info?.componentStack });
  }
  render() {
    if (this.state.error) {
      return (
        <ErrorScreen
          error={this.state.error}
          componentStack={this.state.componentStack}
          onReset={() => this.setState({ error: null, componentStack: null })}
        />
      );
    }
    return this.props.children;
  }
}

// History + Logout buttons for the driver dashboard header (navy bar → light text).
function DriverHeaderButtons({ navigation }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <TouchableOpacity
        onPress={() => navigation.navigate("History")}
        style={{ paddingHorizontal: 8, paddingVertical: 4 }}
      >
        <Text style={{ color: colors.white, fontFamily: font.familyMedium }}>History</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => {
          logout();
          navigation.replace("Login");
        }}
        style={{ marginRight: 4, paddingHorizontal: 8, paddingVertical: 4 }}
      >
        <Text style={{ color: "#ffd0d0", fontFamily: font.familyMedium }}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

// The passenger booking flow (nearby list → booking → live trip), used by Home and Search tabs.
function BookingFlowStack() {
  return (
    <HomeStack.Navigator screenOptions={navyHeader}>
      <HomeStack.Screen name="NearbyTaxis" component={NearbyTaxisScreen} options={{ title: "Taxis near me" }} />
      <HomeStack.Screen name="Booking" component={BookingScreen} options={{ title: "Book a Taxi" }} />
      <HomeStack.Screen name="Trip" component={TripScreen} options={{ headerShown: false }} />
    </HomeStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: font.familyMedium, fontSize: 11 },
        tabBarStyle: baseTabBar,
        tabBarIcon: ({ color, size }) => {
          const icons = { Home: "home", Search: "search", History: "time", Settings: "settings" };
          return <Ionicons name={icons[route.name] || "ellipse"} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={BookingFlowStack}
        options={({ route }) => ({ tabBarStyle: tabBarForRoute(route) })}
      />
      <Tab.Screen
        name="Search"
        component={BookingFlowStack}
        options={({ route }) => ({ tabBarStyle: tabBarForRoute(route) })}
      />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [fatal, setFatal] = useState(null);
  const [initialRoute, setInitialRoute] = useState(null); // null while restoring session
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Catch fatal errors from event handlers / async code (error boundaries miss these).
  useEffect(() => {
    const prev = global.ErrorUtils?.getGlobalHandler?.();
    global.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
      console.error("[GlobalError] isFatal:", isFatal, error);
      setFatal(error);
      if (__DEV__ && prev) prev(error, isFatal);
    });
    return () => { if (prev) global.ErrorUtils?.setGlobalHandler?.(prev); };
  }, []);

  // Restore a persisted session: load the token, confirm it, and route straight home.
  useEffect(() => {
    (async () => {
      try {
        const t = await loadToken();
        if (t) {
          const me = await getMe();
          setInitialRoute(me.role === "driver" ? "DriverHome" : "Main");
          return;
        }
      } catch {
        // token missing/expired/invalid — fall back to Login
        await logout();
      }
      setInitialRoute("Login");
    })();
  }, []);

  if (fatal) {
    return <ErrorScreen error={fatal} onReset={() => setFatal(null)} />;
  }

  // Show the app only once fonts are ready and the session check has finished.
  if (!fontsLoaded || !initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.screen }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <NavigationContainer>
        <RootStack.Navigator initialRouteName={initialRoute} screenOptions={navyHeader}>
          <RootStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <RootStack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          <RootStack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <RootStack.Screen
            name="DriverHome"
            component={DriverHomeScreen}
            options={({ navigation }) => ({
              title: "Driver Dashboard",
              headerRight: () => <DriverHeaderButtons navigation={navigation} />,
            })}
          />
          <RootStack.Screen name="History" component={HistoryScreen} options={{ title: "Trip History" }} />
        </RootStack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}

const errStyles = {
  container: { padding: 24, paddingTop: 60, flexGrow: 1, backgroundColor: "#fff" },
  heading: { fontSize: 20, fontWeight: "bold", color: "#c00", marginBottom: 12 },
  subheading: { fontSize: 14, fontWeight: "700", marginTop: 16, marginBottom: 4 },
  message: { fontSize: 15, fontWeight: "600", color: "#111", marginBottom: 12 },
  mono: { fontFamily: "monospace", fontSize: 12, color: "#333" },
  monoDim: { fontFamily: "monospace", fontSize: 12, color: "#777" },
};
