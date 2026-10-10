import React, { useEffect, useState } from "react";
import { View, ScrollView, TouchableOpacity, Text, Button } from "react-native";
// Register the background location task before any navigation loads.
import "./src/api/tracking";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./src/screens/LoginScreen";
import NearbyTaxisScreen from "./src/screens/NearbyTaxisScreen";
import BookingScreen from "./src/screens/BookingScreen";
import TripScreen from "./src/screens/TripScreen";
import DriverHomeScreen from "./src/screens/DriverHomeScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import { logout } from "./src/api/client";

const Stack = createNativeStackNavigator();

// Full-screen error display — shows message, stack, and component stack so the
// REAL crash is visible on-device instead of the app reloading to Login.
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

// Catches errors thrown during render / lifecycle anywhere below it.
// (It does NOT catch errors in event handlers or async callbacks — the global
// ErrorUtils handler in App covers those.)
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

function HeaderButtons({ navigation }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <TouchableOpacity
        onPress={() => navigation.navigate("History")}
        style={{ paddingHorizontal: 8, paddingVertical: 4 }}
      >
        <Text style={{ color: "#1d4ed8", fontWeight: "600" }}>History</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => {
          logout();
          navigation.replace("Login");
        }}
        style={{ marginRight: 4, paddingHorizontal: 8, paddingVertical: 4 }}
      >
        <Text style={{ color: "#c00", fontWeight: "600" }}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  // Catch fatal errors from event handlers / async code (which error boundaries
  // miss). Showing them here stops the release-build reload that otherwise wipes
  // the in-memory auth token and dumps the user back on Login.
  const [fatal, setFatal] = useState(null);

  useEffect(() => {
    const prev = global.ErrorUtils?.getGlobalHandler?.();
    global.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
      console.error("[GlobalError] isFatal:", isFatal, error);
      setFatal(error);
      // Keep the red-box in dev; in release we swallow so the screen stays put.
      if (__DEV__ && prev) prev(error, isFatal);
    });
    return () => { if (prev) global.ErrorUtils?.setGlobalHandler?.(prev); };
  }, []);

  if (fatal) {
    return <ErrorScreen error={fatal} onReset={() => setFatal(null)} />;
  }

  return (
    <ErrorBoundary>
      <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Sign In" }} />
        <Stack.Screen
          name="NearbyTaxis"
          component={NearbyTaxisScreen}
          options={({ navigation }) => ({
            title: "Taxis near me",
            headerRight: () => <HeaderButtons navigation={navigation} />,
          })}
        />
        <Stack.Screen
          name="Booking"
          component={BookingScreen}
          options={{ title: "Book a Taxi" }}
        />
        <Stack.Screen
          name="Trip"
          component={TripScreen}
          options={{ title: "Your Trip", headerShown: false }}
        />
        <Stack.Screen
          name="DriverHome"
          component={DriverHomeScreen}
          options={({ navigation }) => ({
            title: "Driver Dashboard",
            headerRight: () => <HeaderButtons navigation={navigation} />,
          })}
        />
        <Stack.Screen
          name="History"
          component={HistoryScreen}
          options={{ title: "Trip History" }}
        />
      </Stack.Navigator>
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
