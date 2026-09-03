# Project Requirements: Genesoft Infotech CRM

> [!IMPORTANT]
> ### 🛑 PROJECT GOVERNANCE & EXECUTION DIRECTIVE:
> 1. **STRICT PLANNING PHASE ONLY:** We are currently in the planning, brainstorming, and requirements alignment phase. **DO NOT PROCEED TO START CODING, SCAFFOLDING, OR IMPLEMENTATION** until the user explicitly gives final, unambiguous approval to begin.
> 2. **ZERO AI ASSUMPTIONS / USER-PROVIDED ONLY:** The AI assistant MUST NOT invent, guess, assume, or enter any fields, dummy data, workflows, or rules on its own. Everything must be asked directly and provided by the user.
> 3. **OFFICIAL LOGO GOVERNANCE:** The official company logo will be provided directly by the user (placed at `public/logo.png` / `public/logo.svg`). The AI assistant MUST NOT generate or create any mock, AI-hallucinated, or placeholder logo.

**Company Name:** Genesoft Infotech  
**Brand & Logo Colors:** **Vibrant Orange (`#FF6600` / `#F97316`) & Crisp White (`#FFFFFF`)**  
**Official Logo Asset Path:** `public/logo.png` / `public/logo.svg` (To be supplied directly by user)  
**Company Shift Hours:** 7:00 PM to 4:00 AM (Night Shift, 9 Hours)  
**System Type:** High-Velocity Data Entry & Sales Floor Operations CRM  
**Target Platform:** Web (Desktop-first for floor operations, responsive for management)  
**Current Status:** **PLANNING & SPECIFICATION GATHERING (IMPLEMENTATION FROZEN)**  
**Version:** 1.0.0 (Planning Blueprint)

---

## 1. Executive Summary & Company Context

**Genesoft Infotech** operates a high-intensity inside sales and lead generation floor running on a dedicated night shift schedule from **7:00 PM to 4:00 AM**. Agents handle high volumes of prospect conversations daily through dialers, manual calling, references, and custom outreach.

The visual theme directly embodies the **Genesoft Infotech brand identity**:
- **Primary Brand Theme:** Vibrant Orange (`#F97316`) and Crisp Pure White (`#FFFFFF`).
- **Dashboard Surfaces:** Pure white card surfaces with warm amber-orange accent borders in Light Mode; deep obsidian slate (`#09090B`) with subtle orange glow accents in Dark Mode for night shift eye comfort.
- **Header & Navigation:** Genesoft Infotech Orange & White emblem with real-time status indicators.

The CRM's primary objective is to replace disparate spreadsheets and fragmented tools with a centralized, ultra-fast **Data Entry and Lead Lifecycle Tracking Platform**. The system tracks the lifecycle of every lead from initial contact to closer handoff, enforces administrative approval gates, automates performance incentives, and centralizes daily workforce attendance and payroll data.

---

## 2. Core Business Principles & Non-Negotiables

1. **Lead Management is Data Entry First**:
   - The user interface must be optimized for speed. Frontline agents must be able to log a transferred lead within 15–30 seconds.
   - Zero unnecessary modal steps, minimal friction, clear tab-index ordering, and keyboard navigation.
2. **Strict Separation of Permissions & Admin Omnipotent Status Control**:
   - **Agents (Employees)** can only set operational floor statuses: `Voicemail`, `Uploaded`, `Pending Verification`, `Call Back`, or active `Custom Statuses`. Agents **CANNOT** mark a lead as `Approved` or `Rejected`.
   - **Admins** have full authority over all statuses:
     - Admins decide `Approved` and `Rejected` (with mandatory rejection reasons).
     - Admins **CAN ALSO change a lead's status to ANY other status** that agents have (e.g. `Voicemail`, `Call Back`, `Pending Verification`, `Uploaded`, or `Custom Status`).
     - **Mandatory Reason for Changing Approved Leads:** Once a lead is `Approved`, changing its status to any other status (e.g. moving back to `Voicemail` or `Rejected`) strictly requires the Admin to provide a **Mandatory Status Change Reason**. This action automatically adjusts/voids any linked employee incentives and writes an immutable audit log.
3. **Mandatory Callback Discipline**:
   - If a lead is marked as `Call Back`, selecting a **`Call Back Time`** is strictly mandatory.
4. **Transparent Individual & Team Incentives**:
   - Performance incentives must be computed automatically based on Admin-configured incentive rules whenever a lead is marked `Approved`.
   - Supports both **Individual Incentives** (for Agents and Closers) and **Team Incentives** (team-level milestone targets, pool bonuses distributed across members, and Team Leader override bonuses).
5. **Campaign-Configurable Working Hours & Night Shift Engine**:
   - Shift timings and operational hours can be **customized per Campaign** by the Admin (e.g. standard US Night Shift `19:00 – 04:00`, Late Night `20:00 – 05:00`, UK Shift, or Day Shift).
   - Each Campaign defines: `shiftStartTime`, `shiftEndTime`, and `lateGraceMinutes` (default 15 minutes grace).
   - Attendance and daily lead metrics are attributed to the **shift start date** (properly handling cross-midnight rollovers without duration math errors).
   - Late mark criteria: Log-in after `shiftStartTime + lateGraceMinutes` (e.g. after 7:15 PM for a 7:00 PM shift) is automatically flagged as `LATE` based on the active campaign's schedule.
6. **Accidental Log-Out Protection & Shift Continuity**:
   - Accidental clicks on **"Log Out"** must never penalize an employee's work hours, shift attendance, or pay.
   - Enforces a mandatory **Confirmation Prompt** ("End Shift / Log Out?") before finalizing.
   - Features an immediate **15-Minute "Resume Shift / Undo Log-Out" Grace Window**: If logged out mistakenly, the employee can resume instantly with all elapsed time merged seamlessly without gap penalty.
   - Supports **Multi-Session Shift Aggregation**: If re-logging in later during the same 7:00 PM – 4:00 AM shift, sessions aggregate into the daily shift total.
7. **Multiple Scheduled Break Timings & Custom Breaks Engine**:
   - The system must provide employees with dedicated **"Take Break"** controls during their active shift without requiring a full log-out.
   - **Floor-Mandated Multiple Break Timings (7:00 PM to 4:00 AM Shift):**
     1. **1st Break (First Refreshment / Tea Break):** ~09:30 PM to 09:45 PM (**15 Minutes**)
     2. **2nd Break (Main Dinner Break):** ~11:30 PM to 12:15 AM (**45 Minutes**)
     3. **3rd Break (Midnight Tea / Coffee Break):** ~02:00 AM to 02:15 AM (**15 Minutes**)
   - **Custom Breaks On-Demand:** Supports ad-hoc *Bio / Short Restroom Break*, *Team Meeting / Training Break*, and *Custom Break Reasons* entered by the employee or authorized by Admin.
   - Displays a live break counter counting elapsed break minutes, with instant one-click **"End Break / Resume Shift"**.
   - Admin Attendance Board reflects real-time break status (`ON_BREAK`), enforces break duration thresholds, and calculates:  
     $$\text{Net Productive Working Minutes} = \text{Gross Shift Logged Minutes} - \text{Total Break Minutes}$$
8. **Cross-Agent Duplicate Prevention (Per Campaign via Mobile Number)**:
   - Within the **same Campaign**, an agent **CANNOT** enter a duplicate lead already entered by another agent (enforced via unique Mobile Number).
   - **Cross-Campaign Flexibility:** The **same lead (same Mobile Number) CAN be entered across different Campaigns** (e.g. a customer pitched for Health Insurance can also be pitched for Auto Insurance in a separate campaign).
   - If an agent enters a mobile number that already exists in the *selected campaign*, the system immediately blocks submission: *"Duplicate Lead in Campaign: This mobile number was already entered in [Campaign Name] by Agent [Agent Name] on [Date] (Status: [Status])."*
   - If the mobile number exists in a *different campaign*, the system allows the entry and displays a helpful badge: *"Existing Customer in [Other Campaign Name]"*.
9. **Integrated Workforce Management**:
   - Employee attendance (**log-in / log-out**), multiple break tracking, leave applications, salary details, and team associations must reside directly within the CRM to eliminate multi-app switching.
10. **Strict Planning Governance, User Assets & Zero AI Assumptions**:
    - **No Unauthorized Implementation:** The project remains in active planning and discussion until the user explicitly issues the command to begin execution.
    - **User-Provided Assets Only:** The company logo and brand visuals will be provided directly by the user. Under no circumstances may the AI generate, assume, or insert mock or AI-hallucinated logos.
    - **Zero Unprompted Data/Workflows:** The AI assistant must ask the user for every operational field, parameter, and rule, rather than inventing or assuming values independently.
11. **Dual-View Kanban Board & Data Grid (For Both Admin & Employee)**:
    - Both the **Admin Dashboard** and the **Employee Dashboard** must offer seamless 1-click toggling between a **Data Grid (Table View)** and an **Interactive Kanban Board View**.
    - **Employee Kanban:** Visual pipeline cards organized into status columns: `Voicemail`, `Uploaded`, `Pending Verification`, `Call Back` (ordered chronologically by callback time with alert chips), `Approved`, `Rejected`, and active `Custom Statuses`.
    - **Admin Kanban:** Floor oversight board organized into triage columns: `Uploaded (Needs Review)`, `Pending Verification`, `Call Back`, `Approved (Incentive Credited)`, and `Rejected (With Reason)`. Supports drag-and-drop status transitions with required modal confirmations (e.g. mandatory rejection reason, approved reclassification explanation).
12. **Liquid Glass & Frosted Glassmorphism Theme (Vibrant Orange & White)**:
    - The application interface is designed with a premium **Liquid Glass** aesthetic:
      - **Frosted Translucent Surfaces:** Uses high-depth backdrop blur (`backdrop-filter: blur(18px) saturate(180%)`), translucent white layers (`rgba(255, 255, 255, 0.72 - 0.85)`), and glossy white borders (`1px solid rgba(255, 255, 255, 0.85)`).
      - **Refractive Specular Highlights:** Inner bevel glow (`inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.95)`) giving cards a genuine floating glass feel.
      - **Readability & Contrast:** Strict 4.5:1 accessibility contrast with deep slate text (`#0F172A`) ensuring live call data and metrics are immediately legible.
13. **Username-Based Authentication & Admin Password Authority (Admin-Provisioned Accounts Only)**:
    - Authentication strictly uses a unique **Username** instead of an email address.
    - User accounts and usernames can **ONLY be created and managed by the Admin**.
    - **Admin Password Reset Authority:** The Admin possesses sole authority to change, reset, or update the password of any user account in the system.
    - Employee self-registration is strictly disallowed; all credentials and credential changes are administered directly by management.
14. **Light & Dark Mode Liquid Glass Architecture**:
    - The CRM provides a prominent, persistent **Light / Dark Theme Toggle** across all views (Login, Admin, and Employee Workspaces).
    - **Daylight Mode:** Frosted crisp white glass surfaces with ambient vibrant orange gradients.
    - **Night Shift Mode (7:00 PM – 4:00 AM):** Deep obsidian glass (`#0B0F19`) with radiant neon orange accents and specular highlights, designed to reduce eye fatigue during nighttime call floor operations.
15. **Restricted Global IP Logins & Admin Whitelist Management (With Admin Anywhere Exemption)**:
    - System enforces a master **Global IP Whitelist Login Guard** managed directly by the Admin.
    - **Global Public IP (WAN) Enforcement:** Whitelisting strictly inspects and validates incoming traffic against the client's **Global Public IP address** (e.g. office leased-line static WAN IP via `cf-connecting-ip`, `x-real-ip`, `x-forwarded-for`), rather than local internal NAT subnets (`192.168.x.x`, `10.x.x.x`).
    - **Admin Anywhere Exemption:** The **Admin is globally exempt from IP whitelisting restrictions** and can authenticate from any global IP address or remote network (home, mobile cellular, traveling) for 24/7 administrative access.
    - **Employee Global IP Restriction:** When enabled, non-admin staff (**Agents, Closers**) are strictly blocked unless their request originates from an Admin-whitelisted Global Public Static IP.
    - Admin interface provides real-time Global Public IP detection, 1-click Global IP whitelisting, custom Global IP entry, and toggle activation.

---

## 3. Lead Generation Sources

The CRM must support lead intake categorized by four distinct acquisition channels:

| Source Code | Source Name | Description |
|---|---|---|
| `SRC_DIALER` | **Dialer** | Leads generated through predictive, auto, or power dialer integrations. |
| `SRC_MANUAL` | **Manual Dial** | Leads reached through direct manual telephone dialing by the agent. |
| `SRC_REF` | **Reference** | Referrals from existing clients, partners, or internal word-of-mouth. |
| `SRC_CUSTOM` | **Custom** | Inbound website inquiries, offline events, or specialized marketing lists. |

---

## 4. Agent Lead Data Entry Specifications

When an agent dials a prospect and successfully transfers the call to a Closer, the agent fills out the **Lead Entry Form**:

| # | Field Name | Data Type | Validation Rules | Operational Purpose |
|---|---|---|---|---|
| 1 | **Customer Name** | String | Required, Min 2, Max 120 chars | Full legal name of the prospect. |
| 2 | **DOB** | Date | Required, Valid date format (`YYYY-MM-DD`) | Date of birth for age eligibility and verification. |
| 3 | **Mobile** | String | Required, 10 digits, **Unique per Campaign** | Primary contact number. Instant duplicate check blocks entry if mobile exists in the same campaign under another agent. Permitted across different campaigns. |
| 4 | **Address** | Text | Required, Street, City, State, ZIP/PIN | Service/residential address. |
| 5 | **Email** | String | Required, RFC 5322 Email regex | Primary email for correspondence and confirmation. |
| 6 | **Campaign** | Relation / UUID | Required, Active campaign selection | Tracks marketing/calling campaign attribution. |
| 7 | **Lead Source** | Enum | Required: `Dialer`, `Manual Dial`, `Reference`, `Custom` | Channel attribution. |
| 8 | **Closer Name** | String / Relation | Required, Name of the Closer | Records which closer took the live call transfer. |
| 9 | **Lead Status** | Enum | Required (Agent options only) | Sets initial pipeline state. |
| 10 | **Call Back Time** | DateTime | **Required ONLY if Status is `Call Back`** | Schedules follow-up alerts and calendar slot. |
| 11 | **Agent Notes** | Text | Optional, Max 1000 chars | Summary notes on customer conversation and handoff. |

---

## 5. Status Lifecycle & Decision Governance

```
                    ┌─────────────────────────────────────────────────┐
                    │               AGENT ACTIONS                     │
                    └───────────────────────┬─────────────────────────┘
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               ▼                            ▼                            ▼
        ┌─────────────┐             ┌───────────────┐            ┌───────────────┐
        │  Voicemail  │             │   Call Back   │            │ Custom Status │
        └─────────────┘             └───────┬───────┘            └───────────────┘
                                            │ (Requires Time)
                                            ▼
                                   ┌────────────────┐
                                   │ Follow-up List │
                                   └────────────────┘
                                            │
               ┌────────────────────────────┴────────────────────────────┐
               ▼                                                         ▼
        ┌─────────────┐                                           ┌───────────────┐
        │  Uploaded   │                                           │Pending Verif. │
        └──────┬──────┘                                           └───────┬───────┘
               │                                                          │
               └────────────────────────────┬─────────────────────────────┘
                                            │
                    ┌───────────────────────▼─────────────────────────┐
                    │           ADMIN REVIEW QUEUE                    │
                    └───────────────────────┬─────────────────────────┘
                                            │
                            ┌───────────────┴───────────────┐
                            ▼                               ▼
                     ┌───────────────┐              ┌───────────────┐
                     │   APPROVED    │              │   REJECTED    │
                     └───────┬───────┘              └───────┬───────┘
                             │                              │
                    Triggers Incentive              Requires Reason
```

### Decision Rules:
1. **Agent Set Actions**:
   - `Voicemail`: Prospect did not answer; remains in agent's callback bucket.
   - `Call Back`: Prospect requested a callback; agent inputs date & time; system alerts agent at scheduled time.
   - `Uploaded`: Agent successfully pitched and transferred call; closer received it; ready for Admin review.
   - `Pending Verification`: Lead requires pre-verification check before final review.
   - `Custom Status`: Admin-defined workflow statuses (e.g. *Language Barrier*, *Underage*, *Duplicate*).
2. **Admin Decisions & Full Status Control**:
   - `Approved`: Lead passes all quality checks. System computes and records employee incentive.
   - `Rejected`: Lead fails quality or eligibility checks. Admin **must provide a Rejection Reason** (e.g., *Customer Refused, Unserviceable Area, Failed Audio Verification, Bogus Details*).
   - **Full Status Override:** Admin can change any lead to `Voicemail`, `Call Back` (setting callback time), `Pending Verification`, `Uploaded`, or any active `Custom Status`.
   - **Mandatory Reason for Changing Approved Leads:** Once a lead has been marked `Approved`, the Admin **CANNOT** change its status without entering a **Mandatory Status Change Reason**. The system opens a prompt stating: *"This lead is currently Approved. Enter a reason to change status to [New Status]"*. The reason is logged immutably, and associated incentives are automatically revoked/adjusted.

---

## 6. Functional Scopes: Admin vs. Employee Dashboards

### 6.1. Admin Command Center
- **Dual-View Lead Audit & Review (Table Grid & Kanban Board)**:
  - Seamless 1-click switcher between **Data Grid Table** and **Visual Kanban Board**.
  - **Admin Kanban Columns:** `Uploaded (Needs Review)`, `Pending Verification`, `Call Back`, `Approved (Incentive Credited)`, and `Rejected (With Reason)`.
  - Fast-action decision buttons & drag-and-drop: **[Approve]** and **[Reject with Reason]**.
  - **Full Status Selector Dropdown:** Admin can transition any lead to `Voicemail`, `Call Back`, `Pending Verification`, `Uploaded`, or `Custom Status`.
  - **Approved Reclassification Dialog:** If modifying an `Approved` lead, an enforcement dialog requires entering a mandatory reason before confirming the change.
  - Advanced search and filtering by Date, Campaign, Agent, Closer, Source, and Status.
- **Employee Workforce & Attendance Management (Log In / Log Out)**:
  - Central employee directory (Name, Email, Role, Team, Date of Joining, Status).
  - Daily **Attendance & Live Floor Board**: Real-time monitor of **Log-In Time**, **Log-Out Time**, Total Shift Hours, and Late indicators calibrated for the **7:00 PM to 4:00 AM** shift (with 7:15 PM late cutoff).
  - **Multiple Break Monitoring:** Real-time visibility into scheduled break status:
    - *1st Break (Evening Tea):* 09:30 PM – 09:45 PM (15 mins)
    - *2nd Break (Dinner):* 11:30 PM – 12:15 AM (45 mins)
    - *3rd Break (Midnight Tea):* 02:00 AM – 02:15 AM (15 mins)
    - *Custom Break:* Reason and live timer.
    - Automatic overstay flags if break limits are exceeded.
  - **Salary Master**: Base monthly pay, hourly rates, and payroll summaries.
- **Custom Incentive Structure Engine (Individual & Team Options)**:
  - Rule-based incentive builder:
    - *Individual Fixed Incentive:* Fixed payout per Approved Lead (e.g., $15 for Agent, $25 for Closer).
    - *Campaign-Specific Multiplier:* High-priority campaigns pay customized percentage/dollar bonuses.
    - *Individual Milestone Bonuses:* Extra rewards when an individual crosses 50/100 approved leads in a month.
    - *Team Incentive Option:*
      - **Team Milestone Pool:** Bonus pool awarded to the team upon achieving aggregate monthly targets (e.g. 200 approved leads across team).
      - **Team Leader Override:** Additional fixed commission per approved lead generated by any member of the team credited to the Team Leader.
      - **Equal or Weighted Member Split:** Option to distribute collective team bonuses evenly or pro-rata among team members.
- **Team Creation & Organization**:
  - Create teams (e.g., "Team Blue", "Outbound Alpha").
  - Assign Team Leads, link members (Agents & Closers), and associate specific Campaigns.
- **Custom Status Configuration**:
  - Create, modify, and color-code custom statuses.

### 6.2. Employee Self-Service Dashboard
- **Fast Lead Data Entry**:
  - Keyboard-optimized modal / drawer accessible from anywhere in the app (`Ctrl+N`).
- **Dual-View "My Leads" Workspace (Table Grid & Kanban Pipeline)**:
  - Seamless 1-click toggle between **Pretext Virtualized Table** and **Interactive Kanban Pipeline**.
  - **Employee Kanban Board Columns:** `Voicemail`, `Uploaded`, `Pending Verification`, `Call Back` (ordered by callback time with alert chips), `Approved`, `Rejected`, and active `Custom Statuses`.
  - Filterable table showing all leads generated by the logged-in employee.
  - Live status pills (`Voicemail`, `Call Back`, `Uploaded`, `Pending Verification`, `Approved`, `Rejected`).
  - Edit capabilities: Update status, reschedule callback time, or append notes.
- **Attendance Log In / Log Out (With Accidental Misclick Protection)**:
  - Prominent **Log In** / **Log Out** button with real-time shift timer (`19:00 - 04:00`).
  - **Misclick Confirmation Modal:** Clicking "Log Out" opens a clear confirmation dialog asking "Are you sure you want to end your shift and Log Out?"
  - **15-Minute "Resume Shift / Undo Log-Out" Banner:** If confirmed by mistake, a persistent alert banner remains active for 15 minutes allowing the employee to click "Resume Shift". The system seamlessly merges the session without deducting time or resetting daily shift metrics.
  - **Multi-Session Aggregator:** If logged out and logged in again later during the 7 PM – 4 AM window, work minutes accumulate continuously.
- **Multiple Scheduled Break & Custom Break Controls**:
  - Dedicated **"Take Break"** button in employee header during an active shift.
  - Break selector modal presenting:
    1. *First Refreshment / Tea Break* (15 min scheduled window at 09:30 PM)
    2. *Main Dinner Break* (45 min scheduled window at 11:30 PM)
    3. *Midnight Coffee / Tea Break* (15 min scheduled window at 02:00 AM)
    4. *Custom / Bio Break* (with mandatory reason field)
  - Active screen overlays a prominent break banner with live elapsed break timer, visual overstay warning, and an **"End Break / Resume Calling"** button.
  - Automatically pauses incoming assignments and marks agent as `ON_BREAK`.
- **Leave Management**:
  - Apply for leaves (Casual, Sick, Emergency) with date range and reason.
  - View leave balance and approval status from Admin/Team Lead.
- **Personal Incentive Tracker**:
  - Transparent dashboard displaying approved lead count, breakdown per lead, and projected incentive payout for the current month.

---

## 7. Performance & Quality Standards

- **Page Load & Interaction**:
  - Lead submission API round-trip under 200ms.
  - "My Leads" table initial render under 500ms for 5,000+ records via `@chenglou/pretext` sub-DOM virtualization.
- **Data Integrity**:
  - **Campaign-Scoped Mobile Uniqueness:** Composite unique constraint on `(mobile, campaignId)` prevents duplicate lead entries within the same campaign across agents, while allowing the same customer lead to be enrolled in different campaigns.
  - Immutable audit trail of every status change (who changed it, old status, new status, timestamp).
