# Fitness & Wellness Tracker

## Sprint 1 Project Specification (Capstone 2)

---

# Project Overview

The Fitness & Wellness Tracker is a web application designed to help college students manage workouts and monitor fitness progress from a single platform.

Rather than requiring users to switch between multiple applications, the system centralizes workout information and presents meaningful progress through a unified dashboard.

Sprint 1 focuses on building a working walking skeleton that validates the application's core functionality.

---

# Sprint 1 Objective

Develop a working end-to-end workflow that allows a user to:

- Authenticate
- Log a workout
- Store workout data
- View updated progress

The objective is to prove that the application's complete technical architecture functions correctly.

---

# Functional Requirements

### FR-1 — User Authentication

The system shall allow registered users to securely log into the application.

---

### FR-2 — Workout Tracking

The system shall allow authenticated users to record workout information.

---

### FR-3 — Workout Storage

The system shall store workout data within the application's database.

---

### FR-4 — Progress Dashboard

The system shall display recently logged workouts and provide immediate feedback that the workout has been successfully recorded.

---

# Non-Functional Requirements

- Responsive web interface
- Secure authentication
- RESTful API communication
- Database persistence
- Clean and maintainable codebase
- Version-controlled using GitHub

---

# Walking Skeleton

Sprint 1 delivers the minimum vertical slice required to demonstrate the application's architecture.

```
User Login
      ↓
Workout Entry
      ↓
Backend API
      ↓
Database
      ↓
Progress Dashboard
```

---

# Verification Plan

| Requirement | Verification Method |
|-------------|---------------------|
| FR-1 | User successfully authenticates |
| FR-2 | Workout submission succeeds |
| FR-3 | Workout appears in database |
| FR-4 | Dashboard updates after workout submission |

---

# Out of Scope

The following features are intentionally excluded from Sprint 1:

- Nutrition tracking
- AI recommendations
- Wearable device integration
- Social features
- Push notifications
- Premium subscriptions

These features remain in the Product Backlog for future sprints.

---

# Definition of Done

A Sprint 1 story is considered complete when:

- Functionality has been implemented.
- Code has been reviewed.
- Testing has been completed.
- Documentation has been updated.
- Changes have been committed to GitHub.
- The Product Owner approves the completed work.