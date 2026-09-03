# Genesoft Infotech CRM — Operations & Administration Handbook

---

## 1. Quick Start & Execution

### Starting the Local Development Server
```bash
npm run dev
```
- Open `http://localhost:3000` in your web browser.
- Network access: `http://<your-local-ip>:3000` (e.g. `http://192.168.1.126:3000`).

### Compiling for Production
```bash
npm run build
npm start
```

### Running the Automated Business Rule Tests
```bash
npx tsx tests/run-tests.ts
```
*(Runs 11 automated test suites validating shift logic, duplicate checks, incentive math, IP guards, and pretext text measurements).*

---

## 2. Default System Credentials & Roles

| Role | Username | Password | Target Portal | Privileges |
|---|---|---|---|---|
| **Administrator** | `admin` | `Admin@123` | `/admin` | System Admin, Decision Center, Password Management, IP Guard, Shifts, Attendance, Leaves, Salaries, Incentives, Reports & CSV Exports |
| **Sales Agent** | `agent` | `Agent@123` | `/dashboard` | Shift Log In / Log Out, 3 Scheduled Breaks, `Ctrl+N` Fast Lead Entry, Dual Kanban & Table, Commission Tracker, Leave Requests |

> [!IMPORTANT]
> **Username-Only Authentication**: Accounts are authenticated via unique **Username**. Self-registration is strictly disabled. Only the Administrator can create new user accounts or reset passwords.

---

## 3. Brand Styling & Company Logo Upload

### Brand Styling (Liquid Glass Aesthetic)
- **Primary Colors**: Vibrant Orange (`#F97316` / `#EA580C`) and Crisp Pure White (`#FFFFFF`).
- **Liquid Glass**: Translucent frosted glass containers (`backdrop-filter: blur(24px)`), inner specular bevel highlights, soft drop shadows, and ambient mesh orbs.
- **Theme Switcher**: Instant 1-click toggle between **Light Glass** and **Deep Obsidian Dark Glass (`#0B0F19`)** mounted across all portals.

### 1-Click Company Logo Upload in Admin Panel:
1. Log in as `admin` and open `http://localhost:3000/admin`.
2. Click **"🏢 Company & Logo"** in the Quick Jump bar (or scroll to **Company Branding & Organization Profile**).
3. Click the **"Upload New Logo"** button.
4. Select your official logo file (`.png`, `.svg`, `.jpg`, `.webp` up to 5MB).
5. The logo will immediately preview, write to `public/logo.png`, and update across the navigation bar, login screen, and report headers!
6. You can also edit your **Company Legal Name**, **Brand Name**, **Support Email**, **Hotline Phone**, **Website**, and **Corporate Headquarters Address**.

---

## 4. Employee Management & Admin Settings (Add / Remove / Deactivate)

### Adding a New Employee:
1. On the `/admin` portal, click **"👥 Add / Remove Employees"** in the navigation bar.
2. Click the orange **"Add New Employee"** button.
3. Enter:
   - **Full Name** (e.g. `Robert M. Jenkins`)
   - **Username** (e.g. `rjenkins` — lowercase alphanumeric)
   - **Role** (`Agent`, `Closer`, `Team Lead`, or `Admin`)
   - **Email** (Optional)
   - **Assigned Campaign**
   - **Password** (Or click *"Generate Random"* to create a strong secure password)
4. Click **"Save Employee"**. The user account is instantly active and can log in at `/login`.

### Deactivating or Reactivating an Employee:
- Next to each employee in the roster, click the **"Active / Deactivated"** pill button to immediately toggle their login ability. Deactivated staff cannot log in to the CRM.

### Removing an Employee:
- Click the trash icon 🗑️ next to an employee to remove their account from the system. (Master `admin` account is protected from accidental deletion).

### Changing or Resetting an Employee's Password:
- Click **"Reset Pass"** on any employee row, type a new password or click *"Generate Strong"*, then click **"Update Password"**.

---

## 4. Global IP Guard & "Admin Anywhere" Exemption

### How Global IP Restriction Operates:
1. Log in as `admin` and navigate to **Global IP Whitelist & Login Restriction** at the bottom of `/admin`.
2. To restrict employee logins to your office internet, toggle **"ENFORCE IP RESTRICTION"** to **ACTIVE**.
3. When active, all regular employees (Agents and Closers) can **only** log in if connecting from an authorized Global Public IP (WAN IP).
4. **1-Click Whitelist**: Click **"+ Whitelist My Current IP"** to immediately authorize the network you are currently on.
5. **Admin Anywhere Exemption**: Regardless of whether IP restriction is active or what IP you connect from, **Administrators can log in from anywhere worldwide** without ever being locked out.

---

## 5. Campaign Shift Schedules & Misclick Protection

### Campaign-Specific Shift Timings
- Navigate to **Campaign Management & Shift Schedules** on `/admin`.
- Each campaign defines:
  - **Shift Operating Hours** (e.g. `19:00 – 04:00`, `20:00 – 05:00`, or Day Shifts).
  - **Late Grace Period** (Default: 15 minutes).
  - **Commission Per Approved Lead** (e.g. `$15.00`).
- Night shifts cross midnight automatically: hours before 12:00 PM are attributed to the shift start date.

### Accidental Log-Out Protection & 15-Minute Undo
- When an employee clicks **"Log Out Shift"**, a confirmation modal prevents accidental clicks.
- Once logged out, a **15-Minute Grace Window** banner activates on the agent dashboard.
- If logged out by mistake, the agent can click **"Resume Shift (Undo Log-Out)"** within 15 minutes to resume work with **0 lost minutes** and no attendance penalty.

### 3 Floor Scheduled Breaks + Live Stopwatch
Agents have 3 one-click scheduled break buttons:
1. **1st Break (Evening Tea):** 15 mins (~09:30 PM – 09:45 PM)
2. **2nd Break (Floor Dinner):** 45 mins (~11:30 PM – 12:15 AM)
3. **3rd Break (Midnight Coffee):** 15 mins (~02:00 AM – 02:15 AM)
- Plus **Custom Breaks** (Bio/Restroom, Supervisor Huddle, Training) with reason logging.
- An active break stopwatch counts down break time and calculates net productive hours.

---

## 6. High-Velocity Lead Intake & Duplicate Prevention

### 11-Field Fast Intake Modal (`Ctrl+N`)
Press **`Ctrl+N`** from anywhere on the agent floor to launch the rapid intake form:
1. **Customer Name**
2. **Date of Birth (DOB)**
3. **Mobile Number (10 digits)**
4. **Street Address (Multiline)**
5. **Email Address**
6. **Campaign**
7. **Lead Source** (`DIALER`, `MANUAL_DIAL`, `REFERENCE`, `CUSTOM`)
8. **Assigned Closer**
9. **Lead Status** (`UPLOADED`, `PENDING_VERIFICATION`, `CALL_BACK`, `VOICEMAIL`, `CUSTOM`)
10. **Call Back Time** *(Mandatory ONLY when status is `CALL_BACK`)*
11. **Agent Notes** *(Up to 1000 characters)*

### Campaign-Scoped Mobile Uniqueness
- If an agent attempts to submit a phone number that already exists under the **same campaign**, the system blocks the submission and displays a duplicate warning.
- The **same phone number is permitted under different campaigns** (e.g., cross-selling insurance and healthcare).

---

## 7. Dual-View Kanban & Pretext Table with Admin Decisions

### 1-Click View Toggling
Both Admin and Agent dashboards feature a **Dual-View switcher**:
- **Kanban Board**: Visual drag-and-drop pipeline across 6 columns (`UPLOADED`, `PENDING_VERIFICATION`, `CALL_BACK`, `VOICEMAIL`, `APPROVED`, `REJECTED`).
- **Table Grid**: Pretext-virtualized 60 FPS data table with off-DOM Canvas height pre-measurement for smooth scrolling.

### Admin 1-Click Quality Decisions
- **1-Click Approve**: Instantly passes verification and **automatically credits commission** to the agent.
- **1-Click Reject**: Opens prompt requiring a rejection reason.
- **Approved Lead Reclassification Safeguard**: If an Admin modifies a lead that was previously marked `APPROVED` (e.g. moving back to `CALL_BACK` or `REJECTED`), the system:
  1. Mandates an audit justification reason.
  2. **Automatically reverses and voids the credited incentive** from the agent's payroll balance.

---

## 8. Employee Performance Reports & 1-Click CSV Exports

Located on the Admin Command Center:
- **Floor Performance Table**: Itemized staff productivity tracking:
  - Total Leads Ingested
  - Quality Approved Sales
  - Rejection Counts & Callbacks
  - Conversion Rate % (${\ge}70\%$ highlighted in green)
  - Productive Shift Hours
  - Late Arrival Marks
  - Total Commissions Earned ($)
- **1-Click Export Center**:
  - 📥 **"Export Performance CSV"**: Downloads `Genesoft_Employee_Performance_[Date].csv` with itemized staff performance.
  - 📥 **"Export All Leads & Sales Master"**: Downloads `Genesoft_Leads_Sales_Master_[Date].csv` containing complete lead records, addresses, closer handoffs, and audit timestamps.
