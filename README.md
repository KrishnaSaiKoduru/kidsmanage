# 🧸 KidsManage

> A modern, full-stack SaaS platform for childcare center management — built for admins, caretakers, and parents.

---

## 🏗️ Architecture

```
kidsmanage/
├── backend/          # Node.js + Express + TypeScript API
│   ├── prisma/       # PostgreSQL schema & migrations (via Prisma ORM)
│   └── src/
│       ├── middleware/   # Auth, rate limiting, tenant isolation, role guards
│       └── modules/      # Feature modules (activities, attendance, billing, …)
└── frontend/         # React + Vite + Tailwind CSS SPA
    └── src/
        ├── components/   # Page views (one per portal tab)
        ├── context/      # Auth & Toast providers
        └── lib/          # API client, Supabase SDK
```

**Stack:**
| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (hosted on Supabase) |
| Auth | Supabase Auth (JWT) |
| ORM | Prisma |
| Payments | Stripe |
| Email | Resend |

**Multi-tenancy:** Every resource is scoped to a `centerId` — completely isolated between childcare centers. Role-based access (ADMIN / CARETAKER / PARENT) enforced via middleware on every route.

---

## ✨ Features & Tabs

### 🏠 Dashboard
Central overview for admins and caretakers. Shows today's attendance summary, recent activity, billing alerts, and quick-action shortcuts. Stats update in real-time as data changes throughout the day.

### 📅 Daily Activities
Schedule and track daily activities (Education, Physical, Creative, Music) with full per-student completion tracking.

- **Caretakers/Admins:** See all enrolled children per activity, toggle individual Done/Pending status, or use **Mark All Done** with one click. A circular progress ring shows completion % at a glance. Navigate to any past or future date using the mini calendar or prev/next arrows.
- **Parents:** View their child's activity completion status for any day. Multi-child families can switch between children with a tab selector.

### 🕐 Attendance
Digital check-in/check-out for enrolled children. Supports manual, PIN, and QR code methods. Tracks daily presence with timestamps and generates daily attendance summaries. Admins can view historical records for any date.

### 👶 Enrollment
End-to-end digital enrollment workflow. Parents submit applications online; admins review, approve, or waitlist them. Enrolled children get full profiles with room assignment, allergies, emergency contacts, and linked parent accounts.

### 💳 Billing
Full invoicing system with Stripe integration.
- Auto-generate invoices per child/family
- Line-item support (tuition, fees, supplies)
- Tax calculation with configurable rate per center
- Late fee automation with grace period settings
- Track payment status: Draft → Sent → Paid / Overdue
- Stripe-powered online payments (credit card / ACH)

### 💬 Messages
Real-time group and direct messaging between staff and parents. Conversation threads are scoped per center. Unread message count shown in the portal nav badge.

### 🔔 Notifications
In-app notification system. Admins receive automatic alerts for key events (invite accepted, new enrollment application, etc.). Notification bell with unread count in the header; mark-as-read support.

### ⚙️ Settings
- **Center Settings:** Update center name, address, phone, tax rate, join code
- **Staff Management:** Invite admins/caretakers via email; view active staff list
- **Profile:** Update personal info, emergency contacts, authorized pickups, certifications
- **Billing Plan:** View and upgrade subscription tier (Free / Starter / Professional / Enterprise)

---

## 🔑 User Roles

| Role | Access |
|---|---|
| **ADMIN** | Full access — manage center, staff, children, billing, settings |
| **CARETAKER** | Attendance, activities (mark completions), children profiles, messages |
| **PARENT** | View their child's activities & completion status, messages, billing |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL (or a Supabase project)
- Stripe account (for billing)
- Resend account (for emails)

### Backend
```bash
cd backend
cp .env.example .env   # Fill in DATABASE_URL, SUPABASE_*, STRIPE_*, RESEND_API_KEY
npm install
npx prisma db push
npx ts-node-dev --respawn src/index.ts
```

### Frontend
```bash
cd frontend
cp .env.example .env   # Set VITE_API_URL and VITE_SUPABASE_*
npm install
npm run dev
```

### Onboarding Flow
1. Sign up as **Admin** → creates a new center + join code
2. Share the join code with parents & caretakers
3. Parents/caretakers sign up using the join code → auto-linked to your center

---

## 📁 Environment Variables

**Backend `.env`**
```
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
FRONTEND_URL=
```

**Frontend `.env`**
```
VITE_API_URL=http://localhost:3001/api
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

*Built with ❤️ for childcare professionals.*
