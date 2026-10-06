import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const TASK_LOCATION = "DRIVER_BG_LOCATION";
const ACTIVE_BOOKING_KEY = "ACTIVE_BOOKING_ID";
const HTTP_BASE = "http://146.190.21.86:8000";
const WS_BASE = "ws://146.190.21.86:8000";

// Must be at module top level so the OS can invoke it from the background.
// Reads the booking ID from AsyncStorage (survives app restarts) and POSTs
// each GPS fix to the backend, which broadcasts it to passenger WS listeners.
TaskManager.defineTask(TASK_LOCATION, async ({ data, error }) => {
  if (error) { console.warn("[BG task] location error:", error.message); return; }
  if (!data) return;

  const { locations } = data;
  const bookingId = await AsyncStorage.getItem(ACTIVE_BOOKING_KEY);
  if (!bookingId) return;

  for (const loc of locations) {
    try {
      await fetch(`${HTTP_BASE}/track/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        }),
      });
    } catch {
      // network blip — next fix will retry
    }
  }
});

// DRIVER — start background GPS streaming for a trip.
// Returns { backgroundGranted, stopFallback? }:
//   backgroundGranted=true  → OS background task is running; stop via stopBackgroundLocation()
//   backgroundGranted=false → foreground-only WS fallback; stop via stopFallback()
export async function startBackgroundLocation(bookingId) {
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== "granted") throw new Error("Location permission denied.");

  // Store booking ID so the background task can read it when the app is not active.
  await AsyncStorage.setItem(ACTIVE_BOOKING_KEY, String(bookingId));

  const { status: bg } = await Location.requestBackgroundPermissionsAsync();

  if (bg !== "granted") {
    const stopFallback = _startForegroundFallback(bookingId);
    return { backgroundGranted: false, stopFallback };
  }

  // Stop any leftover run before starting fresh.
  const running = await Location.hasStartedLocationUpdatesAsync(TASK_LOCATION).catch(() => false);
  if (running) await Location.stopLocationUpdatesAsync(TASK_LOCATION);

  await Location.startLocationUpdatesAsync(TASK_LOCATION, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 4000,       // at most one update per 4 s
    distanceInterval: 20,     // or per 20 m, whichever comes first
    foregroundService: {
      notificationTitle: "Trip tracking active",
      notificationBody: "Sharing your location for the active trip.",
      notificationColor: "#22c55e",
    },
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.AutomotiveNavigation,
    showsBackgroundLocationIndicator: true, // iOS blue bar
  });

  return { backgroundGranted: true };
}

// DRIVER — stop background GPS streaming and clear the stored booking ID.
export async function stopBackgroundLocation() {
  await AsyncStorage.removeItem(ACTIVE_BOOKING_KEY);
  const running = await Location.hasStartedLocationUpdatesAsync(TASK_LOCATION).catch(() => false);
  if (running) await Location.stopLocationUpdatesAsync(TASK_LOCATION);
}

// Foreground-only WS fallback when background permission is denied.
function _startForegroundFallback(bookingId) {
  let socket = null, timer = null, stopped = false;

  function openSocket() {
    if (stopped) return;
    socket = new WebSocket(`${WS_BASE}/ws/track/${bookingId}`);
    socket.onerror = () => socket.close();
    socket.onclose = () => {
      socket = null;
      if (!stopped) setTimeout(openSocket, 3000);
    };
  }

  openSocket();
  timer = setInterval(async () => {
    if (stopped) return;
    try {
      const pos = await Location.getCurrentPositionAsync({});
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }));
      }
    } catch {}
  }, 4000);

  return function stop() {
    stopped = true;
    if (timer) { clearInterval(timer); timer = null; }
    if (socket) { socket.close(); socket = null; }
  };
}

// Kept for backward compatibility — delegates to foreground fallback.
export function startSendingLocation(bookingId) {
  return _startForegroundFallback(bookingId);
}

// PASSENGER — listen for the driver's GPS updates (unchanged).
// onUpdate({ lat, lng }) fires on each message.
// onStatusChange('connecting' | 'live') fires as connection state changes.
// Returns a stop() cleanup function.
export function listenToDriver(bookingId, onUpdate, onStatusChange) {
  let socket = null, stopped = false, reconnectTimer = null;

  function connect() {
    if (stopped) return;
    onStatusChange?.("connecting");
    socket = new WebSocket(`${WS_BASE}/ws/track/${bookingId}`);
    socket.onopen = () => onStatusChange?.("live");
    socket.onmessage = (event) => {
      try { onUpdate(JSON.parse(event.data)); } catch {}
    };
    socket.onerror = () => socket.close();
    socket.onclose = () => {
      socket = null;
      if (!stopped) {
        onStatusChange?.("connecting");
        reconnectTimer = setTimeout(connect, 3000);
      }
    };
  }

  connect();
  return function stop() {
    stopped = true;
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    if (socket) { socket.close(); socket = null; }
  };
}
