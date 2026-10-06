# Backend — Taxi Platform API

FastAPI backend. Runs on SQLite with no setup, and switches to PostgreSQL by
changing one line in `.env`.

## Run it

```bash
python -m venv .venv
. .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python -m app.seed          # test data + test users
uvicorn app.main:app --reload
```

Open http://localhost:8000/docs to try every endpoint in the browser.

## Folder guide

```
app/
  main.py            # starts the app, joins all routers
  config.py          # reads settings from .env
  database.py        # database connection
  seed.py            # creates test data (run once)
  models/            # database tables (users, vehicles, bookings, ...)
  schemas/           # the shape of request/response data
  core/
    security.py      # passwords + login tokens (JWT) + role checks
    fare_logic.py    # distance, time and fare math
  routers/           # the endpoints, grouped by topic
    auth.py          # register, login, me
    vehicles.py      # add vehicle, update location, availability
    subscriptions.py # buy weekly/monthly/annual plan -> lists the taxi
    search.py        # "taxi near me"
    fare.py          # fare estimate before booking
    bookings.py      # create booking, my bookings, update status
    ratings.py       # rate a trip
    tracking.py      # live GPS WebSocket for a trip
    admin.py         # admin-only: users, vehicles, reports, pricing
```

## Main endpoints

| Method | Path                         | What it does                        |
|--------|------------------------------|-------------------------------------|
| POST   | /auth/register               | Create an account                   |
| POST   | /auth/login                  | Get a login token                   |
| POST   | /vehicles                    | Driver adds a vehicle               |
| POST   | /subscriptions               | Buy a plan (lists the taxi)         |
| GET    | /search/nearby               | Taxis near a lat/lng                |
| POST   | /fare/estimate               | Distance, time and fare             |
| POST   | /bookings                    | Book a taxi                         |
| PATCH  | /bookings/{id}/status        | Move trip: accepted/ongoing/...     |
| POST   | /ratings                     | Rate a finished trip                |
| WS     | /ws/track/{booking_id}       | Live location during a trip         |
| GET    | /admin/reports/summary       | Dashboard numbers (admin only)      |

## Switch to PostgreSQL

1. Install PostgreSQL and create a database.
2. In `.env`, set:
   `DATABASE_URL=postgresql://user:password@localhost:5432/taxi`
3. Install the driver: `pip install psycopg2-binary`
4. Run the seed again: `python -m app.seed`

### Faster "taxi near me" with PostGIS (later)

The current search loads listed taxis and measures distance in Python. This is
fine for a start. When you have many taxis, upgrade to PostGIS:

1. Enable the extension in PostgreSQL: `CREATE EXTENSION postgis;`
2. Install `geoalchemy2`, store the taxi location as a geography point, and
   replace the loop in `app/routers/search.py` with a radius query
   (`ST_DWithin`) sorted by `ST_Distance`.

Claude Code can do this whole change for you — just ask.

## Things to do before going live

- Change `SECRET_KEY` in `.env` to a long random value.
- Limit `allow_origins` in `app/main.py` to your real app/website address.
- Use Alembic migrations instead of auto-creating tables.
- Add payment (MoMo / Airtel) inside `subscriptions.py` before activating a plan.
