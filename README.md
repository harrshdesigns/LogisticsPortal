# ShipEase — Logistics Management Portal

A full-stack logistics management demo application with a customer portal and admin panel.

---

## Tech Stack

| Layer        | Technology                              |
|--------------|-----------------------------------------|
| Frontend     | React 18 + Vite + Tailwind CSS          |
| Backend      | Node.js + Express                       |
| Database     | PostgreSQL + Prisma ORM                 |
| Auth         | JWT + bcrypt                            |
| PDF          | PDFKit                                  |
| Email        | Nodemailer (Gmail SMTP / console log)   |
| Scheduler    | node-cron                               |

---

## Prerequisites

- **Node.js** v18 or higher
- **PostgreSQL** v14 or higher (running locally or accessible via URL)
- npm v9+

---

## Step-by-Step Setup

### 1. Clone / extract the project

```bash
cd shipease
```

### 2. Configure environment variables

```bash
cd backend
cp .env.example .env
```

Edit `.env` and set your PostgreSQL URL:

```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/shipease
JWT_SECRET=your-very-secret-key-here
SMTP_USER=your_email@gmail.com   # optional — emails log to console if unset
SMTP_PASS=your_app_password       # optional
FRONTEND_URL=http://localhost:5173
PORT=3000
```

> **Note:** If SMTP is not configured, all emails will be logged to the backend console instead of being sent.

### 3. Install backend dependencies

```bash
cd backend
npm install
```

### 4. Set up the database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (creates all tables)
npm run db:push

# Seed with demo data
npm run db:seed
```

### 5. Install frontend dependencies

```bash
cd ../frontend
npm install
```

### 6. Start the servers

**Backend** (in `shipease/backend/`):
```bash
npm run dev
# Runs on http://localhost:3000
```

**Frontend** (in `shipease/frontend/`):
```bash
npm run dev
# Runs on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## Demo Credentials

### Admin Portal (`/admin/login`)

| Role        | Email                      | Password    |
|-------------|----------------------------|-------------|
| Super Admin | superadmin@shipease.in     | Admin@123   |
| Ops Admin   | ops@shipease.in            | Admin@123   |
| Billing     | billing@shipease.in        | Admin@123   |

### Customer Portal (`/login`)

| Company            | Email                           | Password       |
|--------------------|---------------------------------|----------------|
| Mehta Textiles     | rajan@mehthatextiles.in         | Customer@123   |
| Patel Electronics  | priya@patelelectronics.in       | Customer@123   |
| Singh Pharma       | gurpreet@singhpharma.in         | Customer@123   |

---

## Environment Variables

| Variable        | Description                                          |
|-----------------|------------------------------------------------------|
| `DATABASE_URL`  | PostgreSQL connection string                         |
| `JWT_SECRET`    | Secret key for JWT signing                           |
| `JWT_EXPIRES_IN`| Token expiry (default `7d`)                          |
| `SMTP_HOST`     | SMTP server host (default: `smtp.gmail.com`)         |
| `SMTP_PORT`     | SMTP server port (default: `587`)                    |
| `SMTP_USER`     | Gmail address for sending emails                     |
| `SMTP_PASS`     | Gmail app password (not your account password)       |
| `FRONTEND_URL`  | Frontend base URL for email links                    |
| `PORT`          | Backend server port (default: `3000`)                |

---

## Folder Structure

```
shipease/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # Full DB schema
│   │   └── seed.js               # Demo data seeder
│   ├── src/
│   │   ├── app.js                # Express app entry point
│   │   ├── routes/               # Route definitions
│   │   ├── controllers/          # Business logic
│   │   ├── middleware/           # Auth middleware
│   │   ├── services/
│   │   │   ├── deliveryPartners/ # Mocked courier adapters
│   │   │   ├── email.service.js  # Nodemailer + HTML templates
│   │   │   ├── pdf.service.js    # PDFKit generators
│   │   │   └── mis.service.js    # MIS report generation
│   │   ├── jobs/
│   │   │   ├── dailyMIS.job.js   # Cron: daily MIS at 8AM IST
│   │   │   └── trackingSync.job.js # Cron: sync tracking every 30m
│   │   └── utils/
│   │       └── helpers.js        # Response helpers, docket generators
│   ├── storage/pdfs/             # Generated PDF files
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── customer/         # Dashboard, BookShipment, Orders, etc.
    │   │   └── admin/            # Admin dashboard, orders, billing, MIS
    │   ├── components/
    │   │   ├── shared/           # StatusBadge, Modal, LoadingSpinner
    │   │   ├── customer/         # CustomerLayout (sidebar)
    │   │   └── admin/            # AdminLayout (sidebar)
    │   ├── context/
    │   │   └── AuthContext.jsx   # JWT auth context
    │   └── services/
    │       └── api.js            # Axios instance with interceptors
    └── index.html
```

---

## API Overview

### Auth
- `POST /api/auth/register` — Customer registration
- `POST /api/auth/login` — Login (returns JWT)
- `GET /api/auth/me` — Current user profile

### Customer (JWT required, role: CUSTOMER)
- `POST /api/orders` — Book new shipment
- `GET /api/orders` — List own orders (paginated, filterable)
- `GET /api/orders/:docketNo` — Order detail + tracking timeline
- `GET /api/invoices` — Own invoices
- `GET /api/invoices/:id/download` — Download invoice PDF
- `GET /api/addresses` — Saved addresses
- `POST /api/addresses` — Save new address

### Admin (JWT required, role: ADMIN / SUPER_ADMIN)
- `GET /api/admin/dashboard` — Dashboard stats
- `GET /api/admin/orders` — All orders (filtered)
- `PUT /api/admin/orders/:id/assign` — Book with courier
- `POST /api/admin/orders/:id/tracking` — Add tracking event
- `PUT /api/admin/orders/:id/status` — Update status
- `GET /api/admin/customers` — All customers
- `POST /api/admin/invoices` — Create invoice
- `POST /api/admin/invoices/:id/send` — Generate PDF + email
- `POST /api/admin/mis/generate` — Generate MIS report
- `GET /api/admin/admins` — List admin team (SUPER_ADMIN)
- `POST /api/admin/admins` — Create admin (SUPER_ADMIN)

---

## Automated Jobs

| Job            | Schedule         | Action                                             |
|----------------|------------------|----------------------------------------------------|
| Daily MIS      | Every day 8:00 AM IST | Generates yesterday's MIS PDF, emails to Super Admins |
| Tracking Sync  | Every 30 minutes  | Polls mock courier APIs for BOOKED/IN_TRANSIT orders |

---

## Delivery Partner Integration

Partners are mocked for demo. Each adapter returns realistic Indian-city tracking events.
To integrate real APIs, replace the content of:
- `src/services/deliveryPartners/delhivery.js`
- `src/services/deliveryPartners/dpworld.js`
- `src/services/deliveryPartners/vrl.js`
- `src/services/deliveryPartners/dtdc.js`

Each file has a `// TODO: Replace with real API integration` comment at the top.
