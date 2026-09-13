# Installation guide

How to run the starter project locally.

## You need

- Node.js 20+
- MongoDB (local install or free Atlas cluster)

## Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Edit `.env` — the example file has comments for each variable. At minimum:

- Set `MONGODB_URI` to your MongoDB connection string
- Change `JWT_SECRET` to any long random string (32+ characters)

Check: open `http://localhost:5000/api/health` — should return `"status": "ok"`.

On some Macs AirPlay uses port 5000. If the backend fails with `EADDRINUSE`, set `PORT=5001` in `backend/.env` and use `http://localhost:5001/api/health`.

## Frontend

New terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Default `VITE_API_URL` in `.env.example` is `http://localhost:5000/api`.

If you set backend `PORT=5001`, set `VITE_API_URL=http://localhost:5001/api` in `frontend/.env` too.

Open `http://localhost:5173` — home page should show API status.

## Quick test

1. Sign up with a test account (password needs 8+ chars, 1 number, 1 symbol)
2. You should land on the dashboard
3. Refresh — still logged in
4. Log out from the header

Workout, nutrition, and goals pages are placeholders until Capstone 2.

## Build frontend for production

```bash
cd frontend && npm run build
```

## Common issues

- **API offline on home page** — start the backend first
- **MongoDB error** — make sure MongoDB is running or fix `MONGODB_URI`
- **CORS error** — `CLIENT_URL` in backend `.env` should be `http://localhost:5173`

## Secrets

Do not commit `.env` files. Only `.env.example` belongs in the project.
