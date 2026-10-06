import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { login, getMe } from "../api/client";

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState("0780000003");
  const [password, setPassword] = useState("pass123");

  async function handleLogin() {
    try {
      await login(phone, password);
      const me = await getMe();
      if (me.role === "driver") {
        navigation.replace("DriverHome");
      } else {
        navigation.replace("NearbyTaxis");
      }
    } catch (e) {
      Alert.alert("Login failed", "Check your phone and password.");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Taxi Booking</Text>
      <TextInput
        style={styles.input}
        placeholder="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 24, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginBottom: 12 },
});
