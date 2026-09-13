# Project Documentation — Fitness & Wellness Tracker

**Course:** CIS3950 Capstone I  
**Team:** Alejandro Perez (Team Lead / Product Owner), Ahanaf Akif, Josue Gamon Fortes, Allen Cruz  
**Project short name:** fitness-wellness-tracker

## 1. Overview

Fitness & Wellness Tracker is a web application for users to track workouts, nutrition, and wellness goals. Capstone 1 delivered planning artifacts, scrum minutes, architecture/API/database documentation, and a runnable starter with authentication. Capstone 2 will implement feature CRUD and dashboard summaries.

## 2. Goals

- Secure accounts (signup, login, logout, session).
- User-scoped workout, nutrition, and goal data.
- Simple dashboard navigation on desktop and mobile web.

## 3. Technology stack

| Layer | Choice |
|-------|--------|
| Web site | React, Vite, Tailwind CSS, React Router |
| API | Node.js, Express |
| Database | MongoDB + Mongoose |
| Auth | JWT Bearer tokens, bcrypt password hashes |

## 4. System design (summary)

Three-tier layout: React client → Express REST API → MongoDB. Protected routes use auth middleware; Mongoose models define User, Workout, NutritionLog, and Goal. Detailed diagrams and contracts are in `Documents/Planning/`.

## 5. Capstone 1 deliverables status

| Area | Status |
|------|--------|
| Scrum minutes (dated) | Included under `Documents/Scrum_Minutes/` |
| Planning docs / diagrams | Included under `Documents/Planning/` |
| Starter API + WebSite | Included under `Code/` |
| Authentication | Implemented in starter |
| Workout / nutrition / goals UI | Placeholder pages (Capstone 2) |
| Showcase poster | Included under `Posters/` |

## 6. Repository / ZIP layout

- `Code/` — source, WebSite, Database sample, Installation Guide, User Manual  
- `Documents/` — this Project Documentation, scrum minutes, planning, shortcomings/wishlist  
- `Posters/` — final poster copies for the team  

## 7. Appendices (related documents)

| Document | Location |
|----------|----------|
| Installation Guide | `Code/Installation-Guide.md` (screenshots in `Code/Installation-screenshots/`) |
| User Manual | `Code/User-Manual.md` |
| Shortcomings / Wishlist | `Documents/Shortcomings-Wishlist.md` |
| Planning set (stories, API, schema, wireframes, journeys, roadmap) | `Documents/Planning/` |
| Daily / ceremony scrum minutes | `Documents/Scrum_Minutes/` |
| Database schema overview | `Code/Database/` |
