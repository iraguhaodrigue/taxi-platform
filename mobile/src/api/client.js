import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// IMPORTANT: change this to your computer's IP when testing on a real phone.
// "localhost" will NOT work from a phone, because the phone is a different device.
// Example: const BASE_URL = "http://192.168.1.10:8000";
const BASE_URL = "http://146.190.21.86:8000";
const TOKEN_KEY = "AUTH_TOKEN";
console.log("[client.js] BASE_URL:", BASE_URL);

const api = axios.create({ baseURL: BASE_URL });

let token = null;
export function setToken(t) {
  token = t;
}
export function getToken() {
  return token;
}

// Load a persisted token at app start; sets it on the client if present.
export async function loadToken() {
  try {
    const t = await AsyncStorage.getItem(TOKEN_KEY);
    if (t) token = t;
    return t;
  } catch {
    return null;
  }
}

export async function logout() {
  token = null;
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
}

api.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Single source of truth for role → home route (used by login, register, startup).
export function routeForRole(role) {
  if (role === "admin") return "AdminHome";
  if (role === "driver") return "DriverHome";
  return "Main";
}

// ---- API calls used by the screens ----
export async function login(phone, password) {
  // The backend expects form fields "username" and "password".
  const body = new URLSearchParams();
  body.append("username", phone);
  body.append("password", password);
  const res = await api.post("/auth/login", body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  setToken(res.data.access_token);
  try {
    await AsyncStorage.setItem(TOKEN_KEY, res.data.access_token);
  } catch {
    // ignore storage errors — session still works for this run
  }
  return res.data;
}

// Create an account, then log in to obtain a token.
export async function register({ full_name, phone, password, role }) {
  await api.post("/auth/register", { full_name, phone, password, role });
  return login(phone, password);
}

export async function getNearbyTaxis(lat, lng, radiusKm = 5, vehicleType = null) {
  const params = { lat, lng, radius_km: radiusKm };
  if (vehicleType) params.vehicle_type = vehicleType;
  const res = await api.get("/search/nearby", { params });
  return res.data;
}

export async function estimateFare(pickup, destination) {
  const res = await api.post("/fare/estimate", {
    pickup_lat: pickup.lat,
    pickup_lng: pickup.lng,
    destination_lat: destination.lat,
    destination_lng: destination.lng,
  });
  return res.data;
}

export async function createBooking(payload) {
  const res = await api.post("/bookings", payload);
  return res.data;
}

export async function getMe() {
  const res = await api.get("/auth/me");
  return res.data;
}

export async function createVehicle(payload) {
  const res = await api.post("/vehicles", payload);
  return res.data;
}

export async function getMyVehicles() {
  const res = await api.get("/vehicles/mine");
  return res.data;
}

export async function createSubscription(vehicleId, plan) {
  const res = await api.post("/subscriptions", { vehicle_id: vehicleId, plan });
  return res.data;
}

export async function setVehicleAvailability(vehicleId, available) {
  const res = await api.patch(`/vehicles/${vehicleId}/availability`, null, {
    params: { available },
  });
  return res.data;
}

export async function updateVehicleLocation(vehicleId, lat, lng) {
  const res = await api.patch(`/vehicles/${vehicleId}/location`, null, {
    params: { lat, lng },
  });
  return res.data;
}

export async function geocodeSearch(q) {
  const res = await api.get("/geocode/search", { params: { q } });
  return res.data; // [{ name, lat, lng }, ...]
}

export async function getMyBookings() {
  const res = await api.get("/bookings/mine");
  return res.data;
}

export async function getDriverBookings() {
  const res = await api.get("/bookings/for-driver");
  return res.data;
}

export async function updateBookingStatus(bookingId, status) {
  const res = await api.patch(`/bookings/${bookingId}/status`, null, {
    params: { status },
  });
  return res.data;
}

export async function submitRating(bookingId, stars, comment) {
  const res = await api.post("/ratings", {
    booking_id: bookingId,
    stars,
    comment: comment || null,
  });
  return res.data;
}

export async function getVehicleRatings(vehicleId) {
  const res = await api.get(`/ratings/vehicle/${vehicleId}`);
  return res.data;
}

// ---- Admin (require an admin token; the interceptor attaches it) ----
export async function getAdminSummary() {
  const res = await api.get("/admin/reports/summary");
  return res.data;
}

export async function getAdminUsers() {
  const res = await api.get("/admin/users");
  return res.data;
}

export async function getAdminVehicles() {
  const res = await api.get("/admin/vehicles");
  return res.data;
}

export async function getAdminBookings() {
  const res = await api.get("/admin/bookings");
  return res.data;
}

export async function updatePricing(baseFare, ratePerKm, ratePerMin) {
  const res = await api.put("/admin/pricing", null, {
    params: { base_fare: baseFare, rate_per_km: ratePerKm, rate_per_min: ratePerMin },
  });
  return res.data;
}

export default api;
