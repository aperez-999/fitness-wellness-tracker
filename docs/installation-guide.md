# Installation guide

How to run our starter project locally. Capstone 1 does not require this to work for a grade, but we want it ready for Capstone 2.

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

## Frontend

New terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Default `VITE_API_URL` in `.env.example` is `http://localhost:5000/api`.

Check: open `http://localhost:5173` — home page should show API status.

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

## Before submission

Do not commit `.env` files. Only `.env.example` belongs in Git.
