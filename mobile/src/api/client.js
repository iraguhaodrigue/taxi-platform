import axios from "axios";

// IMPORTANT: change this to your computer's IP when testing on a real phone.
// "localhost" will NOT work from a phone, because the phone is a different device.
// Example: const BASE_URL = "http://192.168.1.10:8000";
const BASE_URL = "http://10.10.103.181:8000"; // works for an Android emulator

const api = axios.create({ baseURL: BASE_URL });

let token = null;
export function setToken(t) {
  token = t;
}

api.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---- API calls used by the screens ----
export async function login(phone, password) {
  // The backend expects form fields "username" and "password".
  const body = new URLSearchParams();
  body.append("username", phone);
  body.append("password", password);
  const res = await api.post("/auth/login", body);
  setToken(res.data.access_token);
  return res.data;
}

export async function getNearbyTaxis(lat, lng, radiusKm = 5) {
  const res = await api.get("/search/nearby", {
    params: { lat, lng, radius_km: radiusKm },
  });
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

export async function geocodeSearch(q) {
  const res = await api.get("/geocode/search", { params: { q } });
  return res.data; // [{ name, lat, lng }, ...]
}

export default api;
