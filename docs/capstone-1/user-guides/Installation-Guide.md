# Installation Guide — Fitness & Wellness Tracker

**Team:** Alejandro Perez, Ahanaf Akif, Josue Gamon Fortes, Allen Cruz  
**Course:** CIS3950 Capstone I

This guide installs and runs the Capstone 1 starter locally (API + web site). Screenshots are in `Installation-screenshots/`.

## 1. Prerequisites

| Software | Notes |
|----------|--------|
| Node.js 20+ | Includes `npm`. Check with `node -v` and `npm -v`. |
| MongoDB | Local install **or** a free MongoDB Atlas cluster |

## 2. Unpack and open the Code folder

1. Unzip `fitness-wellness-tracker.zip`.
2. Open a terminal in `Code/backend` for the API and another in `Code/WebSite` for the site.

## 3. Configure the backend

```bash
cd Code/backend
cp .env.example .env
```

Edit `Code/backend/.env`:

| Variable | What to set |
|----------|-------------|
| `PORT` | API port (default `5000`). On some Macs AirPlay uses 5000 — use `5001` if the port is busy. |
| `MONGODB_URI` | Local: `mongodb://127.0.0.1:27017/fitness-wellness-tracker` — or your Atlas connection string. |
| `JWT_SECRET` | Any long random string (32+ characters). |
| `CLIENT_URL` | Frontend origin, usually `http://localhost:5173`. |

## 4. Install and start the API

```bash
cd Code/backend
npm install
npm run dev
```

Health check: open `http://localhost:5000/api/health` (or port `5001`) in a browser. You should see JSON with `"status": "ok"`.

![API health check returning status ok](Installation-screenshots/01-api-health.png)

## 5. Configure the web site

```bash
cd Code/WebSite
cp .env.example .env
```

Edit `Code/WebSite/.env`:

| Variable | What to set |
|----------|-------------|
| `VITE_API_URL` | Must match the API, including `/api` — e.g. `http://localhost:5000/api` or `http://localhost:5001/api`. |

## 6. Install and start the web site

```bash
cd Code/WebSite
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

![Home page with API status connected](Installation-screenshots/02-home-api-online.png)

## 7. Smoke test

1. Open **Sign up** and create a test account (password: 8+ characters, 1 number, 1 symbol).

![Sign up page](Installation-screenshots/03-signup.png)

2. Confirm you land on the dashboard.
3. Refresh — you should stay signed in.
4. Log out from the header.

![Dashboard after successful signup](Installation-screenshots/04-dashboard.png)

## 8. Optional production build (web site)

```bash
cd Code/WebSite
npm run build
```

Static files are written to `Code/WebSite/dist/`.

## 9. Common issues

| Problem | Fix |
|---------|-----|
| API offline on home page | Start `Code/backend` first; check `VITE_API_URL`. |
| MongoDB connection error | Start local MongoDB or fix `MONGODB_URI`. |
| `EADDRINUSE` on port 5000 | Set `PORT=5001` and matching `VITE_API_URL`. |
| CORS errors | Set `CLIENT_URL=http://localhost:5173` in backend `.env`. |

## 10. Secrets

Do not submit real `.env` files. Only `.env.example` templates are included in the deliverable.
