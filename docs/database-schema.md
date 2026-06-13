# Database Schema

Companion to [diagrams/database-erd.md](../diagrams/database-erd.md). Sprint 1 User Story #4 and Sprint 2 User Story #11.

## Technology

- **Database:** MongoDB
- **ODM:** Mongoose (Node.js)

## Collections

### users

| Field | Type | Constraints |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `email` | String | Required, unique, lowercase, trimmed |
| `passwordHash` | String | Required |
| `displayName` | String | Optional |
| `createdAt` | Date | Default: now |
| `updatedAt` | Date | Auto-updated |

**Indexes:** `{ email: 1 }` unique

### workouts

| Field | Type | Constraints |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `userId` | ObjectId | Required, ref: `User` |
| `name` | String | Required |
| `date` | Date | Required |
| `durationMinutes` | Number | Optional, min 0 |
| `notes` | String | Optional |
| `createdAt` | Date | Default: now |

**Indexes:** `{ userId: 1, date: -1 }`

### nutrition_logs

| Field | Type | Constraints |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `userId` | ObjectId | Required, ref: `User` |
| `foodName` | String | Required |
| `calories` | Number | Optional, min 0 |
| `date` | Date | Required |
| `mealType` | String | Enum: breakfast, lunch, dinner, snack |
| `createdAt` | Date | Default: now |

**Indexes:** `{ userId: 1, date: -1 }`

### goals

| Field | Type | Constraints |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `userId` | ObjectId | Required, ref: `User` |
| `title` | String | Required |
| `category` | String | Enum: workout, nutrition, wellness |
| `targetValue` | Number | Optional |
| `currentValue` | Number | Default: 0 |
| `unit` | String | Optional |
| `targetDate` | Date | Optional |
| `createdAt` | Date | Default: now |
| `updatedAt` | Date | Auto-updated |

**Indexes:** `{ userId: 1, createdAt: -1 }`

## Data Access Rules

- All queries for workouts, nutrition logs, and goals MUST filter by the authenticated user's `userId`.
- Users can only read and write their own records (enforced in API layer; future: MongoDB field-level rules if needed).

## Sample Documents

```json
{
  "email": "alex@example.com",
  "displayName": "Alex",
  "createdAt": "2026-03-01T12:00:00.000Z"
}
```

```json
{
  "userId": "665a1b2c3d4e5f6789012345",
  "name": "Morning Run",
  "date": "2026-03-10T08:00:00.000Z",
  "durationMinutes": 30,
  "notes": "Easy pace"
}
```

## Migration Strategy

- Mongoose schemas versioned in `backend/src/models/`.
- Schema changes documented in this file and ERD when fields are added.
- No automatic migrations in MVP; manual coordination for team demos.
