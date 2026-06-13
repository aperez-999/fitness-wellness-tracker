# Wireframes & Page Layout

Sprint 1 (User Story #3) and Sprint 2 (User Story #10). Text wireframes for dashboard, navigation, and profile until visual assets are added.

## Global Navigation (authenticated)

```
┌─────────────────────────────────────────────────────────────┐
│  Fitness & Wellness Tracker          [Profile] [Logout]    │
├─────────────────────────────────────────────────────────────┤
│  Dashboard │ Workouts │ Nutrition │ Goals │ Profile         │
├─────────────────────────────────────────────────────────────┤
│                     < main content >                        │
└─────────────────────────────────────────────────────────────┘
```

- Navigation stays visible on desktop; collapses to a mobile menu on small screens.
- Active section is highlighted.
- Logout is always reachable from the header.

## Login Page

```
┌──────────────────────────┐
│   Fitness & Wellness     │
│                          │
│   Email    [__________]  │
│   Password [__________]  │
│                          │
│   [ Log In ]             │
│                          │
│   No account? Sign up    │
└──────────────────────────┘
```

## Sign Up Page

```
┌──────────────────────────┐
│   Create Account         │
│                          │
│   Email         [____]   │
│   Password      [____]   │
│   Confirm Pass  [____]   │
│                          │
│   [ Sign Up ]            │
│                          │
│   Already have account?  │
│   Log in                 │
└──────────────────────────┘
```

## Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  Welcome back, {name}                                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  Workouts   │ │  Nutrition  │ │   Goals     │           │
│  │  summary    │ │  summary    │ │  progress   │           │
│  │  (placeholder)│ │ (placeholder)│ │ (placeholder)│         │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│  Recent activity (future)                                   │
│  ─────────────────────────────────────                      │
│  No entries yet — start from Workouts or Nutrition.        │
└─────────────────────────────────────────────────────────────┘
```

**MVP sections:** quick links to Workouts, Nutrition, Goals; placeholder stats until data exists.

## Workouts Page (placeholder in starter)

```
┌─────────────────────────────────────────────────────────────┐
│  Workouts                          [ + Add Workout ] (later)│
├─────────────────────────────────────────────────────────────┤
│  Your workout log will appear here.                         │
│  Feature coming in a future sprint.                         │
└─────────────────────────────────────────────────────────────┘
```

## Nutrition Page (placeholder in starter)

```
┌─────────────────────────────────────────────────────────────┐
│  Nutrition                         [ + Add Entry ] (later)  │
├─────────────────────────────────────────────────────────────┤
│  Track meals and calories here.                             │
│  Feature coming in a future sprint.                         │
└─────────────────────────────────────────────────────────────┘
```

## Goals Page (placeholder in starter)

```
┌─────────────────────────────────────────────────────────────┐
│  Goals                             [ + New Goal ] (later)   │
├─────────────────────────────────────────────────────────────┤
│  Set and monitor wellness goals.                            │
│  Feature coming in a future sprint.                         │
└─────────────────────────────────────────────────────────────┘
```

## Profile Page

```
┌─────────────────────────────────────────────────────────────┐
│  Profile                                                    │
├─────────────────────────────────────────────────────────────┤
│  Email:     user@example.com                                │
│  Name:      (optional display name)                         │
│                                                             │
│  Account settings and editing — future sprint.              │
└─────────────────────────────────────────────────────────────┘
```

## Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| Desktop (≥1024px) | Horizontal nav, three-column dashboard cards |
| Tablet (768–1023px) | Horizontal nav, two-column cards |
| Mobile (<768px) | Hamburger nav, single-column stack |

## Design Principles

- Usability and simplicity over visual complexity (Sprint 1 grooming).
- Consistent spacing, typography, and card layout across pages (Sprint 2 daily scrum feedback).
- Tailwind CSS for utility-first styling in the implementation template.
