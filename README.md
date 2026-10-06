# Taxi Booking & Listing Platform — Starter Project

This is a starting point for a smart taxi booking and car listing platform.
It is built so you can run it today and then grow it feature by feature using
Claude Code.

The project has three parts:

| Folder      | What it is              | Technology                    |
|-------------|-------------------------|-------------------------------|
| `backend/`  | The API (the brain)     | FastAPI + SQLite/PostgreSQL   |
| `mobile/`   | Driver & passenger app  | React Native (Expo)           |
| `admin/`    | Web admin panel         | (to be built)                 |

All three talk to the **same backend**.

---

## How the pieces fit together

1. A **driver** registers a vehicle in the mobile app and buys a subscription
   (weekly / monthly / annual). This lists the taxi on the platform.
2. A **passenger** opens the app, the phone reads its GPS, and the app asks the
   backend for "taxis near me".
3. The passenger picks a taxi, enters a destination, and the backend returns an
   estimated distance, time and fare **before** booking.
4. The passenger books. During the trip, the driver's phone sends live GPS and
   the passenger sees the taxi move on the map (live tracking).
5. After the trip, the passenger rates the driver.
6. An **admin** manages everything from the web panel and sees reports.

---

## Start here: run the backend (5 minutes)

```bash
cd backend
python -m venv .venv
. .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python -m app.seed          # creates test data + test users
uvicorn app.main:app --reload
```

Now open http://localhost:8000/docs — this is an automatic page where you can
see and test every endpoint.

**Test logins (created by the seed):**

| Role      | Phone        | Password   |
|-----------|--------------|------------|
| Admin     | 0780000001   | admin123   |
| Driver    | 0780000002   | driver123  |
| Passenger | 0780000003   | pass123    |

See `backend/README.md` for full details and the PostgreSQL / PostGIS upgrade.

---

## Then run the mobile app

See `mobile/README.md`. In short:

```bash
cd mobile
npm install
npm start
```

Scan the QR code with the Expo Go app on your phone, or press `a` for an Android
emulator.

---

## Suggested build order (do these with Claude Code)

Build one feature at a time. Each already has a place in the code:

1. **[done]** User accounts + login (passenger / driver / admin)
2. **[done]** Vehicle registration + listing
3. **[done]** Subscription plans (weekly / monthly / annual)
4. **[done]** "Taxi near me" location search
5. **[done]** Fare estimation (distance + time + price)
6. **[done]** Booking + trip status (requested → accepted → ongoing → completed)
7. **[done]** Ratings and reviews
8. **[done]** Live tracking channel (WebSocket)
9. **[done]** Admin module + simple reports
10. **[next]** Real road distance/time from a maps API (replace the straight-line math)
11. **[next]** Full driver app screens with background GPS tracking
12. **[next]** Build the web admin panel in `admin/`
13. **[next]** MTN MoMo + Airtel Money payments (do this last — needs provider approval)

Items marked **[done]** already work in the backend. The mobile app has login
and "taxi near me" done; the other screens are the next step.

---

## A note on the two "estimate" shortcuts

To keep the starter simple and runnable with no accounts or keys, two things use
a simple method for now, and are meant to be upgraded:

- **Distance/time** uses a straight-line calculation, not real roads.
  Upgrade: call a maps API (Google Maps, or free OpenRouteService / Mapbox) in
  `backend/app/core/fare_logic.py`.
- **Live tracking** keeps connections in memory on one server.
  Upgrade: use Redis or Supabase Realtime for many servers.

Both upgrade points are marked with comments in the code.
