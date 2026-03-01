# KidsManage Backend Proposal

## Objective

Transition the KidsManage frontend prototype into a production-grade, multi-tenant SaaS platform for daycare centers and preschools. This document defines the full backend architecture, API surface, database schema, and third-party integrations required to power every feature visible in the portal: attendance, billing, enrollment, messaging, daily activities, and marketing.

---

## 1. Architecture Design

The system follows a **multi-tenant, service-oriented** architecture where each childcare center is an isolated tenant sharing the same infrastructure.

- **Frontend (React + Vite):** The existing portal UI. Communicates exclusively with the REST API and real-time WebSocket layer. No secrets are exposed here.
- **Backend (Node.js + Express or Fastify):** A single monolithic API server split into domain modules. Each module owns its routes, service logic, and database access. Scales horizontally behind a load balancer.
- **Database (PostgreSQL + Prisma):** Relational data store. All tenant data is scoped by `centerId` (row-level multi-tenancy). Prisma handles migrations and type-safe queries.
- **Authentication (Supabase Auth):** Handles sign-up, login, OAuth (Google), JWT issuance, and session management for all user roles.
- **Real-Time Layer (Supabase Realtime or Socket.io):** Powers the live two-way messaging module and live attendance dashboard updates.
- **File Storage (Supabase Storage or AWS S3):** Stores child photos, parent-uploaded documents, daily activity photos/videos, and e-signature records.
- **Email Delivery (Resend API):** Transactional emails — invoice reminders, enrollment confirmations, late fee notices, and daily activity digests.
- **Payments (Stripe):** Subscription billing for center owners (SaaS fees) and parent payment collection (invoices via Credit Card and ACH).
- **Background Jobs (BullMQ + Redis):** Processes async tasks — sending overdue invoice reminders, generating compliance reports, dispatching daily activity digests, and bulk enrollment notifications.
- **SMS Notifications (Twilio):** Emergency alerts and urgent check-in/out notifications sent to parent phone numbers.
- **AI Features (OpenAI API):** Powers the AI-assisted website builder and marketing copy generator in the Marketing module.

---

## 2. User Roles

The platform has three distinct user roles, each with different API access scopes:

| Role | Description |
|---|---|
| `SUPER_ADMIN` | Platform owner. Can manage all centers and billing plans. |
| `CENTER_DIRECTOR` | Owns or manages a single center. Full access to all modules for their center. |
| `STAFF` | Teachers and staff. Can log attendance, post activities, and message parents. Read-only on billing. |
| `PARENT` | Parents of enrolled children. Can view their child's records, pay invoices, message staff, and manage their account. |

All JWTs issued by Supabase Auth carry a `role` and `centerId` claim. The API enforces role-based access control (RBAC) on every endpoint.

---

## 3. Feature Modules & API Design

### Module 1: Authentication & User Management

Handles all sign-up, login, and profile management flows.

**Endpoints:**
```
POST   /api/auth/register           - Register a new center (creates Center + Director account)
POST   /api/auth/invite             - Director invites a staff member or parent by email
POST   /api/auth/accept-invite      - Invited user sets their password and activates account
GET    /api/auth/me                 - Get current user's profile and role
PATCH  /api/auth/me                 - Update name, phone, profile photo
DELETE /api/auth/me                 - Deactivate own account
```

**Notes:**
- All sensitive auth operations (password reset, email verification) are delegated entirely to Supabase Auth — the backend never handles raw passwords.
- Invitation tokens are single-use JWTs with a 48-hour expiry.

---

### Module 2: Center Management

Manages the childcare center's settings, staff roster, compliance configuration, and capacity limits.

**Endpoints:**
```
GET    /api/center                  - Get center profile and settings
PATCH  /api/center                  - Update name, address, license number, capacity
GET    /api/center/staff            - List all staff members with roles
PATCH  /api/center/staff/:userId    - Update a staff member's role or status
DELETE /api/center/staff/:userId    - Deactivate a staff member
GET    /api/center/compliance       - Get current staff-to-child ratio status
GET    /api/center/reports          - Generate and download compliance reports (PDF)
```

**Notes:**
- Reports are generated asynchronously via BullMQ and emailed to the director when ready.
- Compliance ratios are enforced per state regulation (configurable per center).

---

### Module 3: Child Profiles

Stores all records associated with an enrolled child.

**Endpoints:**
```
GET    /api/children                - List all children at the center (with filters: room, age group)
POST   /api/children                - Create a new child profile (linked to parents)
GET    /api/children/:id            - Get a single child's full profile
PATCH  /api/children/:id            - Update allergies, emergency contacts, medical notes
DELETE /api/children/:id            - Archive a child profile
GET    /api/children/:id/documents  - List uploaded documents for a child
POST   /api/children/:id/documents  - Upload a document (immunization record, signed forms)
```

**Notes:**
- All documents are stored encrypted in Supabase Storage.
- Parents linked to a child can only read their own child's records — not other children.

---

### Module 4: Attendance

Powers the PIN and QR-code check-in/out system with real-time dashboard updates.

**Endpoints:**
```
POST   /api/attendance/checkin      - Log a child check-in (PIN or QR token)
POST   /api/attendance/checkout     - Log a child check-out
GET    /api/attendance/today        - Get today's live attendance snapshot for the center
GET    /api/attendance/:childId     - Get attendance history for a specific child
GET    /api/attendance/reports      - Export attendance report (date range, CSV/PDF)
GET    /api/attendance/ratios       - Get real-time staff-to-child ratio per room
```

**Notes:**
- Check-in events are broadcast via WebSocket to the live Dashboard view instantly.
- QR tokens are signed JWTs encoding the `childId`, valid for 60 seconds (prevents replay attacks).
- The system alerts the director via SMS (Twilio) if ratios exceed the legal maximum.

---

### Module 5: Billing & Payments

Handles invoice generation, parent payment collection, subscription management, and late fees.

**Endpoints:**
```
GET    /api/billing/invoices              - List all invoices for the center
POST   /api/billing/invoices             - Create a new invoice for a child/family
GET    /api/billing/invoices/:id         - Get invoice detail
POST   /api/billing/invoices/:id/send    - Email invoice to parent
POST   /api/billing/invoices/:id/void    - Void an invoice
GET    /api/billing/payments             - List payment history
POST   /api/billing/payments             - Record a manual payment (cash/check)
POST   /api/billing/stripe/checkout      - Create a Stripe Checkout session for a parent
POST   /api/billing/stripe/webhook       - Stripe webhook handler (payment success, failure, dispute)
GET    /api/billing/subscriptions        - Get the center's KidsManage SaaS plan status
POST   /api/billing/subscriptions/portal - Create a Stripe Customer Portal session for the director
```

**Notes:**
- Invoices are auto-generated weekly or monthly based on center settings (via BullMQ cron job).
- Late fees are automatically appended to overdue invoices after a configurable grace period.
- Stripe webhooks are verified using `stripe.webhooks.constructEvent` — not raw body parsing.
- Parent payment methods (cards, ACH) are stored on Stripe, never in the application database.

---

### Module 6: Enrollment

Manages the full enrollment pipeline from public inquiry to active enrollment.

**Endpoints:**
```
GET    /api/enrollment/applications       - List all applications (filter by status)
POST   /api/enrollment/apply             - Public endpoint — submit a new enrollment application
GET    /api/enrollment/applications/:id  - Get full application details
PATCH  /api/enrollment/applications/:id  - Update application status (Pending → Approved → Enrolled)
DELETE /api/enrollment/applications/:id  - Reject and archive an application
GET    /api/enrollment/waitlist          - Get current waitlist
POST   /api/enrollment/waitlist          - Add a family to the waitlist
PATCH  /api/enrollment/waitlist/:id      - Move a waitlist entry to active application
POST   /api/enrollment/applications/:id/sign - Submit e-signature for enrollment packet
GET    /api/enrollment/forms             - Get center's custom enrollment form schema
PATCH  /api/enrollment/forms             - Update the enrollment form fields (Director only)
```

**Notes:**
- Enrollment form fields are stored as a configurable JSON schema — each center can add custom questions.
- E-signature records are hashed and timestamped for legal auditability.
- When an application is approved, an automatic welcome email is sent via Resend.

---

### Module 7: Messaging

Powers the two-way, real-time messaging between staff and parents.

**Endpoints:**
```
GET    /api/messages/conversations       - List all conversations for the current user
POST   /api/messages/conversations       - Start a new conversation (staff initiates with parent)
GET    /api/messages/conversations/:id   - Get messages in a conversation (paginated)
POST   /api/messages/conversations/:id   - Send a message in a conversation
PATCH  /api/messages/conversations/:id/read - Mark all messages as read
POST   /api/messages/broadcast           - Send a center-wide announcement to all parents (Director only)
```

**WebSocket Events:**
```
message:new      - A new message was sent in a conversation the client is subscribed to
message:read     - Messages were marked as read by the other party
broadcast:new    - A center-wide announcement was posted
```

**Notes:**
- File attachments (photos, PDFs) in messages are uploaded to Supabase Storage first; the message body contains a signed URL.
- Broadcast messages are rate-limited to **3 per day per center** to prevent spam.
- Parents and staff can only message within their center — cross-center messaging is blocked at the middleware level.

---

### Module 8: Daily Activities

Allows staff to log a child's daily activities (meals, naps, lessons, photos) which parents can view in real time.

**Endpoints:**
```
GET    /api/activities                   - List today's activity logs for the center
POST   /api/activities                   - Create an activity log entry for a child
GET    /api/activities/:childId          - Get activity history for a specific child
PATCH  /api/activities/:id              - Edit an activity entry (within same day only)
DELETE /api/activities/:id              - Delete an activity entry (Staff/Director only)
POST   /api/activities/:id/media        - Upload a photo or video to an activity entry
```

**Notes:**
- Video uploads are limited to 50MB. Thumbnails are auto-generated on the backend.
- At end of day, a summary digest email is optionally sent to parents via Resend (opt-in per parent).
- Activity entries are append-only from a parent's perspective — parents can view but not edit.

---

### Module 9: Marketing

Provides tools for directors to grow their center's online presence and manage incoming leads.

**Endpoints:**
```
GET    /api/marketing/leads              - List all marketing leads / inquiries
POST   /api/marketing/leads             - Public endpoint — submit a "Book a Demo" or inquiry form
PATCH  /api/marketing/leads/:id         - Update lead status (New → Contacted → Enrolled)
GET    /api/marketing/website           - Get the center's public website configuration
PATCH  /api/marketing/website           - Update website content (hero text, photos, about section)
POST   /api/marketing/website/generate  - AI-powered content generation (calls OpenAI API)
GET    /api/marketing/analytics         - Get lead source analytics and conversion rates
POST   /api/marketing/campaigns         - Send a bulk email campaign to leads (via Resend)
```

**Notes:**
- The `/generate` endpoint sends a structured prompt to the OpenAI API and returns suggested website copy — it does not auto-publish content.
- Bulk email campaigns are rate-limited to **1 per day per center**.
- Marketing analytics tracks UTM parameters from incoming leads.

---

### Module 10: Notifications

Centralizes all push and in-app notifications across the platform.

**Endpoints:**
```
GET    /api/notifications               - Get unread notifications for the current user
PATCH  /api/notifications/:id/read     - Mark a notification as read
PATCH  /api/notifications/read-all     - Mark all notifications as read
POST   /api/notifications/preferences  - Update notification preferences (email, SMS, push)
```

**Notes:**
- Notifications are generated internally by other modules (e.g., billing module emits an event when an invoice is overdue).
- Web push is delivered via the browser Push API (VAPID keys stored in env vars).

---

## 4. Database Design

All tables include a `centerId` foreign key (except `Center` and `SuperAdmin`) enforcing tenant isolation at the row level.

---

### `Center` Table
Represents a single childcare center (one tenant).
- `id` (UUID, PK)
- `name` (String)
- `address` (String)
- `licenseNumber` (String)
- `capacity` (Int) — maximum children allowed
- `stripeCustomerId` (String) — for SaaS subscription billing
- `planTier` (Enum: `FREE`, `GROWTH`, `PRO`)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

---

### `User` Table
All platform users — directors, staff, and parents share this table, differentiated by role.
- `id` (UUID, PK)
- `supabaseId` (String, Unique) — links to Supabase Auth user
- `centerId` (FK → `Center`)
- `name` (String)
- `email` (String, Unique)
- `phone` (String, Nullable)
- `role` (Enum: `CENTER_DIRECTOR`, `STAFF`, `PARENT`)
- `status` (Enum: `ACTIVE`, `INVITED`, `DEACTIVATED`)
- `avatarUrl` (String, Nullable)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

---

### `Child` Table
Stores the profile of an enrolled or applying child.
- `id` (UUID, PK)
- `centerId` (FK → `Center`)
- `firstName` (String)
- `lastName` (String)
- `dateOfBirth` (Date)
- `room` (String, Nullable) — e.g., "Toddlers", "Pre-K"
- `allergies` (String[], Nullable)
- `medicalNotes` (Text, Nullable)
- `photoUrl` (String, Nullable)
- `status` (Enum: `ENROLLED`, `WAITLISTED`, `ARCHIVED`)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

---

### `ParentChild` Table (Join Table)
Links parents (Users with role PARENT) to their children. A child can have multiple parents.
- `parentId` (FK → `User`)
- `childId` (FK → `Child`)
- `relationship` (String) — e.g., "Mother", "Father", "Guardian"
- (Composite PK: `parentId` + `childId`)

---

### `AttendanceRecord` Table
One record per check-in event.
- `id` (UUID, PK)
- `centerId` (FK → `Center`)
- `childId` (FK → `Child`)
- `checkedInBy` (FK → `User`) — the staff member or parent who scanned
- `checkinAt` (DateTime)
- `checkoutAt` (DateTime, Nullable)
- `method` (Enum: `PIN`, `QR`, `MANUAL`)
- `createdAt` (DateTime)

---

### `Invoice` Table
One invoice per billing cycle per family.
- `id` (UUID, PK)
- `centerId` (FK → `Center`)
- `childId` (FK → `Child`)
- `parentId` (FK → `User`)
- `stripeInvoiceId` (String, Nullable)
- `amount` (Decimal) — in cents
- `dueDate` (Date)
- `status` (Enum: `DRAFT`, `SENT`, `PAID`, `OVERDUE`, `VOIDED`)
- `lineItems` (JSON) — array of {description, quantity, unitPrice}
- `paidAt` (DateTime, Nullable)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

---

### `EnrollmentApplication` Table
Tracks an application from initial inquiry through enrollment.
- `id` (UUID, PK)
- `centerId` (FK → `Center`)
- `childFirstName` (String)
- `childLastName` (String)
- `childDateOfBirth` (Date)
- `parentName` (String)
- `parentEmail` (String)
- `parentPhone` (String)
- `desiredStartDate` (Date)
- `formData` (JSON) — custom fields answered by the parent
- `status` (Enum: `PENDING`, `REVIEWING`, `APPROVED`, `ENROLLED`, `REJECTED`)
- `signedAt` (DateTime, Nullable) — timestamp of e-signature
- `signatureHash` (String, Nullable) — SHA-256 hash of signed document
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

---

### `Conversation` Table
A messaging thread between one staff member and one parent.
- `id` (UUID, PK)
- `centerId` (FK → `Center`)
- `participantIds` (UUID[]) — array of User IDs in this conversation
- `lastMessageAt` (DateTime)
- `createdAt` (DateTime)

---

### `Message` Table
Individual messages within a conversation.
- `id` (UUID, PK)
- `conversationId` (FK → `Conversation`)
- `senderId` (FK → `User`)
- `body` (Text)
- `attachmentUrl` (String, Nullable)
- `readAt` (DateTime, Nullable)
- `createdAt` (DateTime)

---

### `ActivityLog` Table
A single logged activity for a child during a given day.
- `id` (UUID, PK)
- `centerId` (FK → `Center`)
- `childId` (FK → `Child`)
- `loggedById` (FK → `User`) — staff member
- `type` (Enum: `MEAL`, `NAP`, `LESSON`, `OUTDOOR`, `PHOTO`, `INCIDENT`, `NOTE`)
- `notes` (Text, Nullable)
- `mediaUrl` (String, Nullable)
- `occurredAt` (DateTime)
- `createdAt` (DateTime)

---

### `Lead` Table
Marketing inquiries from the public website or demo form.
- `id` (UUID, PK)
- `centerId` (FK → `Center`)
- `name` (String)
- `email` (String)
- `phone` (String, Nullable)
- `source` (String, Nullable) — UTM source
- `status` (Enum: `NEW`, `CONTACTED`, `DEMO_SCHEDULED`, `ENROLLED`, `LOST`)
- `notes` (Text, Nullable)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

---

### `Notification` Table
In-app notification records for any user.
- `id` (UUID, PK)
- `userId` (FK → `User`)
- `centerId` (FK → `Center`)
- `type` (Enum: `INVOICE_OVERDUE`, `NEW_MESSAGE`, `CHECKIN`, `ENROLLMENT_UPDATE`, `BROADCAST`, `RATIO_ALERT`)
- `title` (String)
- `body` (String)
- `link` (String, Nullable) — deep link into the portal
- `readAt` (DateTime, Nullable)
- `createdAt` (DateTime)

---

## 5. Security Requirements

- **Environment Variables:** All third-party keys (Stripe, Resend, Supabase, Twilio, OpenAI) must live in `.env` files. They are never imported into any file that is bundled for the browser. The frontend only receives a `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — both are safe to expose publicly by design.
- **JWT Validation:** Every protected API route runs a middleware that validates the Supabase JWT and extracts `role` and `centerId`. Requests with invalid or expired tokens are rejected with `401 Unauthorized`.
- **Tenant Isolation:** Every database query on protected routes appends `WHERE centerId = :centerId` derived from the validated JWT — never from user-supplied request parameters. This prevents cross-tenant data leakage.
- **Input Sanitization:** All user-supplied text (messages, activity notes, enrollment form answers) is sanitized against XSS using `DOMPurify` (server-side via `jsdom`) before storage or rendering.
- **Rate Limiting:** All public-facing endpoints (`/apply`, `/leads`, `/checkin`) are rate-limited via `express-rate-limit` (e.g., 10 requests per minute per IP). Broadcast and campaign email endpoints are additionally rate-limited per center per day.
- **Stripe Webhook Security:** Webhooks are verified using the Stripe signature header (`stripe-signature`) against a `STRIPE_WEBHOOK_SECRET`. Raw body parsing (not JSON) is used on the webhook route.
- **File Upload Limits:** Uploaded files are validated for MIME type and size on the backend before being forwarded to storage. Photos max 5MB, documents max 20MB, videos max 50MB.
- **QR Code Security:** Attendance QR tokens are short-lived JWTs (60-second expiry), signed with a server-side secret, encoding only the `childId`. They cannot be replayed after expiry.

---

## 6. Background Jobs (BullMQ)

| Job Name | Trigger | Description |
|---|---|---|
| `invoice.generate` | Weekly/Monthly cron | Auto-generates invoices for all active enrolled children based on center billing settings. |
| `invoice.late-fee` | Daily cron at 9am | Appends late fees to overdue invoices past the grace period. |
| `invoice.reminder` | Daily cron at 8am | Emails parents with outstanding balances via Resend. |
| `activity.digest` | Daily cron at 6pm | Sends a daily activity summary email to opted-in parents. |
| `report.compliance` | On-demand | Generates a PDF compliance report and emails it to the director. |
| `enrollment.reminder` | Daily cron | Reminds directors of pending applications older than 3 days. |
| `ratio.monitor` | Every 5 minutes | Checks staff-to-child ratios and fires SMS alerts if limits are exceeded. |

---

## 7. Third-Party Integrations Summary

| Service | Purpose | SDK / Method |
|---|---|---|
| **Supabase Auth** | User authentication, JWT issuance, OAuth | `@supabase/supabase-js` |
| **Supabase Storage** | File storage for photos, videos, documents | `@supabase/supabase-js` storage API |
| **Supabase Realtime** | Live messaging and attendance dashboard updates | `@supabase/supabase-js` realtime channels |
| **Stripe** | Parent invoice payments (Card/ACH), center SaaS subscriptions | `stripe` Node.js SDK |
| **Resend** | Transactional emails — invoices, welcome, digests, campaigns | `resend` Node.js SDK |
| **Twilio** | SMS alerts for ratio violations and urgent parent notifications | `twilio` Node.js SDK |
| **OpenAI** | AI-generated marketing website copy | `openai` Node.js SDK |
| **BullMQ + Redis** | Async background job queue | `bullmq`, `ioredis` |

---

## 8. Project Structure

```
kidsmanage-backend/
├── prisma/
│   ├── schema.prisma          # Full database schema
│   └── migrations/            # Auto-generated migration files
├── src/
│   ├── middleware/
│   │   ├── auth.ts            # JWT validation + role extraction
│   │   ├── tenantGuard.ts     # Enforces centerId scoping on all queries
│   │   ├── rateLimiter.ts     # Per-route rate limiting config
│   │   └── sanitize.ts        # XSS sanitization middleware
│   ├── modules/
│   │   ├── auth/
│   │   ├── center/
│   │   ├── children/
│   │   ├── attendance/
│   │   ├── billing/
│   │   ├── enrollment/
│   │   ├── messages/
│   │   ├── activities/
│   │   ├── marketing/
│   │   └── notifications/
│   ├── jobs/                  # BullMQ job definitions and processors
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── supabase.ts        # Supabase server client
│   │   ├── stripe.ts          # Stripe client
│   │   ├── resend.ts          # Resend client
│   │   ├── twilio.ts          # Twilio client
│   │   └── openai.ts          # OpenAI client
│   ├── utils/
│   │   ├── qrToken.ts         # QR JWT sign/verify helpers
│   │   └── pdfGenerator.ts    # PDF report generation
│   └── index.ts               # Express app entry point
├── .env.example               # Template for required environment variables
└── package.json
```

---

## 9. Environment Variables Required

```bash
# Database
DATABASE_URL=

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=      # Server-side only — never sent to browser

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Resend
RESEND_API_KEY=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# OpenAI
OPENAI_API_KEY=

# Redis (for BullMQ)
REDIS_URL=

# App
JWT_SECRET=                     # Used for signing QR attendance tokens
APP_BASE_URL=                   # Frontend URL (for unsubscribe links, email CTAs)
```
