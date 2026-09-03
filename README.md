# Genesoft Infotech CRM

> **Enterprise High-Volume Sales Operations & Workforce Management Platform**  
> Tailored for fast-paced inside sales floors, dialer campaigns, administrative quality auditing, automated commission calculation, and shift operations.

---

## 🌟 Key Features

1. **Liquid Glass Aesthetic & Theme Modes**: Frosted glass panels, ambient animated mesh orbs, and instant 1-click Light / Dark mode switching.
2. **Username-Only Authentication**: Built exclusively with Username login (created and managed by Admin; self-registration disabled).
3. **Global IP Restriction & Admin Anywhere**: Restricts staff logins to whitelisted Global Static WAN IPs, while Administrators are globally exempt and can log in from anywhere worldwide.
4. **Campaign-Configurable Shift Schedules**: Each campaign defines shift hours (e.g. `19:00 - 04:00`), late grace window (15 mins), and commission rates.
5. **Shift Controls & 15m Grace Undo**: Confirmation prompt on log out + immediate 15-minute "Resume Shift" grace window to undo accidental logouts with 0 lost minutes.
6. **3 Floor Scheduled Breaks + Live Stopwatch**: Evening Tea (15m), Floor Dinner (45m), Midnight Coffee (15m), and Custom Breaks with countdown timers.
7. **Fast 11-Field Lead Intake (`Ctrl+N`)**: Modal capturing all 11 fields in `< 25 seconds` with campaign-scoped mobile duplicate prevention.
8. **Dual-View Kanban & Pretext Virtualized Data Grid**: 1-click toggle between Kanban pipeline and 60 FPS table with sub-DOM Canvas text measurement (`@chenglou/pretext`).
9. **Admin Quality Decisions & Incentive Reversal**: 1-click Approve (auto-credits incentive), 1-click Reject (mandatory reason), and Reclassifying Approved leads automatically voids credited incentives.
10. **Employee Performance Reports & 1-Click CSV Exports**: Comprehensive staff reporting with instant downloads of Employee Performance CSV and All Leads & Sales Master CSV.

---

## 🚀 Quick Start

### 1. Install Dependencies & Start Dev Server
```bash
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### 2. Default Access Credentials
- **Administrator**: Username: `admin` | Password: `Admin@123` $\rightarrow$ Routes to `/admin`
- **Sales Agent**: Username: `agent` | Password: `Agent@123` $\rightarrow$ Routes to `/dashboard`

### 3. Run Automated Business Rule Tests
```bash
npx tsx tests/run-tests.ts
```

### 4. Production Build
```bash
npm run build
npm start
```

For complete operational details, see [OPERATIONAL_GUIDE.md](file:///c:/Users/suraj/Desktop/CRM/OPERATIONAL_GUIDE.md).
