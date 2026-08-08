# Better Books - UAE VAT Compliance & Accounting ERP Suite

A modern, enterprise-grade UAE VAT Compliance and Accounting ERP suite migrated from Base44 to a high-performance **MySQL + Express + Next.js 15 App Router** stack.

---

## 🚀 Key Highlights & Architecture

### Backend Stack (`server/`)
- **Runtime & Framework**: Node.js + Express + TypeScript
- **ORM & Database**: Prisma ORM with MySQL 8 (`betterbooks` database)
- **Security & Auth**: JWT authentication with Bcrypt password hashing & Role-Based Access Control (Admin, Staff, Auditor, Agent)
- **Double-Entry Bookkeeping**: Automated ledger posting on invoice creation, payment settlement, customer advance deposits, and agent commissions via `LedgerService`
- **File Storage**: Multer disk storage for trade licenses, passports, and FTA acknowledgement receipts (`server/uploads/`)

### Frontend Stack (`client/`)
- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS with sleek glassmorphism & responsive layouts
- **Data Layer**: Axios API Client with JWT interceptors & TanStack Query support
- **PDF Generation**: FTA-compliant Tax Invoice generation using `jspdf` & `jspdf-autotable`
- **Exporting**: Instant Excel/CSV exporting for tax audits

---

## 📁 Repository Structure

```
betterbooks/
├── docker-compose.yml        # MySQL 8 service container
├── package.json              # Monorepo management scripts
├── server/                   # Express + Prisma + MySQL API backend
│   ├── prisma/
│   │   ├── schema.prisma     # 13 relational entities with indexes
│   │   └── seed.ts           # Demo seed data (admin, customers, invoices)
│   ├── src/
│   │   ├── controllers/      # 10 modular REST API controllers
│   │   ├── middleware/       # JWT auth & RBAC permissions
│   │   ├── services/         # Double-entry ledger automation
│   │   └── routes/           # Unified API router
│   └── .env.example
└── client/                   # Next.js 15 App Router Frontend
    ├── src/
    │   ├── app/              # (auth), (dashboard), (agent) portal routes
    │   ├── components/       # Modals (Customer, Invoice, Payment, Fund, Tracker)
    │   ├── lib/              # Auth Context, API Client, RBAC
    │   ├── utils/            # Quarter calculations & PDF invoice templates
    │   └── types/            # TypeScript interfaces
    └── .env.example
```

---

## 🛠️ Getting Started

### 1. Start MySQL Database
You can run MySQL locally or using Docker:
```bash
docker-compose up -d
```
*Default connection URL*: `mysql://betterbooks_user:betterbooks_password@localhost:3306/betterbooks`

### 2. Configure Backend (`server/`)
```bash
cd server
npm install
cp .env.example .env
# Run Prisma Migrations and Seed demo database
npm run db:migrate
npm run db:seed
# Start Express Server on http://localhost:5000
npm run dev
```

### 3. Configure Frontend (`client/`)
```bash
cd ../client
npm install
cp .env.example .env.local
# Start Next.js Development Server on http://localhost:3000
npm run dev
```

---

## 👥 Demo User Accounts

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@betterbooks.ae` | `admin123` | Full access to all ERP modules, company settings, and accounting |
| **Staff** | `staff@betterbooks.ae` | `staff123` | Customers, VAT return filings, invoices, and advance funds |
| **Auditor** | `auditor@betterbooks.ae` | `auditor123` | Read-only compliance and ledger audit logs |
| **Agent** | `agent@betterbooks.ae` | `agent123` | Dedicated Sales Agent portal (own clients & commissions) |

---

## 📊 Core Business Modules

1. **12-Month VAT Matrix Tracker**: Live compliance matrix tracking quarterly filing deadlines across `Jan-Apr-Jul-Oct`, `Feb-May-Aug-Nov`, and `Mar-Jun-Sep-Dec` cycles.
2. **VAT 201 Return Filing Engine**: FTA Form 201 calculator for Standard Rated Supplies (Box 1), Input Tax (Box 9), penalties, and Net VAT calculations.
3. **Invoicing & PDF Engine**: FTA-compliant Tax Invoice generation with 5% VAT breakdown, payment terms, and downloadable PDF bills.
4. **Customer Advance Fund Vault**: Client pre-funding mechanism for paying upcoming tax liabilities and invoices.
5. **Document Expiry Kanban**: Visual 4-stage Kanban tracking Trade Licenses, Passports, Emirates IDs, and Ejari expiries.
6. **Agent Commissions**: Automatic calculation, approval workflow, and advance payout deduction.
7. **Double-Entry General Ledger**: Real-time debit/credit auditing for all financial transactions.
