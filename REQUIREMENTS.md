# Requirements Specification: Genesoft Infotech CRM

> [!IMPORTANT]
> ### 🛑 PROJECT GOVERNANCE & EXECUTION DIRECTIVE:
> 1. **STRICT PLANNING PHASE ONLY:** We are currently in the planning, brainstorming, and requirements refinement phase. **DO NOT PROCEED TO START CODING, SCAFFOLDING, OR IMPLEMENTATION** until the user explicitly gives final, unambiguous approval to begin.
> 2. **ZERO AI ASSUMPTIONS / USER-PROVIDED ONLY:** The AI assistant MUST NOT invent, guess, assume, or enter any fields, dummy data, workflows, or rules on its own. Everything must be asked directly and provided by the user.
> 3. **OFFICIAL LOGO GOVERNANCE:** The official company logo will be provided directly by the user (placed at `public/logo.png` / `public/logo.svg`). The AI assistant MUST NOT generate or create any mock, AI-hallucinated, or placeholder logo.

**Application:** Genesoft Infotech CRM  
**Brand Theme:** Vibrant Orange (`#F97316`) & Crisp White (`#FFFFFF`)  
**Official Logo Asset:** `public/logo.png` / `public/logo.svg` (To be supplied directly by user)  
**Version:** 1.0.0 (Planning Blueprint)  
**Execution Gate:** **STRICT PLANNING & REVIEW (IMPLEMENTATION FROZEN)**  
**Format:** Atomic Requirements with Gherkin Acceptance Criteria & Traceability Matrix  
**Prioritization Framework:** MoSCoW (Must Have, Should Have, Could Have, Won't Have)

---

## 1. Requirements Summary & Scope Matrix

| Category Code | Functional Area | Must Have | Should Have | Could Have | Total |
|---|---|---|---|---|---|
| `REQ-DATA` | Lead Data Entry & Sources | 6 | 1 | 0 | 7 |
| `REQ-STAT` | Status Engine & Decisions | 5 | 1 | 0 | 6 |
| `REQ-REV` | Admin Review & Audit Queue | 4 | 1 | 0 | 5 |
| `REQ-HR` | Attendance & Leave System | 5 | 1 | 0 | 6 |
| `REQ-INC` | Custom Incentive Engine | 4 | 1 | 0 | 5 |
| `REQ-TEAM` | Team & Campaign Management | 3 | 1 | 0 | 4 |
| `REQ-DASH` | Admin & Employee Dashboards | 4 | 1 | 0 | 5 |
| `REQ-UI` | Design System (`ui-ux-pro-max`) | 3 | 1 | 0 | 4 |
| `REQ-PERF` | Virtualization (`@chenglou/pretext`) | 3 | 0 | 0 | 3 |
| `REQ-SEC` | Auth, Security & RBAC | 4 | 0 | 0 | 4 |
| **Total** | | **41** | **8** | **0** | **49** |

---

## 2. Detailed Atomic Requirements

### 2.1 Lead Data Entry & Sources (`REQ-DATA`)

- **REQ-DATA-001 [Must Have] Lead Source Classification**: The system MUST support four distinct lead sources: `Dialer`, `Manual Dial`, `Reference`, and `Custom`.
- **REQ-DATA-002 [Must Have] Customer Name Capture**: The system MUST enforce a non-empty `Customer Name` (min 2 characters, max 120 characters).
- **REQ-DATA-003 [Must Have] Date of Birth (DOB) Validation**: The system MUST capture prospect `DOB` in `YYYY-MM-DD` format and validate that the date is in the past.
- **REQ-DATA-004 [Must Have] Campaign-Scoped Mobile Duplicate Prevention**: The system MUST capture a 10-digit numeric `Mobile Number`, verify it in real-time, and strictly prevent any agent from creating a duplicate lead if that mobile number was already entered under the **same Campaign**. However, the system MUST permit the same mobile number to be entered in **different Campaigns**.
- **REQ-DATA-005 [Must Have] Address & Email Capture**: The system MUST capture full `Address` (Text) and validate standard RFC `Email` formatting.
- **REQ-DATA-006 [Must Have] Closer Assignment**: The agent MUST select or enter the `Closer Name` who received the transferred call.
- **REQ-DATA-007 [Should Have] Campaign Mapping Filter**: The campaign dropdown in the lead entry form SHOULD automatically filter to show only campaigns assigned to the agent's team.

#### Acceptance Criteria for REQ-DATA-004 & REQ-DATA-006:
```gherkin
Scenario: Agent successfully submits a new transferred lead
  Given an authenticated agent on the lead entry form
  When the agent inputs valid Name, DOB, 10-digit Mobile, Address, Email, and Campaign
  And the agent enters the Closer Name "Alex Morgan"
  And the agent selects status "Uploaded"
  And the agent clicks "Submit Lead"
  Then the system saves the lead with a unique UUID
  And the lead appears immediately in the agent's "My Leads" table
  And the lead enters the Admin Review Queue with status "Uploaded"

Scenario: Cross-Agent duplicate lead entry is blocked within the same Campaign
  Given an existing lead with mobile "9876543210" in Campaign "USA Health" entered by Agent "Sarah Connor"
  When another Agent "John Miller" enters mobile "9876543210" in Campaign "USA Health"
  Then the system displays warning: "Duplicate Lead in Campaign: Mobile was already entered by Agent Sarah Connor"
  And the "Submit Lead" button is disabled
  And John Miller is blocked from saving the duplicate lead

Scenario: Same lead is permitted across different Campaigns
  Given an existing lead with mobile "9876543210" in Campaign "USA Health"
  When an Agent enters mobile "9876543210" in Campaign "USA Auto"
  Then the system displays an informational badge: "Existing Customer found in USA Health"
  And the "Submit Lead" button remains enabled
  And the lead is successfully created under Campaign "USA Auto"
```

---

### 2.2 Status Engine & Callbacks (`REQ-STAT`)

- **REQ-STAT-001 [Must Have] Agent Permitted Statuses**: Frontline agents MUST only be permitted to select from: `Voicemail`, `Uploaded`, `Pending Verification`, `Call Back`, and active `Custom Statuses`.
- **REQ-STAT-002 [Must Have] Mandatory Call Back Time**: If status `Call Back` is selected, the system MUST enforce selection of a valid future `Call Back Time`.
- **REQ-STAT-003 [Must Have] Admin Exclusive Status Decisions & Full Status Override**: Only users with the `ADMIN` role MUST be permitted to transition a lead to `Approved` or `Rejected`. In addition, Admins MUST have full authority to change a lead's status to ANY other status (`Voicemail`, `Call Back`, `Pending Verification`, `Uploaded`, `Custom Status`) at any time, with automatic incentive adjustments if moving away from `Approved`.
- **REQ-STAT-004 [Must Have] Mandatory Rejection Reason**: When transitioning a lead to `Rejected`, the system MUST enforce a non-empty `rejectionReason`.
- **REQ-STAT-005 [Must Have] Lead Status Immutability Post-Approval**: Once a lead is marked `Approved`, frontline agents MUST NOT be able to modify the lead status or details.
- **REQ-STAT-006 [Should Have] Callback Notification Alerts**: The system SHOULD visually highlight upcoming and overdue callbacks in the employee dashboard.

#### Acceptance Criteria for REQ-STAT-002 & REQ-STAT-004:
```gherkin
Scenario: Attempting to save Call Back without Call Back Time
  Given an agent filling the lead entry form
  When the agent selects status "Call Back"
  And leaves the "Call Back Time" field empty
  And clicks "Submit Lead"
  Then the submission is blocked
  And an inline error displays "Call Back Time is required when status is Call Back"

Scenario: Admin rejects a lead without providing a reason
  Given an authenticated Admin viewing an "Uploaded" lead
  When the Admin clicks "Reject"
  And attempts to confirm without selecting or entering a rejection reason
  Then the action is blocked with message "A rejection reason is mandatory"
```

---

### 2.3 Admin Review & Audit Queue (`REQ-REV`)

- **REQ-REV-001 [Must Have] Pending Review Queue**: The Admin dashboard MUST provide a dedicated inbox of all leads in `Uploaded` or `Pending Verification`.
- **REQ-REV-002 [Must Have] One-Click Approval**: Admins MUST be able to approve a lead in a single click, instantly moving it to `Approved`.
- **REQ-REV-003 [Must Have] Rejection Reason Catalog**: The rejection modal MUST provide a pre-configured dropdown (*Ineligible Age, Out of Service Area, Failed Voice Verification, Disconnected Call, Customer Refusal, Bogus Data*) plus a freeform text input.
- **REQ-REV-004 [Must Have] Comprehensive Audit Trail**: Every status change MUST record an immutable log containing `leadId`, `changedById`, `previousStatus`, `newStatus`, `reason`, and `timestamp`.
- **REQ-REV-005 [Should Have] Batch Review Actions**: Admins SHOULD be able to select multiple verified leads and execute bulk approval.
- **REQ-REV-006 [Must Have] Admin Full Status Reassignment**: Admins MUST have controls to reassign any lead to floor statuses (`Voicemail`, `Call Back`, `Pending Verification`, `Uploaded`, or `Custom Status`) with optional notes to return the lead to an agent for re-engagement.
- **REQ-REV-007 [Must Have] Mandatory Reason for Modifying Approved Lead Status**: Once a lead has been marked `Approved`, the system MUST strictly require the Admin to input a non-empty `reclassificationReason` before allowing the status to change to any other status. In addition, the system MUST automatically reverse or void any associated incentive earnings for that lead.

#### Acceptance Criteria for REQ-REV-006 & REQ-REV-007:
```gherkin
Scenario: Admin reassigns an Uploaded lead back to Voicemail
  Given an authenticated Admin viewing an "Uploaded" lead originating from Agent "David Lee"
  When the Admin selects "Voicemail" from the status override dropdown
  And enters note "Customer disconnected during closer pitch; needs redial"
  And confirms the status change
  Then the lead status updates to "Voicemail"
  And the lead disappears from the Admin Review Queue
  And the lead returns to Agent David Lee's "My Leads" table under the Voicemail tab
  And an audit log records the status transition from "Uploaded" to "Voicemail" by Admin

Scenario: Admin modifies an Approved lead without providing a reason is blocked
  Given an existing lead in "Approved" status with $15.00 incentive accrued to Agent "Sarah Connor"
  When an Admin attempts to change the lead's status to "Rejected"
  And leaves the mandatory status change reason blank
  Then the action is blocked with error "Reason is mandatory when changing an Approved lead"

Scenario: Admin successfully modifies an Approved lead with mandatory reason
  Given an existing lead in "Approved" status with $15.00 incentive accrued to Agent "Sarah Connor"
  When an Admin changes the lead's status to "Rejected"
  And provides mandatory reason "Client chargeback received; documentation defective"
  Then the lead status updates to "Rejected"
  And the $15.00 incentive earning is automatically revoked/voided in the ledger
  And an immutable audit record logs the transition and reason
```

---

### 2.4 Workforce, Attendance (Log In / Log Out) & Multiple Break Engine (`REQ-HR`)

- **REQ-HR-001 [Must Have] Campaign-Configurable Shift Log In / Log Out**: Employees MUST have an accessible button in the top navigation bar to **Log In** and **Log Out** for their active shift, with operational hours and shift schedules customizable per Campaign by the Admin (e.g. 7:00 PM – 4:00 AM, 8:00 PM – 5:00 AM, or Day Shift).
- **REQ-HR-002 [Must Have] Cross-Midnight Work Time & Shift Attribution**: The system MUST calculate work duration in minutes and hours across the midnight boundary and attribute the attendance record to the shift's starting date.
- **REQ-HR-003 [Must Have] Admin Live Attendance Board**: Admins MUST have a real-time board showing which employees are currently logged in, on break, late, or absent for the active night shift.
- **REQ-HR-004 [Must Have] Leave Request Submission**: Employees MUST be able to submit leave applications with Leave Type (`CASUAL`, `SICK`, `EMERGENCY`), date range, and reason.
- **REQ-HR-005 [Must Have] Leave Approval Workflow**: Admins and Team Leads MUST have authority to approve or reject leave applications.
- **REQ-HR-006 [Should Have] Dynamic Late Arrival Flagging**: The system SHOULD automatically flag an attendance record as `LATE` if log-in occurs after `shiftStartTime + lateGraceMinutes` based on the assigned Campaign's schedule (e.g. after 7:15 PM for a 7:00 PM shift).
- **REQ-HR-007 [Must Have] Accidental Log-Out Safeguards & Resume Shift Grace**: The system MUST require confirmation before finalizing log-out, and MUST provide a 15-minute "Resume Shift / Undo Log-Out" window that seamlessly restores the active attendance session without deducting work minutes or creating penalties.
- **REQ-HR-008 [Must Have] Custom Break Tracking & Live Break Timer**: The system MUST provide employees with a "Take Break" button during active shifts supporting standard categories (`DINNER`, `TEA`, `BIO`, `TRAINING`) and `CUSTOM` break reasons. When on break, the system MUST display a live break timer and an "End Break" button.
- **REQ-HR-009 [Should Have] Break Overstay Alerting & Net Work Calculation**: The system SHOULD alert Admins when an employee's break exceeds company threshold limits and MUST calculate net productive work minutes (Gross Shift Duration minus Total Break Time).
- **REQ-HR-010 [Must Have] Multiple Scheduled Break Timings**: The system MUST configure, display, and monitor the floor-mandated multiple break windows:
  1. *First Refreshment / Tea Break:* 09:30 PM to 09:45 PM (**15 Minutes**)
  2. *Main Dinner Break:* 11:30 PM to 12:15 AM (**45 Minutes**)
  3. *Midnight Coffee / Tea Break:* 02:00 AM to 02:15 AM (**15 Minutes**)
  4. *Custom / Bio Breaks:* On-demand with required reason logging.

#### Acceptance Criteria for REQ-HR-001, REQ-HR-007, REQ-HR-008 & REQ-HR-010:
```gherkin
Scenario: Employee logs in and logs out for the 7:00 PM to 4:00 AM night shift
  Given an employee logging into the CRM at 07:00 PM on Sept 3
  When the employee clicks "Log In"
  Then the system creates an Attendance record for shift date "2026-09-03" with status "PRESENT"
  And a persistent timer begins counting elapsed shift time
  When the employee clicks "Log Out" at 04:00 AM on Sept 4
  And confirms the "End Shift / Log Out" prompt
  Then the system records logoutAt timestamp and computes totalMinutes as 540 (9.0 hours)
  And the attendance remains attributed to shift date "2026-09-03"

Scenario: Employee takes multiple scheduled breaks during shift
  Given an employee actively logged in on shift
  When the employee clicks "Take Break" at 09:30 PM
  And selects "First Refreshment / Tea Break (15 mins)"
  Then an active BreakLog record is created and employee status changes to "ON_BREAK"
  When the employee clicks "End Break / Resume Shift" after 15 minutes
  Then the system closes the break and resumes active status
  When the employee takes "Main Dinner Break (45 mins)" at 11:30 PM
  Then a second BreakLog record is appended and Net Working Time subtracts cumulative break minutes
```

---

### 2.5 Salary & Custom Incentive Engine (`REQ-INC`)

- **REQ-INC-001 [Must Have] Employee Salary Master**: Admins MUST be able to define base salary and pay period details per employee.
- **REQ-INC-002 [Must Have] Dynamic Incentive Rules**: Admins MUST be able to create custom incentive rules specifying:
  - Target Role (`AGENT` or `CLOSER`)
  - Target Campaign
  - Incentive amount per `Approved` lead
- **REQ-INC-003 [Must Have] Automated Incentive Calculation**: When an Admin marks a lead as `Approved`, the system MUST immediately evaluate matching rules and credit an `IncentiveEarning` to the agent and/or closer.
- **REQ-INC-004 [Must Have] Employee Incentive Dashboard**: Employees MUST have a real-time dashboard displaying their earned incentives, approved lead count, and monthly projected payout.
- **REQ-INC-005 [Should Have] Tiered Milestone Bonuses**: The incentive engine SHOULD support tiered bonus thresholds (e.g. bonus $100 upon reaching 50 approved leads in a calendar month).
- **REQ-INC-006 [Must Have] Team Incentive Option & Milestone Pools**: The system MUST allow Admins to configure team-level incentive pools triggered when a team collectively hits an approved lead milestone (e.g., $500 pool unlocked upon reaching 200 approved leads in a month).
- **REQ-INC-007 [Should Have] Team Leader Override Commissions**: The system SHOULD allow Admins to configure a per-lead override incentive for Team Leaders for every approved lead delivered by members of their team.

#### Acceptance Criteria for REQ-INC-003 & REQ-INC-006:
```gherkin
Scenario: Automated individual incentive generation upon lead approval
  Given an active Incentive Rule: Agent earns $15.00 per Approved lead in Campaign "USA Auto"
  And a lead created by Agent "Sarah Connor" currently in status "Uploaded"
  When the Admin reviews and clicks "Approve"
  Then the lead status updates to "Approved"
  And an IncentiveEarning record of $15.00 is generated for "Sarah Connor"
  And Sarah's incentive balance increases by $15.00 immediately

Scenario: Team reaches milestone target and unlocks Team Incentive Pool
  Given an active Team Incentive Rule: "Team Alpha" unlocks a $500 bonus pool upon reaching 200 Approved leads
  And Team Alpha currently has 199 Approved leads in the current month
  When an Admin approves another lead originating from a member of Team Alpha
  Then Team Alpha's approved lead tally reaches 200
  And the system credits the $500 Team Incentive Pool
  And member allocations or equal splits are calculated and displayed on the Team Dashboard
```

---

### 2.6 Team Creation & Campaign Mapping (`REQ-TEAM`)

- **REQ-TEAM-001 [Must Have] Team Structure**: Admins MUST be able to create teams with a Team Name, assigned Team Leader, and member Agents and Closers.
- **REQ-TEAM-002 [Must Have] Campaign Assignment**: Admins MUST be able to assign one or multiple Campaigns to a Team.
- **REQ-TEAM-003 [Must Have] Team Lead Monitoring**: Team Leads MUST be able to view attendance and lead performance for members of their assigned team.
- **REQ-TEAM-004 [Should Have] Closer Roster Filter**: When an agent selects a closer, the dropdown SHOULD prioritize closers assigned to the same team.

---

### 2.7 Dashboards & Workspaces (`REQ-DASH`)

- **REQ-DASH-001 [Must Have] Role-Based Home Redirection**: On login, users MUST be automatically routed to their role-appropriate view (`/admin` for Admins, `/dashboard` for Employees).
- **REQ-DASH-002 [Must Have] Admin Operational Summary**: The Admin dashboard MUST display KPI cards: Total Leads Today, Uploaded for Review, Approved Leads, Total Logged-In Staff, and Total Payouts Accrued.
- **REQ-DASH-003 [Must Have] Employee "My Leads" Table**: The Employee dashboard MUST provide a paginated, filterable view of all leads created by the logged-in agent.
- **REQ-DASH-004 [Must Have] In-Place Lead Editing**: Agents MUST be able to quickly edit notes, reschedule callbacks, or change status from their "My Leads" workspace.
- **REQ-DASH-005 [Should Have] Quick Search Bar**: Both dashboards SHOULD feature an instant search bar matching Customer Name, Mobile, Email, or Closer Name.
- **REQ-DASH-006 [Must Have] Dual-View Switcher (Data Grid & Interactive Kanban)**: Both the Admin Command Center and Employee Dashboard MUST provide a 1-click switcher between a high-density Table Data Grid and a Visual Pipeline Kanban Board.
- **REQ-DASH-007 [Must Have] Interactive Kanban Drag-and-Drop & Action Modals**: In Kanban mode:
  - **Employee Kanban:** Cards organized by status (`Voicemail`, `Uploaded`, `Pending Verification`, `Call Back`, `Approved`, `Rejected`).
  - **Admin Kanban:** Cards organized into triage columns (`Uploaded`, `Pending Verification`, `Call Back`, `Approved`, `Rejected`). Drag-and-drop transitions MUST enforce validation rules (e.g., prompt for rejection reason when dropped on `Rejected`; prompt for mandatory explanation when moving an already `Approved` lead).

---

### 2.8 Design System (`ui-ux-pro-max`) (`REQ-UI`)

- **REQ-UI-001 [Must Have] Genesoft Orange & Crisp White Theme**: The UI MUST embody Genesoft Infotech's brand identity with Vibrant Orange (`#F97316` / `#FF6600`) as primary brand color, Crisp Pure White (`#FFFFFF`) card surfaces, warm amber accents, and Emerald (`#10B981`) conversion buttons.
- **REQ-UI-002 [Must Have] Standardized Status Color Badges**:
  - `Voicemail`: Slate Grey (`#64748B`)
  - `Uploaded`: Sky Blue (`#0284C7`)
  - `Pending Verification`: Violet (`#8B5CF6`)
  - `Call Back`: Amber (`#F59E0B`)
  - `Approved`: Emerald (`#10B981`)
  - `Rejected`: Crimson (`#EF4444`)
- **REQ-UI-003 [Must Have] Dual Typography Pairing**: UI controls MUST use **Plus Jakarta Sans**; data tables, mobile numbers, timestamps, and currency values MUST use **Fira Code**.
- **REQ-UI-004 [Must Have] Light & Dark Liquid Glass Theme Toggle**: The system MUST provide an instant, persistent one-click toggle between Crisp White Light Mode and Deep Obsidian Slate (`#0B0F19`) Dark Mode across all views (Login, Admin, Agent Dashboard) with zero flash of unstyled content (FOUC).

---

### 2.9 High-Performance Text & Virtualization (`@chenglou/pretext`) (`REQ-PERF`)

- **REQ-PERF-001 [Must Have] Sub-DOM Text Measurement**: Multiline addresses and agent notes MUST be measured off-screen using `@chenglou/pretext` Canvas algorithms before table rendering.
- **REQ-PERF-002 [Must Have] 60 FPS Viewport Virtualization**: The "My Leads" and Admin Review tables MUST virtualize rows, mounting only visible rows to the DOM to guarantee 60 FPS scrolling across 10,000+ records.
- **REQ-PERF-003 [Must Have] Zero Cumulative Layout Shift (CLS)**: Precomputed heights via Pretext MUST eliminate row height flickering or jumping during rapid scroll.

---

### 2.10 Security, Authentication & RBAC (`REQ-SEC`)

- **REQ-SEC-001 [Must Have] Username Authentication (Admin-Created Only)**: User authentication MUST strictly use unique usernames (created and provisioned exclusively by the Admin) and hashed passwords (bcrypt) with secure HTTP-only JWT session cookies. Employee self-registration is strictly disallowed.
- **REQ-SEC-002 [Must Have] Role-Based Access Control (RBAC)**: All API routes and Server Actions MUST strictly enforce user role permissions (`ADMIN` vs `EMPLOYEE`).
- **REQ-SEC-003 [Must Have] Tenant Isolation of Data**: Employees MUST NOT be able to view or edit leads belonging to other agents unless explicitly assigned.
- **REQ-SEC-004 [Must Have] Input Sanitization**: All user inputs MUST be sanitized against XSS and SQL injection.
- **REQ-SEC-005 [Must Have] Admin Password Reset Authority**: Admins MUST possess the sole authority to change or reset any employee's password on demand. Non-admin roles MUST NOT have access to credential modification interfaces for other users.
- **REQ-SEC-006 [Must Have] Restricted Global IP Login Guard & Admin Anywhere Exemption**: Admins MUST be able to toggle system-wide IP restriction and maintain an office Global Public Static IP whitelist (WAN / leased lines). When enabled, non-admin logins from unauthorized Global IPs MUST be blocked. Admins MUST be exempt from IP restrictions, allowing administrative authentication from any global network location.

---

## 3. Requirements Traceability Matrix

| Requirement ID | Module / Feature Area | Target Component | Master Task Mapping |
|---|---|---|---|
| `REQ-DATA-001` - `007` | Lead Data Entry & Sources | Lead Form & API | `TASK-3.1`, `TASK-3.2` |
| `REQ-STAT-001` - `006` | Status Engine & Callbacks | Status Machine | `TASK-3.3`, `TASK-3.4` |
| `REQ-REV-001` - `005` | Admin Review & Audit | Admin Audit Queue | `TASK-4.1`, `TASK-4.2` |
| `REQ-HR-001` - `006` | Attendance & Leaves | Attendance Module | `TASK-2.1`, `TASK-2.2` |
| `REQ-INC-001` - `005` | Custom Incentive Engine | Incentive Engine | `TASK-2.3`, `TASK-2.4` |
| `REQ-TEAM-001` - `004` | Team & Campaign Mapping | Team Management | `TASK-2.5`, `TASK-5.1` |
| `REQ-DASH-001` - `005` | Admin & Employee Dashboards | App Router Pages | `TASK-4.3`, `TASK-4.4` |
| `REQ-UI-001` - `004` | Design System (`ui-ux-pro-max`) | Tailwind & Design System | `TASK-1.3`, `TASK-4.5` |
| `REQ-PERF-001` - `003` | Virtualization (`@chenglou/pretext`) | Virtualized Table Engine | `TASK-3.5`, `TASK-4.6` |
| `REQ-SEC-001` - `004` | Security, Auth & RBAC | NextAuth / Prisma Auth | `TASK-1.1`, `TASK-1.2` |
