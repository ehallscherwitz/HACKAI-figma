# Vercel NOT_FOUND (404) – Fix and Concepts

## 1. The fix (what changed)

**vercel.json**
- **Before:** `"destination": "/api/index/$1"` – sent requests to `/api/index/api/v1/health`, which does **not** trigger `api/index.py` on Vercel.
- **After:** `"destination": "/api?__path=$1"` – sends every request to `/api`, which **does** trigger `api/index.py`. The original path is passed as `?__path=api/v1/health`.

**api/index.py**
- **Before:** Stripped prefix `/api/index` from the path. Useless because the function was never invoked for `/api/index/...`.
- **After:** Reads `__path` from the query string and sets `scope["path"]` to that value (with a leading `/`) so FastAPI sees the original path (e.g. `/api/v1/health`).

---

## 2. Root cause

**What the code was doing**
- Rewriting `/api/v1/health` → `/api/index/api/v1/health`.
- Assuming that any path starting with `/api/index` would be handled by `api/index.py`.

**What it needed to do**
- Send the request to the **exact** URL that Vercel uses to invoke the Python function: `/api` for `api/index.py`.
- Give the FastAPI app the **original** path so it could route to `/api/v1/health`.

**What actually happens on Vercel**
- Only certain paths map to serverless functions. For the `api/` directory, the mapping is:
  - `api/index.py` → invoked only for path **`/api`** (or `/api/index` in some setups).
  - Paths like `/api/index/something` or `/api/something` do **not** by default trigger the same file; Vercel looks for a function for that full path, finds none, and returns **404 NOT_FOUND** before your Python code runs.

**Misconception**
- Treating rewrites like a “forward to this handler with this path.” In reality, the **rewrite destination is the URL**. Only URLs that match a function’s path actually invoke that function. So the destination must be a path that Vercel has mapped to your function (here, `/api`), and the original path must be carried another way (here, `__path` query param).

---

## 3. Underlying concept

**Why NOT_FOUND exists**
- Vercel must decide “which serverless function runs for this URL?” If the URL after rewrites does not match any function’s path, it does not run any function and returns 404. That avoids running the wrong app and keeps the routing model clear.

**Mental model**
- **File path in repo** → **URL path** (e.g. `api/index.py` → `/api`).
- **Rewrite** only changes the URL the user is “sent to”; it does **not** by itself create new function routes.
- So: rewrite to a URL that **exactly** matches a function path; pass the “logical” path (e.g. for your FastAPI app) via query, header, or body and fix it in code.

**In the framework**
- Vercel’s routing is file-based: `api/<file>.py` → `/api/<file>`. There is no built-in “catch-all Python function” unless you use that single path and pass the rest via query/header.

---

## 4. Warning signs and similar mistakes

**Watch out for**
- Rewriting to a path that is “under” a function path (e.g. `/api/index/foo`) and assuming the function for `/api` or `/api/index` will run.
- Assuming the path the **function** sees is the original path; after a rewrite, the function often sees the **destination** path (and query).

**Similar mistakes**
- Putting the app in a subfolder but not setting Root Directory or not using a path Vercel maps to a function.
- Using a rewrite destination that doesn’t match any `api/` file (e.g. typo like `/api/indx`).

**Code smells**
- “We’ll rewrite everything to `/api/index/...`” without checking which path actually invokes `api/index.py`.
- Relying on “path prefix strip” middleware when the function is never invoked for that path.

---

## 5. Alternatives and trade-offs

| Approach | Trade-off |
|----------|-----------|
| **Current (rewrite to `/api?__path=$1` + middleware)** | Works with a single function; original path in query; no change to FastAPI routes. |
| **Root Directory = `backend`** | Build root is `backend`, so `api/` is not at repo root; Vercel may not find `api/index.py` unless it’s under that root. Easiest is one root with `api/` at top level. |
| **Separate Vercel project for backend** | Deploy only the backend repo/folder; no monorepo rewrites. Clear separation, more to manage. |
| **Host backend elsewhere (Railway, Render, Fly)** | No serverless path mapping; you control routing. Use Vercel for frontend only. |

---

## Quick check

After deploying:

- Open: `https://<your-project>.vercel.app/api/v1/health`
- You should get JSON like `{"status":"ok", ...}`.
- If you still get 404, check the deployment’s **Functions** tab and **Logs** to see which path was requested and whether `/api` was invoked.
