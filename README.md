# UK Renewable Wind Day-Ahead Forecasting & Quantitative Accuracy Evaluation Portal

> **Full Stack Software Engineering Project for UK Wholesale Electricity Procurement Decisions**  
> Developed for UK Energy Utilities trading on the Day-Ahead Market using official **Elexon BMRS** data (January 2026).

---

## 📌 Executive Summary & Business Objective

In the UK wholesale power market, energy utility traders must procure electricity one day before delivery (**Day-Ahead Market**, closing before daily gate closure e.g. 11:00 or 12:00 UTC). Because consumer demand must be fulfilled continuously and wind energy is weather-dependent, procurement teams need to know:
1. **Latest Wind Forecast:** How much clean wind power is projected for each delivery period tomorrow, so they know how much supplemental thermal power (CCGT / gas plants) to purchase.
2. **Quantitative Accuracy Evaluation:** How historically reliable is this wind forecast? By quantifying the error (**MAE**, **RMSE**, **MAPE**, and **Directional Bias**), traders can establish smart risk margins and avoid costly cash-out imbalance penalties.

---

## 🚀 Live Demo & Repository
- **Live Deployed Application:** `https://your-app-name.vercel.app` (or Heroku/Render)
- **Repository Name:** Anonymous submission (`grid-wind-eval` / `kwjhr`)
- **Video Walkthrough (YouTube Unlisted):** `https://youtu.be/your-video-link`

---

## 📂 Project Architecture & Directory Structure

```
.
├── backend/                        # Python FastAPI Backend Service
│   ├── main.py                     # REST API endpoints, validation, CORS & health checks
│   ├── elexon.py                   # Elexon BMRS API connectors (FUELHH & WINDFOR) + File Cache
│   ├── metrics.py                  # Day-Ahead alignment, Hourly aggregation & Interpolation logic
│   ├── requirements.txt            # Python dependencies (FastAPI, uvicorn, requests, pandas)
│   ├── Dockerfile                  # Container definition for backend
│   └── cache/                      # Local JSON cache for fast sub-millisecond retrieval
│
├── frontend/                       # Modern React Dashboard (Vite)
│   ├── src/
│   │   ├── App.jsx                 # Main application dashboard (Charts, KPIs, Controls, Table)
│   │   ├── index.css               # Modern dark-mode styling, glassmorphism, responsive grid
│   │   └── main.jsx                # React DOM root entry
│   ├── index.html                  # HTML template with metadata
│   ├── package.json                # React, Recharts, Lucide-react dependencies
│   ├── nginx.conf                  # Production reverse-proxy configuration
│   └── Dockerfile                  # Multi-stage production container build
│
├── docker-compose.yml              # One-command orchestration for full stack
├── test.ipynb                      # Exploratory Data Analysis (EDA) Jupyter Notebook
├── original_data.csv               # Raw sample dump from initial API exploration
├── forecast.csv                    # Raw forecast stream dump from initial exploration
└── README.md                       # Comprehensive system documentation
```

---

## 💡 Key Engineering Highlights & Methodologies

### 1. Hands-On EDA & Discovery (`test.ipynb`)
Before jumping into coding, exploratory analysis of raw Elexon BMRS streams revealed two crucial real-world facts:
- **Causality & NWP Hindcasting:** Elexon's `WINDFOR` weather model runs include a 24-hour historical assimilation hindcast (`publishTime > startTime`). For authentic Day-Ahead decision making, we enforce a strict causality rule:
  $$\text{publishTime} \le \text{Gate Closure Cutoff} < \text{startTime}$$
- **Resolution Mismatch:** Actual outturn (`FUELHH`) is recorded half-hourly (**48 settlement periods/day**), whereas `WINDFOR` forecasts are released hourly (**24 slots/day**).

### 2. Dual Resolution Comparison Modes
To give utility traders and risk managers maximum flexibility, the portal implements two comparative methods:
- **Method 1: Hourly Aggregation (24 points):** Actual 30-minute readings are averaged over each hour to match hourly forecasts. This smooths intra-hour volatility.
- **Method 2: Settlement Period Interpolation (48 points):** Hourly forecasts are linearly interpolated into 30-minute intervals to match physical settlement periods (Period 1 to 48).

### 3. Quantitative Error Formulas
- **Mean Absolute Error (MAE):** $\text{MAE} = \frac{1}{N}\sum |Actual_t - Forecast_t|$
- **Root Mean Square Error (RMSE):** $\text{RMSE} = \sqrt{\frac{1}{N}\sum (Actual_t - Forecast_t)^2}$ (penalizes large sudden forecasting swings)
- **Forecast Bias:** $\text{Bias} = \frac{1}{N}\sum (Forecast_t - Actual_t)$ (identifies systematic over-forecasting vs under-forecasting)
- **Normalized MAE (%):** $\text{NMAE} = \frac{\text{MAE}}{\text{Mean}(Actual)} \times 100\%$

### 4. High-Performance Caching Layer
Instead of spamming third-party Elexon servers on every UI click, the backend automatically caches fetched datasets in `backend/cache/`. Subsequent queries respond in **0.0002 seconds (< 1ms)**.

---

## 🛠️ How to Run the Application

### Option A: Using Docker Compose (Recommended)
Make sure Docker is installed and running:
```bash
docker-compose up --build
```
- **Frontend Dashboard:** Open `http://localhost:3000`
- **FastAPI Documentation:** Open `http://localhost:8000/docs`

---

### Option B: Running Locally Without Docker

#### 1. Start Python Backend:
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```
Backend will run at: `http://localhost:8000`

#### 2. Start React Frontend:
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
Frontend will run at: `http://localhost:5173`

---

## 🎬 Video Demo Guide (10 Minutes Total)

### Part 1: Customer / Product Pitch (0:00 – 5:00)
- **Audience:** UK Energy Utility Power Procurement Team.
- **0:00 – 1:00 (The Problem):** "Hello! Today I'm excited to present the Day-Ahead Wind Decision Portal. As a UK electricity supplier, your team must decide on Day D-1 how much wholesale thermal power to buy to cover consumer demand. Wind is clean and cheap, but weather-dependent. Buying too little thermal leads to emergency imbalance penalties; buying too much wastes capital."
- **1:00 – 3:00 (The Solution & Live Walkthrough):** Show the dashboard. Select `2026-01-15`. Show the interactive chart. Point out the expected wind curve and how the trader knows the exact hourly deficit.
- **3:00 – 4:30 (Accuracy & Risk Metrics):** Highlight the KPI cards: MAE, RMSE, and Forecast Bias. Explain: *"On this day, the forecast exhibited a +1,550 MW over-forecast bias. By knowing this, your trading desk can adjust procurement downwards to save significant costs."*
- **4:30 – 5:00 (Resolution Toggle):** Demonstrate switching between Hourly (24 pts) and Settlement Periods (48 pts).

### Part 2: Technical Lead Review (5:00 – 10:00)
- **Audience:** Internal Engineering Tech Lead.
- **5:00 – 6:15 (EDA & Thought Process):** Open `test.ipynb`. Explain how you first inspected the raw Elexon streams in pandas, spotted the resolution difference (hourly vs half-hourly) and model hindcasting, leading to the decision-cutoff logic.
- **6:15 – 7:30 (Backend Architecture):** Walk through `backend/main.py`, `backend/elexon.py` (caching mechanism), and `backend/metrics.py` (vectorized math with pandas and clean error handling).
- **7:30 – 8:45 (Frontend & State):** Explain React + Recharts, responsive styling in `index.css`, and dynamic API querying with instant cached feedback.
- **8:45 – 9:30 (Production & Edge Cases):** Explain Docker setup, CORS configuration, handling month boundaries (e.g. Jan 1 requiring Dec 31 forecasts), and input validation.
- **9:30 – 10:00 (Conclusion):** Summary of clean code practices, maintainability, and testing.

---

## 🤖 AI Tools Disclosure
As permitted and requested in the challenge specification, AI developer tools (Gemini / Claude via Antigravity IDE) were utilized during the development of this project for brainstorming architectural patterns, scaffolding UI components, and refining documentation.
