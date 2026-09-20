# Project Context: Petrol Pump Management SaaS

## 1. Project Overview
We are building a zero-budget, enterprise-level SaaS for Petrol Pump (Gas Station) management. The application will be used by Pump Owners (in cities with internet) to track daily profit/loss, and by Pump Workers (in villages with NO internet) to enter daily sales, expenses, and customer credit (Udhar). 

## 2. Tech Stack & Architecture
- **Framework:** Next.js (App Router) using the Antigravity boilerplate.
- **Database & Auth:** Supabase (PostgreSQL) - utilizing Row Level Security (RLS) for roles.
- **Offline-First (PWA):** `next-pwa` or `@serwist/next` for caching the web app so it opens without internet.
- **Local Storage:** `Dexie.js` (IndexedDB wrapper) to store form submissions offline.
- **Styling:** Tailwind CSS (Mobile-first UI, as workers will use phones).

## 3. Core Business Rules & Logic

### A. Role-Based Access Control (RBAC)
- **Admin/Owner:** Has full access. Can generate invite links for workers, view the Master Ledger, and see Profit/Loss dashboards.
- **Worker/Cashier:** Restricted access. Can only start a shift, enter meter readings, record expenses, and log customer credit. They CANNOT see profit/loss calculations.

### B. The Offline-First Sync Engine
1. **Offline Mode:** When a worker submits a form (e.g., Sale or Ledger entry), the app must intercept it. If `navigator.onLine` is false, save the payload to `Dexie.js` with a `status: 'pending'`.
2. **Online Sync:** Implement a background sync listener (`window.addEventListener('online')`). When the connection is restored, automatically push all 'pending' records from Dexie.js to Supabase and clear the local cache.

### C. Strict Price Snapshotting (Dynamic Pricing)
Fuel prices change frequently. **DO NOT** calculate historical totals using a dynamic relation to a master prices table. 
- Every single row in `Sales` or `Customer_Ledger` MUST explicitly store `applied_selling_price` and `applied_cost_price` at the exact moment of the transaction.
- If the price changes tomorrow, all historical profit, loss, and debt calculations must remain perfectly intact based on the snapshotted price of that specific day.

### D. Mathematical Calculations
- **Total Liters Sold:** `Closing Meter Reading - Opening Meter Reading`
- **Total Cash (Revenue):** `Total Liters Sold * applied_selling_price`
- **Gross Profit:** `Total Liters Sold * (applied_selling_price - applied_cost_price)`
- **Net Profit:** `Gross Profit - Sum of Daily Expenses`
- **Transit Loss (Shortage):** `Billed Tanker Liters - Actual Received Tank Dip Liters`

## 4. Required Database Schema (Supabase PostgreSQL)

1. **Users/Profiles:** `id`, `role` (owner/worker), `pump_id`, `name`.
2. **Products:** `id`, `name` (Petrol, Diesel, Hi-Octane), `current_sp`, `current_cp`.
3. **Shifts:** `id`, `worker_id`, `start_time`, `end_time`.
4. **Meter_Readings (Sales):** `id`, `shift_id`, `product_id`, `opening_meter`, `closing_meter`, `total_liters`, `applied_sp`, `applied_cp`.
5. **Customers:** `id`, `name`, `vehicle_number`, `total_balance`.
6. **Ledger_Transactions (Udhar):** `id`, `customer_id`, `worker_id`, `liters`, `amount`, `applied_sp`, `transaction_type` (credit/payment).
7. **Expenses:** `id`, `shift_id`, `amount`, `category`, `description`.
8. **Inventory_Arrivals:** `id`, `product_id`, `billed_liters`, `actual_received_liters`, `cost_per_liter`.

## 5. Phase 1: Immediate Action Plan for the Agent
Agent, please begin execution in this exact order:
1. **Setup PWA & Dexie:** Configure the Next.js app to be installable and set up the Dexie.js local database schema for offline caching.
2. **Setup Supabase Schema:** Write the SQL or migrations to create the tables listed above with correct Foreign Keys and strict RLS policies.
3. **Build Offline Forms:** Create the mobile-friendly React components for Workers (Meter Reading, Expense Entry, Ledger Entry) that write to Dexie.js first.
4. **Build Sync Logic:** Create the synchronization hook/service that pushes local data to Supabase Server Actions.