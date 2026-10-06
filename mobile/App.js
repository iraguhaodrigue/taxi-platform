import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./src/screens/LoginScreen";
import NearbyTaxisScreen from "./src/screens/NearbyTaxisScreen";
import BookingScreen from "./src/screens/BookingScreen";
import TripScreen from "./src/screens/TripScreen";
import DriverHomeScreen from "./src/screens/DriverHomeScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Sign In" }} />
        <Stack.Screen
          name="NearbyTaxis"
          component={NearbyTaxisScreen}
          options={{ title: "Taxis near me" }}
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
          options={{ title: "Driver Dashboard" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
