# Deploying Raati AI to Render

This guide outlines the steps to deploy the **Raati AI** platform to [Render](https://render.com/). The project is split into two components: a **FastAPI backend** (Python) and a **Vite/React frontend** (TypeScript).

---

## Prerequisites

1. A [GitHub](https://github.com/) repository containing the project codebase.
2. A free or paid [Render](https://render.com/) account.
3. Your **OpenAI API Key** (and any other LLM API keys if used).

---

## 🛠️ Step 1: Deploy the Backend (FastAPI Web Service)

Since the backend is a dynamic Python server, it will be deployed as a **Web Service** on Render.

1. **Log in** to your Render dashboard and click **New +** > **Web Service**.
2. **Connect your Git Repository** containing the `raati-ai` codebase.
3. Configure the following settings:
   * **Name**: `raati-backend` (or a name of your choice)
   * **Region**: Select a region closest to your users.
   * **Branch**: `main` (or the branch you want to deploy)
   * **Root Directory**: `backend` *(This tells Render to run commands inside the `backend/` folder)*
   * **Runtime**: `Python`
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Expand the **Advanced** section to configure **Environment Variables**:
   * Add `OPENAI_API_KEY` with your OpenAI key.
5. Click **Create Web Service**.

> [!WARNING]
> **Data Persistence Notice:**
> The backend saves student sketches (`/backend/data/images`) and evaluation records (`/backend/data/results` and `results.csv`) on the local filesystem. 
> * **Free Instance:** Render's free tier uses an ephemeral filesystem. If the service restarts (due to inactivity or a redeployment), all uploads and history will be cleared.
> * **Persistent Disk (Recommended for Production):** To persist evaluations, you can attach a Render Persistent Disk in the **Disks** section of the service settings:
>   * **Name**: `raati-data`
>   * **Mount Path**: `/opt/render/project/src/backend/data`
>   * **Size**: `1 GB` (starts at $0.25/month; requires a paid Starter plan for the Web Service at $7/month).

Once deployed, copy your backend URL (e.g., `https://raati-backend.onrender.com`).

---

## 🌐 Step 2: Deploy the Frontend (Vite Static Site)

The frontend is a static React application and will be deployed as a **Static Site** (which is completely free on Render).

1. Go back to the Render dashboard and click **New +** > **Static Site**.
2. **Connect the same Git Repository**.
3. Configure the following settings:
   * **Name**: `raati-frontend` (or a name of your choice)
   * **Branch**: `main`
   * **Root Directory**: `frontend` *(This tells Render to run commands inside the `frontend/` folder)*
   * **Build Command**: `npm run build`
   * **Publish Directory**: `dist`
4. Expand the **Advanced** section to configure **Environment Variables**:
   * Add `VITE_API_URL` with the URL of your deployed backend (e.g., `https://raati-backend.onrender.com` without a trailing slash).
5. Click **Create Static Site**.

---

## 🔒 Step 3: Configure Redirects for React Router

Because the frontend uses client-side routing (`react-router-dom`), you need to instruct Render to redirect all requests to `index.html` so that deep links (e.g., `https://raati-frontend.onrender.com/dashboard`) resolve correctly instead of throwing a 404 error.

1. On your frontend static site dashboard on Render, go to **Redirects/Rewrites**.
2. Click **Add Rule**.
3. Configure the rule:
   * **Source**: `/*`
   * **Destination**: `/index.html`
   * **Action**: `Rewrite`
4. Save the rule.

---

## ⚡ Code Updates Already Applied

To prepare the codebase for this deployment:
* We created a centralized configuration file at `frontend/src/config.ts` which loads `import.meta.env.VITE_API_URL` dynamically.
* We updated the hardcoded API calls throughout the dashboard, evaluations page, history page, results page, and PDF generator to pull from this environment variable automatically. If `VITE_API_URL` is not provided (e.g., when running locally), it will gracefully fall back to `http://localhost:8000`.
