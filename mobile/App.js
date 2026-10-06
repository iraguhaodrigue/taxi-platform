import React from "react";
import { TouchableOpacity, Text } from "react-native";
// Register the background location task before any navigation loads.
import "./src/api/tracking";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./src/screens/LoginScreen";
import NearbyTaxisScreen from "./src/screens/NearbyTaxisScreen";
import BookingScreen from "./src/screens/BookingScreen";
import TripScreen from "./src/screens/TripScreen";
import DriverHomeScreen from "./src/screens/DriverHomeScreen";
import { logout } from "./src/api/client";

const Stack = createNativeStackNavigator();

function LogoutButton({ navigation }) {
  return (
    <TouchableOpacity
      onPress={() => {
        logout();
        navigation.replace("Login");
      }}
      style={{ marginRight: 4, paddingHorizontal: 8, paddingVertical: 4 }}
    >
      <Text style={{ color: "#c00", fontWeight: "600" }}>Logout</Text>
    </TouchableOpacity>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Sign In" }} />
        <Stack.Screen
          name="NearbyTaxis"
          component={NearbyTaxisScreen}
          options={({ navigation }) => ({
            title: "Taxis near me",
            headerRight: () => <LogoutButton navigation={navigation} />,
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
            headerRight: () => <LogoutButton navigation={navigation} />,
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
