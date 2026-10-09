# Free-Tier Backend Integration: Google Apps Script Web App

This directory provides the serverless integration layer to interact with Google Workspace APIs (**Google Classroom**, **Google Drive**, and **Gmail**) at **$0.00 cost** without requiring a Google Cloud billing account or Firebase Blaze plan.

## 🚀 3-Minute Deployment Guide

### Step 1: Create the Google Apps Script Project
1. Navigate to [https://script.google.com](https://script.google.com).
2. Click **New Project** and rename it to `LMS Free-Tier Integration API`.
3. Replace the contents of `Code.gs` with the code in [`gas-backend/Code.gs`](./Code.gs).

### Step 2: Enable the Google Classroom Advanced Service
1. On the left sidebar in the script editor, click the **+** next to **Services**.
2. Scroll to **Google Classroom API** (`Classroom`), select it, and click **Add**.

### Step 3: Set Your API Secret Key
1. Click the **Project Settings** gear icon ⚙️ on the left menu.
2. Scroll to **Script Properties** and click **Add script property**:
   - **Property:** `API_SECRET`
   - **Value:** Choose any secure password string (e.g. `my_secure_lms_secret_2026`).
3. Click **Save script properties**.

### Step 4: Deploy as a Web App
1. At the top right, click **Deploy** > **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in:
   - **Description:** `Production v1`
   - **Execute as:** `Me (your_google_account@...)`
   - **Who has access:** `Anyone` *(Note: Access is secured via the `API_SECRET` token checked in `Code.gs`)*.
4. Click **Deploy** and grant Google OAuth permissions when prompted.
5. Copy the generated **Web App URL** (e.g. `https://script.google.com/macros/s/AKfycbx.../exec`).

### Step 5: Configure Your React App
In your `lms-web-app/.env` file:
```env
VITE_GAS_API_URL=https://script.google.com/macros/s/AKfycbx.../exec
VITE_GAS_API_SECRET=my_secure_lms_secret_2026
```

---

## 🛡️ Architecture & Security
- **No Cloud Billing Required:** Runs on the Google Workspace consumer free tier quota (100 emails/day, Classroom API unbilled).
- **CORS-Free Transport:** The React client sends payloads as `text/plain`, preventing browser CORS preflight (`OPTIONS`) blocks on Google Apps Script redirection URLs.
- **Fail-Safe Mock Mode:** If `VITE_GAS_API_URL` is omitted in development, `src/services/api.js` automatically falls back to an in-memory simulation mode so UI development is never blocked.
