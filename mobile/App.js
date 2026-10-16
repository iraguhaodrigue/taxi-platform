import React, { useEffect, useState } from "react";
import { View, ScrollView, Text, Button, ActivityIndicator } from "react-native";
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
import VerifyEmailScreen from "./src/screens/VerifyEmailScreen";
import NearbyTaxisScreen from "./src/screens/NearbyTaxisScreen";
import BookingScreen from "./src/screens/BookingScreen";
import TripScreen from "./src/screens/TripScreen";
import DriverHomeScreen from "./src/screens/DriverHomeScreen";
import DriverEarningsScreen from "./src/screens/DriverEarningsScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import AdminDashboard from "./src/screens/AdminDashboard";
import { logout, loadToken, getMe, routeForRole } from "./src/api/client";
import { colors, font } from "./src/theme";

const RootStack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();
const DriverTab = createBottomTabNavigator();
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
          const icons = { Home: "home", Search: "search", History: "time", Profile: "person" };
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
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true, ...navyHeader, title: "Profile" }} />
    </Tab.Navigator>
  );
}

// Driver bottom tabs: Home (dashboard + map), Trips (history), Earnings, Profile.
function DriverTabs() {
  return (
    <DriverTab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.white,
        headerTitleStyle: { fontFamily: font.family },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: font.familyMedium, fontSize: 11 },
        tabBarStyle: baseTabBar,
        tabBarIcon: ({ color, size }) => {
          const icons = { Home: "home", Trips: "list", Earnings: "cash", Profile: "person" };
          return <Ionicons name={icons[route.name] || "ellipse"} size={size} color={color} />;
        },
      })}
    >
      <DriverTab.Screen name="Home" component={DriverHomeScreen} options={{ title: "Driver Dashboard" }} />
      <DriverTab.Screen name="Trips" component={HistoryScreen} options={{ title: "Trip History" }} />
      <DriverTab.Screen name="Earnings" component={DriverEarningsScreen} options={{ title: "Earnings" }} />
      <DriverTab.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
    </DriverTab.Navigator>
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
          setInitialRoute(me.is_verified ? routeForRole(me.role) : "VerifyEmail");
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
          <RootStack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{ headerShown: false }} />
          <RootStack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <RootStack.Screen name="DriverHome" component={DriverTabs} options={{ headerShown: false }} />
          <RootStack.Screen name="History" component={HistoryScreen} options={{ title: "Trip History" }} />
          <RootStack.Screen name="AdminHome" component={AdminDashboard} options={{ headerShown: false }} />
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
