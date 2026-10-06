const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export async function loginAdmin(phone, password) {
  const body = new URLSearchParams({ username: phone, password });
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    body,
  });
  if (!res.ok) throw new Error("Wrong phone or password");
  const data = await res.json();
  localStorage.setItem("admin_token", data.access_token);
  return data;
}

export const getSummary = () => request("/admin/reports/summary");
export const getUsers = () => request("/admin/users");
export const getVehicles = () => request("/admin/vehicles");
export const getBookings = () => request("/admin/bookings");
export const getSubscriptions = () => request("/admin/subscriptions");

export function logout() {
  localStorage.removeItem("admin_token");
}

export function isLoggedIn() {
  return !!getToken();
}
