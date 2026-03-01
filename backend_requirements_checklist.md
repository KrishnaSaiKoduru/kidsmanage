# KidsManage Backend — Requirements Checklist

All technical choices below have been pre-selected for the **free + easiest** option.
Your only job is to: create the accounts, paste the keys, and answer the business questions.

---

## Section 1: Services to Set Up (All Free Tiers)

### 1.1 Supabase — Auth + Database + Storage + Realtime
> **Free tier:** 500MB database, 1GB file storage, unlimited auth users, realtime included.
> **Setup time:** ~5 minutes at [supabase.com](https://supabase.com)

**Steps:**
1. Create a new project at supabase.com
2. Go to **Project Settings → API** and copy these three values:

| Key | Value |
|---|---|
| `SUPABASE_URL` | ? |
| `SUPABASE_ANON_KEY` | ? |
| `SUPABASE_SERVICE_ROLE_KEY` | ? *(keep this secret — backend only)* |

**Login options to enable** *(go to Authentication → Providers in Supabase dashboard):*
- [x] Email + Password — always on by default
- [ ] Google OAuth — do you want "Sign in with Google"? (yes/no)

---

### 1.2 Stripe — Payments
> **Free to set up.** No monthly fee. Stripe only charges 2.9% + 30¢ per transaction when money moves.
> **Setup time:** ~10 minutes at [stripe.com](https://stripe.com)

**Steps:**
1. Create a Stripe account
2. Go to **Developers → API Keys** and copy:

| Key | Value |
|---|---|
| `STRIPE_SECRET_KEY` | ? *(starts with `sk_test_` for testing)* |
| `STRIPE_PUBLISHABLE_KEY` | ? *(starts with `pk_test_` — safe for frontend)* |

> Note: Webhook secret is generated later when we deploy — skip for now.

**Decisions needed from you:**

**A) KidsManage SaaS pricing tiers** *(what centers pay to use your platform):*

| Tier | Monthly Price | Max Children | Max Staff |
|---|---|---|---|
| Free | $0 | ? | ? |
| Growth | $? | ? | ? |
| Pro | $? | Unlimited | Unlimited |

**B) Parent billing — how often are parents invoiced for childcare?**
- [ ] Weekly
- [ ] Bi-weekly (every 2 weeks)
- [ ] Monthly

**C) Late fees:**
- Grace period before late fee kicks in: ? days
- Late fee amount: $? flat OR ?% of invoice

> **Skipped for MVP:** ACH bank transfers (requires extra Stripe verification). Card payments only for now.

---

### 1.3 Resend — Transactional Email
> **Free tier:** 3,000 emails/month, 100/day — enough for early-stage.
> **Setup time:** ~5 minutes at [resend.com](https://resend.com)

**Steps:**
1. Create a Resend account
2. Go to **API Keys** and create one:

| Key | Value |
|---|---|
| `RESEND_API_KEY` | ? |

> **No custom domain needed to start.** Resend lets you send from their shared domain (`onboarding@resend.dev`) during development. You can verify your own domain later when you're ready to go live.

**Decision:** What name should emails appear to come from?
- From name: ? *(e.g., `KidsManage`)*
- Reply-to address: ? *(e.g., your personal email for now)*

---

### 1.4 Upstash Redis — Background Jobs
> **Free tier:** 10,000 requests/day, 256MB — enough for all job queues at early scale.
> **Setup time:** ~3 minutes at [upstash.com](https://upstash.com)

**Steps:**
1. Sign up at upstash.com → Create a Redis database → Select **Free** tier
2. Copy the connection URL:

| Key | Value |
|---|---|
| `REDIS_URL` | ? *(shown on the database page as "UPSTASH_REDIS_REST_URL")* |

---

### Skipped Services (can add later as paid features)

| Service | Why Skipped | When to Add |
|---|---|---|
| **Twilio (SMS)** | Paid after trial (~$0.0075/SMS). Not free. | When you want to charge centers for SMS alerts as a premium feature. |
| **OpenAI (AI copy)** | No free tier (~$0.002/request). | When you add a paid "Pro" plan where AI tools are a selling point. |

---

### 1.5 Analytics — PostHog + Microsoft Clarity + Google Analytics
> **All 100% free.** Three tools covering different angles: product behavior, session recordings, and traffic acquisition.

#### PostHog — Product Analytics (Most Important for SaaS)
> **Free tier:** 1M events/month. Tracks feature usage, funnels, user cohorts, and plan-tier behavior.
> **Setup time:** ~5 minutes at [posthog.com](https://posthog.com)

**Steps:**
1. Create a PostHog account → select **Cloud (US or EU)**
2. Copy your project API key:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | ? |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` (or EU if preferred) |

> **Why it matters for KidsManage:** Track which modules (Attendance, Billing, Messaging) centers actually use, identify onboarding drop-off points, and measure feature adoption per pricing tier.

---

#### Microsoft Clarity — Session Recordings + Heatmaps
> **Free forever, no event limits.** Records real user sessions and generates heatmaps. Pairs perfectly with PostHog.
> **Setup time:** ~3 minutes at [clarity.microsoft.com](https://clarity.microsoft.com)

**Steps:**
1. Sign in with a Microsoft account → Create a new project → Enter your site URL
2. Copy the Clarity tracking ID:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_CLARITY_ID` | ? *(e.g., `abc123xyz`)* |

> **Why it matters for KidsManage:** Watch exactly where center admins get confused during setup — enrollment forms, billing config, staff management. No guessing on UX issues.

---

#### Google Analytics 4 — Traffic + Acquisition
> **Free forever.** Tracks where your signups come from — organic search, ads, referrals, direct.
> **Setup time:** ~5 minutes at [analytics.google.com](https://analytics.google.com)

**Steps:**
1. Create a GA4 property → Add a web data stream for your domain
2. Copy the Measurement ID:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | ? *(starts with `G-`)* |

> **Why it matters for KidsManage:** Know which marketing channels bring paying centers. Essential once you start any outreach or SEO.

---

## Section 2: Hosting (Both Free)

### 2.1 Backend — Render
> **Free tier:** 750 hours/month (enough for 1 always-on service). Spins down after 15 min of inactivity on free tier — fine for development and demos.
> Upgrade to $7/month for always-on when going live.

- Nothing to set up yet. We deploy here after the backend is built.
- Just create an account at [render.com](https://render.com) when ready.

### 2.2 Frontend — Vercel
> **Free tier:** Unlimited deployments, custom domain support, automatic CI/CD from GitHub.

- Nothing to set up yet. We connect the GitHub repo to Vercel when ready.
- Just create an account at [vercel.com](https://vercel.com) when ready.

### 2.3 Domain
- [ ] Do you already have a domain? (e.g., `kidsmanage.com`) — yes / no
- [ ] If no — are you planning to buy one before going live? *(Cloudflare Domains is cheapest, ~$10/year)*
- For now during development, Render and Vercel both give free subdomains (e.g., `kidsmanage-api.onrender.com`)

---

## Section 3: Business Logic (Need Your Answers)

These affect the actual code — I can't make these decisions for you.

### 3.1 Is this multi-tenant from day one?
- [ ] **Yes — multiple centers sign up independently** *(true SaaS, different centers never see each other's data)*
- [ ] **No — build for one specific center first**, add multi-tenancy later

### 3.2 Target state for compliance ratios
Staff-to-child ratios are set by state law. Which state are you building for first?

- State: ?
- *(I'll look up the exact ratios for that state and hardcode them in. They'll be configurable later.)*

### 3.3 Enrollment form — extra fields
Beyond the basics (child name, DOB, parent contact, start date), do you need:
- [ ] Emergency contacts (name + phone)
- [ ] Authorized pickup list
- [ ] Doctor / pediatrician info
- [ ] Immunization record upload
- [ ] Allergies & dietary restrictions
- [ ] Any other custom field?

### 3.4 Daily activity log types
Staff can log entries for each child throughout the day. Check what you want:
- [x] Meal (what they ate, how much)
- [x] Nap (start/end time)
- [x] Lesson / Learning activity
- [x] Outdoor play
- [x] Photo
- [x] Incident report
- [x] General note
- [ ] Diaper change
- [ ] Medication administered (name, dose, time)
- [ ] Anything else?

**Should parents get a daily summary email?**
- [ ] Yes, opt-out by default (all parents get it unless they turn it off)
- [ ] No, opt-in only (parents turn it on if they want it)

### 3.5 Messaging rules
- [ ] Can staff message **any parent** at the center?
- [ ] Or only parents of children **in their assigned room**?
- [ ] Do you need **group/broadcast messages** to an entire room or all parents?

---

## Section 4: Technical Decisions (Pre-Selected)

No action needed — these are already decided for you based on simplicity:

| Decision | Choice | Why |
|---|---|---|
| Language | **TypeScript** | Works natively with Prisma, catches bugs early |
| Framework | **Express** | Most familiar, biggest community, easiest to learn |
| Repo structure | **Monorepo** | Frontend + backend in same `kidsmanage/` repo under separate folders |
| Package manager | **npm** | Already in use on the frontend |
| Database ORM | **Prisma** | Type-safe, auto-generates migrations, works perfectly with Supabase Postgres |

---

## Section 5: MVP — What to Build First

Pick your top **4 modules** to build in the first version. Authentication is always built first regardless.

| Module | Include in MVP? |
|---|---|
| Authentication (always first) | ✅ Yes |
| Center Management (settings, staff) | ? |
| Child Profiles | ? |
| Attendance (check-in/out, live dashboard) | ? |
| Billing (invoices, Stripe) | ? |
| Enrollment (application form, waitlist) | ? |
| Messaging (parent ↔ staff chat) | ? |
| Daily Activities (meal/nap/lesson logs) | ? |
| Notifications (in-app + email) | ? |
| Marketing (lead capture, website builder) | ? |

---

## What I Need Before Starting

Minimum to begin writing code:

| Item | Need |
|---|---|
| Supabase keys | Required |
| Stripe keys (test mode is fine) | Required |
| Resend API key | Required |
| Upstash Redis URL | Required |
| SaaS pricing tiers filled in | Required |
| Parent billing cycle chosen | Required |
| Target state for ratios | Required |
| MVP modules selected | Required |
| Google OAuth decision | Nice to have |
| PostHog API key | Nice to have (add before launch) |
| Microsoft Clarity ID | Nice to have (add before launch) |
| Google Analytics Measurement ID | Nice to have (add before launch) |
| Domain (if any) | Not urgent |

---

*Once these are filled in, I scaffold the full backend — Prisma schema, all API routes, middleware, auth, job queues — in one session.*
