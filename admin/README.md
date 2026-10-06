# Admin Panel (to be built)

This folder is for the web admin panel. It does not need GPS, so a simple
website is the right choice here.

The backend already has everything the admin needs (admin-only endpoints):

- `GET  /admin/users`              — all users
- `GET  /admin/vehicles`           — all vehicles
- `GET  /admin/bookings`           — all bookings
- `GET  /admin/subscriptions`      — all subscriptions
- `GET  /admin/reports/summary`    — dashboard numbers
- `PUT  /admin/pricing`            — change base fare / per-km / per-min

All of these require an **admin login token** (log in as `0780000001` /
`admin123`, send the token in the `Authorization: Bearer ...` header).

## Suggested approach

Build this with Next.js (React) + Tailwind — it matches your stack. Ask Claude
Code to:

1. Create a Next.js app in this folder.
2. Add an admin login page that calls `/auth/login`.
3. Add a dashboard that shows `/admin/reports/summary`.
4. Add tables for users, vehicles, bookings and subscriptions.
5. Add a form to update pricing.
