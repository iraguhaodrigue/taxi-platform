# Mobile App — Driver & Passenger

Built with Expo (React Native), so one codebase runs on both Android and iPhone.

## Run it

```bash
npm install
npm start
```

Then either:
- Install **Expo Go** on your phone and scan the QR code, or
- Press `a` to open an Android emulator.

## Connect the app to the backend

The phone is a different device from your computer, so `localhost` will not work.
Open `src/api/client.js` and set `BASE_URL`:

- Android emulator: `http://10.0.2.2:8000` (already set)
- Real phone: your computer's IP, e.g. `http://192.168.1.10:8000`
  (find it with `ipconfig` on Windows or `ifconfig` on Mac/Linux; the phone and
  computer must be on the same Wi-Fi)

Also update `WS_BASE` in `src/api/tracking.js` the same way (use `ws://`).

## What is already here

```
App.js                     # screen navigation
src/
  api/
    client.js              # login, nearby taxis, fare, booking
    tracking.js            # live GPS: driver sends, passenger listens
  screens/
    LoginScreen.js         # done
    NearbyTaxisScreen.js   # done — reads GPS, shows taxis near you
  components/              # (empty, for shared UI pieces)
```

## What to build next (with Claude Code)

- **BookingScreen** — pick a taxi, enter destination, show fare estimate, confirm.
- **TripScreen** — a live map; passenger sees the taxi move using `tracking.js`.
- **DriverHomeScreen** — register vehicle, set available, accept bookings.
- **RatingScreen** — stars + comment after a trip.
- **Map view** — add `react-native-maps` to show taxis as markers.

## Background GPS (the important part for drivers)

A driver's location must keep sending even when the screen is off. This needs
`expo-location` + `expo-task-manager` with a background task. The permissions are
already set in `app.json`. When you build the driver trip screen, ask Claude Code
to "add a background location task that sends the driver's GPS to
/ws/track/{bookingId} every few seconds while a trip is active."
