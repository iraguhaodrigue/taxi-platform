// Live location helpers.
//
// DRIVER side: start sending GPS over a WebSocket during a trip.
// PASSENGER side: listen for the driver's location on the same booking.
//
// This is a starting point. Background tracking (when the screen is off)
// needs expo-location + expo-task-manager, set up when you build the
// driver trip screen. See mobile/README.md.

import * as Location from "expo-location";

const WS_BASE = "ws://10.10.103.181:8000"; // match client.js BASE_URL (ws:// not http://)

// DRIVER: send my location every few seconds for one booking.
export function startSendingLocation(bookingId, intervalMs = 4000) {
  const socket = new WebSocket(`${WS_BASE}/ws/track/${bookingId}`);

  const timer = setInterval(async () => {
    const pos = await Location.getCurrentPositionAsync({});
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      );
    }
  }, intervalMs);

  return () => {
    clearInterval(timer);
    socket.close();
  };
}

// PASSENGER: receive the driver's location for one booking.
export function listenToDriver(bookingId, onUpdate) {
  const socket = new WebSocket(`${WS_BASE}/ws/track/${bookingId}`);
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data); // { lat, lng }
    onUpdate(data);
  };
  return () => socket.close();
}
