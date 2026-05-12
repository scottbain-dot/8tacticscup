# Tactics Cup — Setup Guide

You have three files that need to work together:

1. **`apps_script.gs`** — code that runs inside a Google Sheet (the backend)
2. **`teacher_dashboard_v4.html`** — where teachers log scores
3. **`student_leaderboard_v2.html`** — what students see in the gym

This guide walks through the one-time setup. Plan ~25 minutes. After that, it's just open-and-use.

---

## Part 1: Create the Sheet and add the Apps Script

### Step 1 — Create a new Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com)
2. Click the big **+ Blank** to make a new spreadsheet
3. Name it something like "Tactics Cup Backend"

### Step 2 — Open the Apps Script editor

1. In the Sheet, click **Extensions** in the top menu
2. Click **Apps Script**
3. A new tab opens with a code editor

### Step 3 — Paste the backend code

1. Delete any code that's already in the editor (probably an empty `myFunction()` block)
2. Open `apps_script.gs` from your downloads in any text editor
3. Copy ALL of it
4. Paste it into the Apps Script editor
5. Click the floppy-disk **Save** icon (or press Cmd/Ctrl+S)

### Step 4 — Initialize the Sheet (creates the 54 rows)

1. In the Apps Script editor, near the top there's a dropdown that says "Select function" — change it to **`setup`**
2. Click **Run**
3. Google will ask for permission ("Authorize required") — click through:
   - Click **Review permissions**
   - Choose your Google account
   - You'll see "Google hasn't verified this app" — click **Advanced** → **Go to [project name] (unsafe)** — this is OK because *you* wrote it
   - Click **Allow**
4. The script runs. Switch back to the Sheet tab — you'll see a new tab called **Scores** with 54 rows ready to go

### Step 5 — Deploy as a Web App

This is the bit that makes the script accessible from your HTML pages.

1. Back in the Apps Script editor, click the blue **Deploy** button (top right)
2. Click **New deployment**
3. Click the gear icon next to "Select type" → choose **Web app**
4. Fill in:
   - **Description**: "Tactics Cup API" (or anything)
   - **Execute as**: **Me** (your account)
   - **Who has access**: **Anyone** (this is required for the HTML pages to read it — note: "Anyone" means anyone *with the URL*, not anyone on the internet who might guess it)
5. Click **Deploy**
6. **COPY THE WEB APP URL** that appears. It looks like:
   ```
   https://script.google.com/macros/s/AKfycbXXXXXXXXXXXXXXXXXXXXXXXXXXXX/exec
   ```
7. Save this URL — you'll paste it into both HTML files in Part 2

> **Important**: If you ever change the Apps Script code, you need to deploy a **new version** for changes to take effect. Click Deploy → New deployment again. The URL stays the same.

---

## Part 2: Wire up the HTML files

### Step 6 — Paste the URL into `teacher_dashboard_v4.html`

1. Open `teacher_dashboard_v4.html` in any text editor (Notepad, TextEdit, VS Code — anything)
2. Find this line near the top of the `<script>` block:
   ```js
   const API_URL = '';
   ```
3. Paste your Web App URL between the quotes:
   ```js
   const API_URL = 'https://script.google.com/macros/s/AKfycbXXX.../exec';
   ```
4. Save the file

### Step 7 — Paste the same URL into `student_leaderboard_v2.html`

Same process — find `const API_URL = '';` and paste the URL between the quotes.

### Step 8 — Test it locally

1. Open `teacher_dashboard_v4.html` by double-clicking it (it opens in your browser)
2. The yellow "Backend not configured" banner should be gone
3. Top right should say **Connected** with a green dot
4. Click a cell, adjust some scores, give some awards
5. Open the Sheet — the **Scores** tab should be updating in real time

If it works locally, you're 95% done.

---

## Part 3: Host on GitHub Pages

### Step 9 — Make a GitHub repo

1. Go to [github.com](https://github.com) and sign in (make an account if you don't have one)
2. Click the **+** top right → **New repository**
3. Repository name: something like `tactics-cup`
4. Check **Public**
5. Check **Add a README file**
6. Click **Create repository**

### Step 10 — Upload your HTML files

1. In the new repo, click **Add file** → **Upload files**
2. Drag both files in (`teacher_dashboard_v4.html` and `student_leaderboard_v2.html`)
3. Click **Commit changes**

### Step 11 — Enable Pages

1. In the repo, click **Settings** (top right tab)
2. Scroll to **Pages** in the left sidebar
3. Under "Source", select **main** branch and **/ (root)** folder
4. Click **Save**
5. After a minute, you'll see your site URL, like:
   ```
   https://yourusername.github.io/tactics-cup/
   ```
6. The two pages are then accessible at:
   ```
   https://yourusername.github.io/tactics-cup/teacher_dashboard_v4.html
   https://yourusername.github.io/tactics-cup/student_leaderboard_v2.html
   ```

### Step 12 — Bookmark them

- Teachers bookmark the teacher dashboard URL
- The gym laptop opens the student leaderboard URL fullscreen (F11 in Chrome)
- All four teachers can score from their own laptops, all changes live in the Sheet, leaderboard shows everyone's data

---

## What to do if something breaks

### "Sync failed" or "Offline" on the dashboard
- Your Apps Script URL might be wrong — check it's pasted correctly between the quotes
- The Web App deployment might have expired or been revoked — redeploy from Part 1 Step 5

### Scores save but leaderboard doesn't update
- Refresh interval is 30 seconds — wait that long
- Hard refresh the leaderboard page (Cmd/Ctrl+Shift+R)

### Want to change the code?
- The HTML files: edit, save, re-upload to GitHub (or use GitHub's web editor to edit in place)
- The Apps Script: edit in the editor, save, then **Deploy → Manage deployments → edit the existing deployment → New version**. Make sure to actually deploy the new version or your changes won't reach the HTML pages.

### Want to share access with other teachers?
- They can use the teacher dashboard URL directly — no login needed because the Apps Script handles all the auth on the backend
- Be careful sharing the URL — anyone with it can edit scores

---

## A note on security

This setup is convenient but minimal. Anyone with the dashboard URL can edit any score. For a school PE tournament that's probably fine, but worth knowing:

- The Sheet itself is private (only you can see it as a Sheet)
- Only the Apps Script Web App URL is public — it acts as a controlled gateway
- If you want stricter access, you'd need to add authentication (Google sign-in, password, etc.) which is a much bigger lift

For now, treat the Apps Script URL like a password — don't post it publicly.
