# Land Registration System — User & Operations Manual

*Digital immatriculation platform for the Republic of Cameroon — Fako Division (Buea) reference deployment.*

This manual explains how to **use** the system: who does what, in what order, and exactly which button each actor presses. It follows a land file as it travels from the citizen's application to the Land Register (Livre Foncier).

---

## 1. The two portals

The platform is split into two separate web applications:

| Portal | Who logs in | What it is for |
|--------|-------------|----------------|
| **Public Portal** (`client-public`) | Citizens and the general public | Apply for any land operation, follow **My Applications**, track a file, verify a title, read the public bulletin, file an opposition, download an issued certificate |
| **Officer Portal** (`client-officer`) | Government officials and the surveyor | Process files along the statutory chain, consult the registry, oversee the system |

A person only ever needs one portal. A citizen never signs into the Officer Portal, and an officer does their work only in the Officer Portal.

---

## 2. The actors (who does what)

Every account has a **role**. The role decides which queue you see and which actions are available to you. The system enforces this on the server — you physically cannot perform a step that belongs to another office, and **nobody can skip a step**.

### On the Public Portal

- **Citizen (Applicant)** — self-registers an account, files applications, uploads documents, follows progress in **My Applications** (including the exact reason whenever a file is queried or rejected), and downloads the certificate once issued. Also the person who verifies titles and can file oppositions.

### On the Officer Portal

1. **Sub-Divisional Officer (SDO)** — *Reception & Publication Desk.* Handles **first registrations only**: receives the file, issues the récépissé, orders the public notice. The SDO never sees transfers, partitions or mortgages.
2. **Surveyor (Géomètre)** — *Cadastral survey.* Demarcates boundaries for two kinds of jobs: first-registration bornages (after public notice) and **Registrar-commissioned carve-out surveys** (morcellements).
3. **Divisional Delegate** — *Dossier Assembly.* First registrations only: verifies the post-survey dossier and forwards it to the region.
4. **Regional Delegate** — *Regional registration.* First registrations only: reviews at regional level and opens the 30-day opposition window.
5. **Registrar / Conservateur Foncier** — *Land Register — the central authority.* Every operation on **already-titled land lands directly on his desk**: he verifies deeds against the register, commissions carve-out surveys, executes transfers, mortgages and releases on existing titles, issues child titles, clears first registrations, manages oppositions, and records ministerial title cancellations.

### Oversight / support roles (no file processing)

- **Governor / Chief** — read-only oversight; applications, documents and analytics.
- **Administrator (Admin)** — IT oversight only. Provisions officer accounts, sets system parameters (tax rate, opposition-window length, maintenance mode), reads the audit ledger and analytics. **The Admin never touches land files.**
- **Notary / Receiver** — accounts can be provisioned; no processing screens yet.

---

## 3. Getting an account

- **Citizens** self-register on the Public Portal → **Register** (name, email, phone, region, password).
- **Officers** do **not** self-register. The **Administrator** creates each official account from **Admin → Accounts**, choosing the statutory role. The system generates a **temporary password shown once**; the Admin passes it to the official privately.
- A **suspended** account cannot sign in. Only the Admin suspends or reactivates accounts.

---

## 4. The three statutory tracks

The application **type** chosen in the wizard decides which track the file follows. The tracks are enforced by the server's legal state machine.

### Track A — FULL first registration
*Types: Direct Registration, State Land, Transformation.*
The land has never been titled: full public procedure.

```
SUBMITTED → RECEIPTED (SDO) → PUBLISHED (SDO) → SURVEYED (Surveyor)
→ REGIONAL_REVIEW (Delegate → Region) → OPPOSITION_WINDOW (30 days)
→ CLEARED (Registrar) → TITLE_ISSUED (Registrar)
```

**Integrity rule:** at survey time the drawn polygon is geometrically checked against every titled parcel — any overlap with already-titled land **hard-blocks** the survey (the register never double-titles the same ground; the conflicting title numbers are reported).

### Track B — Registrar-led CARVE-OUT (morcellement)
*Types: Partial Alienation, Partition.*
Part of an **already-titled** parcel changes hands. The file goes **straight to the Registrar** — no SDO, no public notice, no opposition window — but a survey is mandatory because new boundaries are being created.

```
SUBMITTED (to Registrar) → SURVEY_ORDERED (Registrar commissions)
→ SURVEYED (Surveyor carves child from mother) → CLEARED (Registrar)
→ TITLE_ISSUED (child title issued; mother parcel reduced)
```

- The application **must name the mother Title Number**, which the wizard checks **live against the register** (must exist and be VALID).
- The **buyer/heir applies**, presenting the notarial act (partial alienation) or the court partition judgment (partition). The child title is issued in the applicant's name.
- The surveyor sees the **mother polygon locked on the map** and must draw the child parcel **entirely inside it** — the server rejects any polygon that crosses the mother boundary (PostGIS `ST_Within`).
- On issuance, the **mother parcel is geometrically reduced** (child subtracted, area recomputed) and the **mother title stays VALID** with its new, smaller consistency. Both sides of the mutation are appended to the ledger.

### Track C — REGISTRAR-DIRECT (entry on the existing title)
*Types: Total Alienation, Mortgage, Mortgage Release.*
The parcel and its survey already exist — nothing to demarcate. The deed goes **straight to the Registrar**, who verifies it and then **executes the entry on the existing title**. **No new title is ever created.**

```
SUBMITTED (to Registrar) → CLEARED (deed verified) → COMPLETED (entry executed)
```

- **Total Alienation (mutation totale)** — the buyer applies with the notarial deed of sale and the Title Number. On execution, the previous owner is retired and the buyer becomes the current owner. *The title number, volume and folio never change.* If the title carries an **active mortgage**, the transfer is **not blocked** — the Registrar sees a prominent warning and the charge follows the land to the new owner.
- **Mortgage (hypothèque)** — the owner applies with the notarial mortgage deed, the Title Number, and the **creditor + secured amount**. On execution, an ACTIVE encumbrance is inscribed on the title (visible to anyone who verifies it).
- **Mortgage Release (mainlevée)** — the owner applies with the **creditor's release deed** once the debt is settled. On execution, the matching mortgage is cleared from the title.

Two other statuses can appear on any file:
- **QUERIED** — sent back for correction (the citizen sees the exact reason in **My Applications**). On the full track the SDO re-opens it; on Registrar-led tracks the Registrar re-opens it.
- **REJECTED** — refused with a recorded reason (terminal).

---

## 5. Step-by-step: the citizen's journey

### Step 1 — Choose the type and fill the wizard
Log in → **Apply**. The 5-step wizard adapts to the chosen type:

- **Type** — one of the seven operations (the "How Registration Works" page explains each and can pre-select it).
- **Owner** — your civil status (état civil): parents, birth, nationality, profession, marital status/regime. For transfers this is the **acquirer's** identity — the new title/ownership will carry it.
- **Land** — depends on the type:
  - *First registrations:* full description of the parcel (plot, block, boundaries, developments, GPS pin).
  - *Partial Alienation / Partition:* the **mother Title Number** (checked live against the register — a green "VALID title on record" chip must appear) **plus** the description of the portion being acquired.
  - *Total Alienation / Mortgage / Mortgage Release:* just the **Title Number** (checked live) — and for mortgages, the **creditor** (and secured amount). No land description: the register already knows the parcel.
- **Documents** — see the table below.
- **Review** — check everything, tick consent, submit.

### Step 2 — Required documents by type

| Type | Required before submission |
|------|---------------------------|
| Direct Registration / State Land / Transformation | ID Card, Site Plan |
| Partial Alienation | ID Card, Site Plan, **Notarial Act** |
| Partition | ID Card, Site Plan, **Court Judgment / Inheritance Certificate** |
| Total Alienation | ID Card, **Notarial Act** (no site plan — parcel already registered) |
| Mortgage | ID Card, **Notarial Mortgage Deed** |
| Mortgage Release | ID Card, **Creditor's Release Deed (mainlevée notariée)** |

Files are PDF/JPG/PNG, max 5 MB each; extra documents can be attached under "Other". Submission is refused if a mandatory document is missing, and the mother title is re-validated server-side.

### Step 3 — Keep your reference number
On submission you receive a reference number like **`APP-2026-123456`** — it is how you track the file and how anyone opposes it (first registrations only).

### Step 4 — Follow your file
- **My Applications** (logged in) — every application with live status, the **full processing history**, the **exact reason** for any query or rejection, and a **Download Certificate** button once your Titre Foncier is issued.
- **Track Application** (public, no login) — enter the reference number for the status, the journey stepper, and the dated list of steps already taken.

---

## 6. Step-by-step: the officer chain

Each officer's **Action Queue** shows only files at their stage, in their region. Opening a file shows the dossier — including a **Source Title card** (mother title, current owner, active encumbrances) whenever the file operates on titled land — and a **"Your Action"** panel. Every action asks for confirmation and is written to the audit trail.

### 6.1 Sub-Divisional Officer (SDO) — first registrations only
- **SUBMITTED** → check documents → **Issue Récépissé** (→ RECEIPTED) or **Reject**.
- **RECEIPTED** → **Order Public Notice** (→ PUBLISHED; extract posted at SDO office, council, chiefdom) or **Raise a Query**.
- **QUERIED** → after correction, **Re-open File** (→ RECEIPTED) or **Reject**.

### 6.2 Surveyor
**Queue:** files in **PUBLISHED** (first-registration bornage) or **SURVEY_ORDERED** (carve-out commissioned by the Registrar — flagged with a "Carve-out from TF-…" chip).

The **Cadastral Survey Entry** screen provides:
- **Street map / Satellite imagery** basemap toggle (top-right of the map).
- The **polygon tool** to draw, and the **edit tool** to drag individual vertices afterwards.
- **GPS Coordinate Entry** — type the vertices read from the field instrument (one "latitude, longitude" per line) and **Plot Coordinates on Map**.
- **Live area** — the drawn polygon's geodesic area (m²) is computed as you draw; for carve-outs it also shows how much the mother will retain.
- **For carve-outs:** the **mother parcel is displayed as a locked amber boundary**; the child must be drawn entirely inside it. The client warns immediately, and the server hard-blocks any polygon outside the mother.
- **For first registrations:** the server hard-blocks any polygon that overlaps existing titled parcels.

Upload the **Procès-Verbal de Bornage** and the **Cadastral Plan**, then **Submit Survey** (→ SURVEYED). The parcel's legal area is recomputed from the polygon itself — never from a hand-typed figure.

### 6.3 Divisional Delegate — first registrations only
- **SURVEYED** → verify the dossier → **Forward to Regional Delegation** (→ REGIONAL_REVIEW) or **Return for Correction**.

### 6.4 Regional Delegate — first registrations only
- **REGIONAL_REVIEW** → **Open Opposition Window** (→ OPPOSITION_WINDOW; publishes the *avis de clôture de bornage* to the Public Bulletin; default 30 days, Admin-configurable) or **Reject / Query**.

### 6.5 Registrar / Conservateur Foncier — the central desk
The Registrar's queue mixes all three tracks:

**Carve-outs (Partial Alienation / Partition):**
- **SUBMITTED** → **Verify Deed — Order Carve-out Survey** (→ SURVEY_ORDERED), or Query/Reject.
- **SURVEYED** → **Approve Survey — Clear for Child Title** (→ CLEARED), or Return for Correction.
- **CLEARED** → **Issue Child Title** — creates the child title in the applicant's name, geometrically reduces the mother parcel (mother title stays VALID), generates the PDF, chains both sides of the morcellement to the ledger.

**Registrar-direct (Total Alienation / Mortgage / Release):**
- **SUBMITTED** → **Verify Deed — Clear for Registration** (→ CLEARED). For a transfer of a mortgaged title, a warning shows the charges that will carry over.
- **CLEARED** → **Execute** — the button is named for the act: *Execute Transfer (Mutation Totale)* / *Inscribe Mortgage (Hypothèque)* / *Release Mortgage (Mainlevée)*. The entry is made on the existing title and the file becomes **COMPLETED**.

**First registrations:**
- **REGIONAL_REVIEW** → **Open Opposition Window** (also available to the Regional Delegate).
- **OPPOSITION_WINDOW** → **Close Window — Clear for Title**, or **Log an Opposition**.
- **CLEARED** → **Issue Land Certificate** — *disabled while any opposition is ACTIVE* (mainlevée required first).
- **TITLE_ISSUED** → download the certificate.

**Queried registrar-led files** → **Re-open File** (→ back to SUBMITTED on his desk) or **Reject**.

---

## 7. Oppositions (first registrations only)

- Anyone may file an opposition against a reference number **while its 30-day window is open** — online from the Bulletin/Public Portal, no login required.
- An ACTIVE opposition **freezes title issuance**.
- Only the **Registrar** resolves it (**Resolve — mainlevée**, outcome Resolved or Withdrawn, with notes). He may also **Log an Opposition** received on paper.

---

## 8. The registry (Livre Foncier) — consultation only

**Titles** in the Officer Portal is now a **read-only register**: title numbers, current owners, areas, encumbrance flags, certificate download.

> **Every change to the register must arrive as an application.** The Transfer / Mortgage / Subdivide buttons no longer exist — transfers happen by executing a Total Alienation, charges by executing a Mortgage, splits by issuing a carve-out child title. The Registrar cannot touch anyone's title on his own initiative.

**The one exception — ministerial cancellation:** when the Minister of State Property orders the cancellation of a title, the Registrar uses **Cancel Title**. The dialog demands the **ministerial order reference**, shows an irreversibility warning, and requires an explicit confirmation tick before the act executes. The title is marked **CANCELLED** (never deleted), fails public verification from then on, and the act is chained to the audit ledger.

---

## 9. Verifying a title (public)

1. Public Portal → **Verify a Land Title** → enter **Title Number + Volume + Folio** (all required; QR links pre-fill them).
2. Pay the statutory search fee by mobile money (simulated): 31,000 FCFA individual / 62,000 FCFA company.
3. Receive the **Digital Certificate of Ownership**: VALID/CANCELLED badge, registered owner, and all **encumbrances** (an executed mortgage shows here; a released one shows as cleared). Printable and downloadable.

*(The free `validate` check used by the wizard only confirms a title exists and is VALID — it never discloses the owner.)*

---

## 10. Administrator tasks

- **Accounts (IAM)** — create official accounts (one-time temporary password), suspend/reactivate.
- **System Settings** — taxation rate, opposition-window length (days), maintenance mode.
- **Audit Ledger** — the tamper-evident hash chain now also records `TOTAL_ALIENATION`, `MORTGAGE_ADDED`, `MORTGAGE_RELEASED`, `PARTIAL_ALIENATION_SENDER/RECEIVER` (both sides of every carve-out) and `TITLE_CANCELLED` events.
- **Analytics** — KPIs and the map of titled parcels (shared with Governor and Registrar).

---

## 11. Quick reference — status → who acts → action

| Status | Meaning | Acts on it | Action |
|--------|---------|-----------|--------|
| DRAFT | Private, not yet submitted | Citizen | Complete & submit |
| SUBMITTED | Filed | SDO (Track A) · Registrar (Tracks B & C) | Récépissé / Verify deed |
| RECEIPTED | Receipt issued (A only) | SDO | Order Public Notice |
| PUBLISHED | Public notice posted (A) | Surveyor | Submit survey (overlap-checked) |
| SURVEY_ORDERED | Carve-out survey commissioned (B) | Surveyor | Carve child from mother (containment-checked) |
| SURVEYED | Boundary demarcated | Divisional Delegate (A) · Registrar (B) | Forward / Clear |
| REGIONAL_REVIEW | At regional level (A) | Regional Delegate / Registrar | Open Opposition Window |
| OPPOSITION_WINDOW | 30-day window open (A) | Public → oppose · Registrar → close/log/resolve | Clear / Mainlevée |
| CLEARED | Verified, no blockers | Registrar | Issue title (A) / Issue child title (B) / Execute entry (C) |
| TITLE_ISSUED | New title in the register (A & B) | Registrar / Citizen | Download certificate |
| COMPLETED | Entry executed on existing title (C) | — | Verify via public portal |
| QUERIED | Sent back for correction | SDO (A) · Registrar (B & C) | Re-open / Reject |
| REJECTED | Refused with reason (terminal) | — | Reason visible in My Applications |

---

## 12. Practical notes

- **Regions matter.** Officers only see files from their own region (reference deployment: Fako).
- **You cannot skip a step or do someone else's step.** The server rejects any illegal transition; the UI only shows the buttons that are legal for you right now.
- **The geometry is law.** Areas are computed from the surveyed polygons; carve-outs cannot leave the mother; first registrations cannot overlap titled land; the mother parcel shrinks automatically when a child title is issued.
- **Everything is logged.** Every receipt, publication, survey, clearance, execution, issuance, opposition, resolution and cancellation is chained into the tamper-evident ledger with actor, role and timestamp.
- **Keys:** the reference number is the citizen's key to tracking and opposition; **Title Number + Volume + Folio** is the public's key to verification.
