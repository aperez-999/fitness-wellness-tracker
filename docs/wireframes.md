# Wireframes & Page Layout

Sprint 1 (User Story #3), Sprint 2 (User Story #10), and Sprint 3 (User Story #17). Text wireframes for all MVP pages.

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

## Workouts Page

```
┌─────────────────────────────────────────────────────────────┐
│  Workouts                              [ + Add Workout ]    │
├─────────────────────────────────────────────────────────────┤
│  Filter: [ This week ▼ ]                                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Morning Run          Mar 10, 2026      30 min       │   │
│  │ Notes: Easy pace                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Upper Body           Mar 8, 2026       45 min       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  (Empty state: "No workouts yet. Add your first session.")  │
└─────────────────────────────────────────────────────────────┘
```

### Add Workout form (modal or inline panel)

```
┌──────────────────────────────┐
│  Add Workout                 │
│  Name      [______________]  │
│  Date      [____/____/____]  │
│  Duration  [___] minutes     │
│  Notes     [______________]  │
│            [______________]  │
│  [ Cancel ]  [ Save ]        │
└──────────────────────────────┘
```

**Fields:** name (required), date (required), durationMinutes (optional), notes (optional).

## Nutrition Page

```
┌─────────────────────────────────────────────────────────────┐
│  Nutrition                             [ + Add Entry ]      │
├─────────────────────────────────────────────────────────────┤
│  Today’s calories: 1,240 / —                                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Oatmeal + banana     Breakfast    320 cal           │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Chicken salad        Lunch        520 cal           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  (Empty state: "No entries for this day.")                  │
└─────────────────────────────────────────────────────────────┘
```

### Add Nutrition Entry form

```
┌──────────────────────────────┐
│  Add Food Entry              │
│  Food      [______________]  │
│  Calories  [___]             │
│  Meal      [ Breakfast ▼ ]   │
│  Date      [____/____/____]  │
│  [ Cancel ]  [ Save ]        │
└──────────────────────────────┘
```

**Fields:** foodName (required), calories (optional), mealType (enum), date (required).

## Goals Page

```
┌─────────────────────────────────────────────────────────────┐
│  Goals                                 [ + New Goal ]       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Work out 3x per week          Wellness              │   │
│  │ ████████░░░░  2 / 3                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Stay under 2,000 cal daily    Nutrition             │   │
│  │ ██████░░░░░░  1,240 / 2,000 cal                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### New Goal form

```
┌──────────────────────────────┐
│  New Goal                    │
│  Title     [______________]  │
│  Category  [ Workout ▼ ]     │
│  Target    [___]  [ lbs ▼ ]  │
│  By date   [____/____/____]  │
│  [ Cancel ]  [ Save ]        │
└──────────────────────────────┘
```

## Workouts Page (starter placeholder — pre-implementation)

```
┌─────────────────────────────────────────────────────────────┐
│  Workouts                          [ + Add Workout ] (later)│
├─────────────────────────────────────────────────────────────┤
│  Your workout log will appear here.                         │
│  Feature coming in a future sprint.                         │
└─────────────────────────────────────────────────────────────┘
```

## Nutrition Page (starter placeholder — pre-implementation)

```
┌─────────────────────────────────────────────────────────────┐
│  Nutrition                         [ + Add Entry ] (later)  │
├─────────────────────────────────────────────────────────────┤
│  Track meals and calories here.                             │
│  Feature coming in a future sprint.                         │
└─────────────────────────────────────────────────────────────┘
```

## Goals Page (starter placeholder — pre-implementation)

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
