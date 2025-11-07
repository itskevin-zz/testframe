# TestFrame

TestFrame is a lightweight test management UI for QA teams. It centralizes manual test cases, organizes them into reusable runs, and tracks execution outcomes so releases are easier to ship with confidence.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, React Router
- **Styling:** Tailwind CSS with a custom color system and Lexend typography
- **Data & Auth:** Firebase Authentication (Google SSO) + Cloud Firestore
- **Markdown:** `react-markdown` + `remark-gfm` for rich preconditions, steps, and notes

## Core Features

- **Google Sign-In & Protected Routes** – Auth context wraps the app, gating every page behind Firebase auth.
- **Dashboard Snapshot** – Quick actions to create runs/cases plus recent run stats (ID, owner, pass rate, status badges).
- **Test Case Management** – Filterable list with priorities, markdown-rich details, edit/run actions, and execution history drawer.
- **Test Runs** – Create runs from scratch or templates, track aggregated stats/progress bars, and jump into execution mode.
- **Execution Console** – Step through each case, capture actual results, status, notes, and auto-advance through the suite.
- **Settings Workspace** – Maintain components (product areas) and reusable test-run templates with preselected case lists.

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure Firebase**
   Create a Firebase project with Google authentication and Firestore enabled. Copy your config values into a `.env` file (Vite expects `VITE_` prefixed keys):
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
3. **Run the development server**
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` – Start Vite with HMR.
- `npm run build` – Type-check and build the production bundle.
- `npm run preview` – Serve the built app locally.
- `npm run lint` – Run ESLint across the project.

## Firebase Setup

1) Create a project and web app
- In Firebase Console, create a new project (or reuse one) and add a Web app to obtain your config (apiKey, authDomain, projectId, etc.).
- Authentication → Settings → Authorized domains: add your dev origin (e.g., localhost:5173) and any deployed domains you will use.

2) Enable Google Sign‑In
- Authentication → Sign‑in method → Add provider → Google → Enable.
- No SHA config is needed for web; ensure your domains are authorized.

3) Enable Cloud Firestore (Native mode)
- Firestore Database → Create database → Production mode → choose a region.
- Collections used by the app:
  - `components`
  - `testCases`
  - `testRuns`
  - `testCaseExecutions`
  - `testRunTemplates`

4) Add Firestore Security Rules (authenticated‑only baseline)
Adjust to your org later (e.g., ownership per user or domain constraints).
```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }

    match /components/{doc} { allow read, write: if isSignedIn(); }
    match /testCases/{doc} { allow read, write: if isSignedIn(); }
    match /testRuns/{doc} { allow read, write: if isSignedIn(); }
    match /testCaseExecutions/{doc} { allow read, write: if isSignedIn(); }
    match /testRunTemplates/{doc} { allow read, write: if isSignedIn(); }
  }
}
```

5) Create composite indexes (for certain filtered/ordered queries)
- `testCases`: `createdAt Desc, component Asc`
- `testCases`: `createdAt Desc, priority Asc`
- If Firestore shows an error with a link to create an index, follow it to generate the exact composite index needed for your data.

6) Set environment variables (Vite expects VITE_ prefix)
Create `.env` in the project root:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

7) (Optional) Seed data for a smoother first run
- In Settings → Components, add a few components (e.g., Authentication, Billing).
- Create a couple of Test Cases and then a Test Run; optionally create a Test Run Template for recurring suites.

8) Run locally
```bash
npm install
npm run dev
# open http://localhost:5173 and sign in with Google
```

9) Deploying later
- Add your production domain to Authentication → Authorized domains.
- Keep Firestore in Production mode and refine rules to your access model.

## Data Model Overview

| Collection             | Purpose                                                               |
|------------------------|-----------------------------------------------------------------------|
| `testCases`            | Individual manual cases with component, feature, priority, steps.     |
| `testRuns`             | Groupings of cases for a release/scope with statuses and metadata.    |
| `testCaseExecutions`   | Execution records tying a run to a case and capturing outcomes.       |
| `components`           | Product areas used to organize/filter test cases.                     |
| `testRunTemplates`     | Prebuilt bundles of cases for recurring suites (e.g., smoke tests).   |

TestFrame is intentionally minimal: it keeps teams focused on organizing their test knowledge, executing consistently, and seeing progress at a glance. Feel free to fork and adapt it for your own QA workflows.
