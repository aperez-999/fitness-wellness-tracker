# Capstone 1 submission checklist

Team: Alejandro Perez (Team Leader), Ahanaf Akif, Josue Gamon Fortes, Allen Cruz  
Course: CIS 3950

## What the syllabus requires

The lite ZIP must include:

```
fitness-wellness-tracker.zip
└── Documents/
    └── Scrum_Minutes/
        └── (all ceremony + daily scrum minutes, named by date)
```

Alejandro submits on Canvas. ZIP name: **fitness-wellness-tracker.zip**.

Code, docs, and poster copy are **optional practice** — encouraged but not graded for Capstone 1.

## Where our minutes are right now

We keep PDFs in `meeting-minutes/` organized by sprint (`sprint-1/` through `sprint-5/`). That is how we have been adding them during the semester.

**After Sprint 5 ends** we will copy everything into `Documents/Scrum_Minutes/` with one filename per date (no two meetings sharing the same date) for the final ZIP.

Sprint 5 status: daily scrums 1–5 done, daily 6–10 plus review and retro still to add.

## Optional practice in this repo

We included these to help us in Capstone 2:

- README and `docs/` planning files
- `diagrams/` (architecture, workflows, ERD)
- `backend/` and `frontend/` starter (auth works, feature pages are placeholders)

## Before submitting

- [ ] Sprint 5 finished (daily 6–10, review, retro PDFs added)
- [ ] `Documents/Scrum_Minutes/` built from `meeting-minutes/` with date-based names
- [ ] ZIP named `fitness-wellness-tracker.zip`
- [ ] No `.env` files or real passwords in the ZIP
- [ ] [installation-guide.md](./installation-guide.md) tested on another machine if we include code

```bash
git ls-files '*.env' | grep -v example   # should print nothing
```

## Capstone 2

We are not implementing workouts/nutrition/goals until next semester. See [capstone-2-handoff.md](./capstone-2-handoff.md).
