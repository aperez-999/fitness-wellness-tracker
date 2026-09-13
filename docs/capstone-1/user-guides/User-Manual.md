# User Manual — Fitness & Wellness Tracker

**Team:** Alejandro Perez, Ahanaf Akif, Josue Gamon Fortes, Allen Cruz  
**Course:** CIS3950 Capstone I  
**Version:** Capstone 1 starter

## What this app does

Fitness & Wellness Tracker is a web app for personal fitness logging. In the Capstone 1 starter you can create an account, sign in, open the dashboard shell, and open placeholder pages for workouts, nutrition, and goals. Full logging features are planned for Capstone 2.

## Starting the app

Follow `Installation-Guide.md` so the API and web site are running. Then open the site URL shown by Vite (usually `http://localhost:5173`).

## Home page

- Shows a short project intro and whether the API health check is online.
- Use **Sign up** to create an account or **Log in** if you already have one.

## Sign up

1. Open **Sign up**.
2. Enter email, password, and confirm password. Optional: display name.
3. Password rules: at least 8 characters, at least 1 number, and at least 1 symbol.
4. Submit. On success you are signed in and sent to the dashboard.

## Log in

1. Open **Log in**.
2. Enter the email and password for your account.
3. Submit. On success you reach the dashboard.
4. Invalid credentials show a generic error (email or password is not revealed separately).

## Dashboard (signed in)

- Navigation covers Dashboard, Workouts, Nutrition, Goals, and Profile.
- Summary cards are a shell for Capstone 2 totals.
- Use **Log out** in the header to end the session.

## Workouts / Nutrition / Goals

These pages explain that feature logging is planned for Capstone 2. Forms and lists will connect to the API routes documented in project planning docs.

## Profile

Shows the signed-in user’s email and display name (read-only in this version).

## Tips

- Keep the backend running while using the site; otherwise the home page reports the API offline and auth calls fail.
- Use a unique email per test account.
- Do not use real personal passwords on shared demo machines.
