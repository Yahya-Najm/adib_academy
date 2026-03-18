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
npm run db:push --accept-data-loss  # when adding unique constraints to existing data
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

## Seed / Dev credentials

Run `npx prisma db seed` to create the GM account:
- Email: `gm@adibacademy.com` / Password: `admin123`

## Architecture

### Auth flow
- `auth.ts` — NextAuth config (credentials provider, jwt/session callbacks)
- `auth.config.ts` — edge-compatible config used by the proxy; contains the `authorized` callback for role-based route protection
- `proxy.ts` — **Next.js 16 uses `proxy.ts`, not `middleware.ts`**; protects `/general-manager`, `/manager`, `/teacher` routes
- `app/login/page.tsx` → on success → `app/dashboard/page.tsx` → redirects by role
- `components/Providers.tsx` — wraps root layout with `SessionProvider`
- `types/next-auth.d.ts` — extends `Session` and `JWT` with `role`, `id`, `branchId`

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

### Server actions pattern
All mutations and data fetches happen in `actions/` folders co-located with each role's directory.
Every action calls a `guard.ts` helper first (`requireGM()` / `requireManager()` / `requireTeacher()`),
which calls `auth()` and throws `"Unauthorized"` if the role doesn't match.
Server action files are marked `"use server"` at the top.

### Data model — key relationships

```
Branch
├── CourseTemplate (branchId=null means global/all-branches)
│   └── CourseClass  (created by a Manager; scoped to one Branch)
│       ├── ClassSection[]  (one per template.numSections; each has one Teacher)
│       │   └── TeacherAttendance[]  (per section per date; has isLate)
│       ├── ClassHoliday[]  (manager-set one-off holidays for this class)
│       ├── Exam[]
│       │   └── ExamScore[]  (@@unique on [examId, studentId])
│       ├── StudentAttendance[]  (has isLate)
│       └── CourseEnrollment[]  (per Student)
│           └── MonthlyPayment[]  (one per month × durationMonths)
├── Product[]
│   └── ProductSale[]
├── Transaction[]
├── OfficialHoliday[]  (branchId=null means applies to all branches)
├── WeeklyHoliday[]    (branchId=null means applies to all branches; recurring by dayOfWeek)
├── StaffAttendance[]  (daily present/absent/late for STAFF role users)
├── AttendanceReport[] (auto + manual reports for STAFF/TEACHER/STUDENT/CLASS)
└── AttendanceFinalization[]  (@@unique on [date, branchId, finalizationType, scopeId] — per-scope lock)
```

- A **Manager** can only see/edit records where `branchId = session.user.branchId`.
- **GM** sees all branches.
- A **CourseTemplate** defines `numSections` — when a Manager creates a class, they must assign exactly that many `ClassSection` rows with a teacher each.
- **Students** are branch-scoped, have an auto-generated `studentId` (e.g. `ali-hassan-3f2a`), and link to enrollments which generate `MonthlyPayment` rows.

### MonthlyPayment fields
- `status`: `PENDING | PAID | PARTIAL | OVERDUE`
- `paidAmount`: running total of all installments collected for this month (accumulates across multiple `recordPayment` calls)
- `feesRefId`: **required** receipt/reference string on every payment — used for finance summaries
- `discounted`: boolean flag for "time passed discount" — forces `PAID` status regardless of `paidAmount`; allows $0 new installment
- `fromDate`: set on month 1 only, for mid-month join tracking

### recordPayment logic
`recordPayment(paymentId, { amount, feesRefId, discounted?, paidAt? })`:
- `amount` = the installment being paid **now** (not the total)
- `newTotal = payment.paidAmount + amount`
- Cap enforced for all cases: `newTotal > payment.amount` → error
- `discounted=true` → saves `newTotal`, forces `status=PAID` (allows `amount=0` to discount remaining balance)
- Otherwise: `PAID` if `newTotal >= payment.amount`, else `PARTIAL`

### Attendance system

**Holiday hierarchy** — checked in this order before allowing attendance writes:
1. `WeeklyHoliday` — GM-set recurring day (e.g. every Friday), global or per branch
2. `OfficialHoliday` — GM-set one-off date, global or per branch
3. `CourseClass.offDays[]` — manager-set recurring weekday for a specific class (student/teacher tabs only)
4. `ClassHoliday` — manager-set one-off date for a specific class with a reason

All four sources display as `"Holiday — [reason]"` instead of present/absent toggles. Server actions validate and throw on blocked dates.

**AttendanceFinalization** — once a manager calls `finalizeDay(date)`, a `@@unique([date, branchId])` row is created and all attendance writes for that date+branch are blocked. Reports remain addable after finalization.

**AttendanceReport** fields:
- `subjectType`: `"STAFF" | "TEACHER" | "STUDENT" | "CLASS"`
- `subjectId`: userId for STAFF/TEACHER, studentId for STUDENT, courseClassId for CLASS
- `isAutomatic`: true = auto-created when marking Absent or Late (cleaned up if toggled back)
- `reportType`: `"ABSENT"` | `"LATE"` for auto; free-text category for manual
- `content`: optional for auto, required for manual

**Attendance pages** live at `/manager/attendance/{staff,teachers,students}`. Each loads context via a single server action (`getStaffAttendanceContext`, `getTeacherAttendanceContext`, `getStudentAttendanceContext`) that returns staff/classes, existing records, reports (with `manager` relation included), holiday label, and finalization status for the selected date.

**Teacher attendance** is per `ClassSection` (not per teacher per day) — a teacher teaching 3 sections has 3 independent attendance rows on a given day.

### Reports
- Written from `/manager/reports` (standalone) or inline from attendance pages via `ReportPanel` component (`app/manager/attendance/components/ReportPanel.tsx`)
- `components/reports/ReportsSection.tsx` — shared read-only display used in student/user profile pages
- Report counts surface on the Manager dashboard (branch-scoped) and GM dashboard (all branches, with per-branch breakdown)
- Reports appear in: student profile (`/manager/students/[id]`, `/general-manager/students/[id]`); staff profile (`/manager/staff/[id]`, `/general-manager/staff/[id]`); teacher profile (`/manager/teachers/[id]`, `/general-manager/teachers/[id]`); class detail page

### Exam system
- `Exam.examType`: `REGULAR | FINAL` — only one FINAL allowed per class
- `Exam.classMonth`: auto-computed month-of-class the exam date falls in
- `Exam.proctorId`: optional teacher/manager who supervised
- `Exam.scoringFinalized`: locks score edits; set via `finalizeExamScoring(examId)`
- `upsertExamScore` and exam mutations are blocked once `scoringFinalized=true` or class is `COMPLETED`
- `markClassCompleted`: requires a FINAL exam with finalized scoring AND all months finalized
- Exam notifications: exams within 3 days OR past with unfinalized scoring surface on dashboards

### ClassMonthFinalization
`@@unique([courseClassId, monthNumber])` — locks a class month.
- `sectionsSnapshot` (Json): teacher-per-section at finalization time
- `studentsSnapshot` (Json): enrolled students at finalization time
- GM-only unlock: `unlockClassMonth(courseClassId, monthNumber)` deletes the record

### AttendanceFinalization (granular)
`@@unique([date, branchId, finalizationType, scopeId])` — per-scope, not branch-wide.
- `finalizationType`: `"STAFF" | "TEACHER" | "CLASS"`
- `scopeId`: userId for STAFF/TEACHER, courseClassId for CLASS
- Context actions return `finalizedStaffIds[]`, `finalizedTeacherIds[]`, `finalizedClassIds[]`

### Report kinds
`AttendanceReport.reportKind`: `SIMPLE | ACTIONABLE`
- `SIMPLE`: note/observation; no follow-up needed
- `ACTIONABLE`: has `actionDescription`, `isDone` (false→true), `doneAt`, `doneById`
- `markReportDone` / `markReportDoneGM` toggle `isDone`
- Manager Reports page has three tabs: Browse | Write Report | Actions (pending actionable count badge)
- GM Reports page: Browse (cross-branch with branch badge) | Actions tab

### GM unlock actions (`app/general-manager/actions/classes.ts`)
- `reopenClass(courseClassId)`: COMPLETED → ACTIVE
- `unlockClassMonth(courseClassId, monthNumber)`: deletes `ClassMonthFinalization` record
- `unlockExamScoring(examId)`: resets `scoringFinalized` to false

### User model
Roles: `GENERAL_MANAGER | MANAGER | TEACHER | STAFF`
`STAFF` users (cleaner, cook, etc.) have a `staffType` string and no dashboard.
The General Manager creates all users and sets their passwords (`bcryptjs` hashed).

All non-GM users get a slug-style `userId` (e.g. `john-doe-a4f2`) generated by `lib/generateUserId.ts`.
Students have a separate `studentId` field on the `Student` model (same slug format).

Teacher payment types: `PER_CLASS` (fixed rate) or `REVENUE_PERCENTAGE` (% of student fees).
Manager/Staff payment type: `MONTHLY_SALARY`.

### Design conventions
- White background (`bg-white`) for all pages; `bg-gray-50` for page content area
- Cards: `bg-white border border-gray-200 rounded-xl shadow-sm`
- Dark/gray only for accents and active states
- Accent colors: orange (GM), teal (Manager), gray (Teacher)
- Status badge colors: green=PAID, yellow=PENDING, red=OVERDUE, orange=PARTIAL
- Exam colors: purple=Final, blue=Regular
- Actionable report: orange=pending, gray=done
- Client pages call server actions via `useTransition` (never `useState` + direct async call)
