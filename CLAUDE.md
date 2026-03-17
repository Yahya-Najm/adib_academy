# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Dev
npm run dev

# Database (requires Docker running)
docker compose up -d          # start Postgres on port 5433
npm run db:generate            # regenerate Prisma client
npm run db:push                # push schema to DB (dev only)
npm run db:studio              # open Prisma Studio

# Build / lint
npm run build
npm run lint
```

## Stack

- **Next.js 16** — App Router
- **React 19**, **TypeScript**, **Tailwind CSS v4**
- **Prisma 7** + **PostgreSQL** (Docker on port 5433)
- **Auth.js v5** (`next-auth@beta`) — credentials-based, JWT sessions

## Architecture

### Auth flow
- `auth.ts` — NextAuth config (credentials provider, jwt/session callbacks)
- `middleware.ts` — protects `/general-manager`, `/manager`, `/teacher` routes; enforces role-based access
- `app/login/page.tsx` → on success → `app/dashboard/page.tsx` → redirects by role
- `components/Providers.tsx` — wraps root layout with `SessionProvider`
- `types/next-auth.d.ts` — extends `Session` and `JWT` with `role` and `id`

### Dashboard layout system
Each role has its own directory with a `layout.tsx` that feeds nav items into the shared
`components/dashboard/DashboardLayout.tsx` (client component — handles active link state, sign-out).
To add a new page to a dashboard, add a route and append to that role's `nav` array in its `layout.tsx`.

```
app/
├── general-manager/   layout.tsx (orange accent) + subpages
├── manager/           layout.tsx (teal accent)   + subpages
└── teacher/           layout.tsx (dark accent)   + subpages
```

### User model
Roles: `GENERAL_MANAGER | MANAGER | TEACHER | STAFF`
`STAFF` users (cleaner, cook, etc.) have a `staffType` string and no dashboard.
The General Manager creates all users and sets their passwords (`bcryptjs` hashed).

### Design conventions
- White background (`bg-white`) for all pages; `bg-gray-50` for page content area
- Dark/gray only for accents and active states
- Accent colors: orange (GM), teal (Manager), gray (Teacher)
