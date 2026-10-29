# UK Renewable Wind Day-Ahead Forecasting & Quantitative Accuracy Evaluation Portal

> **Full Stack Software Engineering Solution for UK Wholesale Electricity Procurement Decisions**  
> Developed for UK Energy Utilities trading on the Day-Ahead Market using official **Elexon BMRS** data (January 2026).

---

## 🚀 Live Application & Repository
- **Live Deployed Application:** [https://kjhwr-lake.vercel.app/](https://kjhwr-lake.vercel.app/)
- **GitHub Repository:** [https://github.com/Mahajan-Sachin/kjhwr-](https://github.com/Mahajan-Sachin/kjhwr-)
- **Video Walkthrough (YouTube Unlisted):** *(Link submitted in Microsoft Form)*

---

## 📌 Executive Summary & Business Objective

In the UK wholesale power market, energy utility traders must procure electricity one day before delivery (**Day-Ahead Market**, closing before daily gate closure e.g. 11:00, 12:00, or 17:00 UTC). Because consumer demand must be fulfilled continuously and wind energy is weather-dependent, procurement desks need to know:
1. **Latest Wind Forecast:** How much clean wind power is projected for each delivery period tomorrow, so they know how much supplemental thermal power (CCGT / gas plants) to purchase.
2. **Quantitative Accuracy Evaluation:** How historically reliable is this wind forecast? By quantifying the error (**MAE**, **RMSE**, **MAPE**, and **Directional Bias**), traders can establish smart risk margins and avoid costly cash-out imbalance penalties.

---

## 📂 Project Architecture & Directory Structure

```
.
├── backend/                        # Python FastAPI Backend Service
│   ├── main.py                     # REST API endpoints, validation, CORS & health checks
│   ├── elexon.py                   # Elexon BMRS API connectors (FUELHH & WINDFOR) + Edge Cache
│   ├── metrics.py                  # Day-Ahead alignment, Hourly aggregation & Interpolation logic
│   ├── requirements.txt            # Python dependencies (FastAPI, uvicorn, requests, pandas)
│   ├── Dockerfile                  # Container definition for backend
│   ├── tests/                      # Automated Test Suite
│   │   └── test_metrics.py         # Pytest unit tests for math, API, and causality
│   └── cache/                      # Pre-bundled JSON cache for sub-2ms retrieval
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
├── api/                            # Vercel Serverless Backend Handler
│   └── index.py                    # Serverless ASGI bridge to FastAPI application
├── .github/workflows/              # Continuous Integration (CI)
│   └── ci.yml                      # GitHub Actions automated test & build pipeline
├── vercel.json                     # Vercel cloud deployment routing configuration
├── docker-compose.yml              # One-command orchestration for full stack
├── test.ipynb                      # Exploratory Data Analysis (EDA) Jupyter Notebook
├── original_data.csv               # Raw sample dump from initial API exploration
├── forecast.csv                    # Raw forecast stream dump from initial exploration
└── README.md                       # Comprehensive system documentation
```

---

## 💡 Key Engineering Highlights & Methodologies

### 1. Hands-On EDA & Discovery (`test.ipynb`)
Before jumping into coding, exploratory analysis of raw Elexon BMRS streams revealed two crucial domain facts:
- **Causality & NWP Hindcasting:** Elexon's `WINDFOR` weather runs frequently include 24-hour historical assimilation hindcasts (`publishTime > startTime`). For authentic Day-Ahead decision making, we enforce a strict temporal causality invariant:
  $$\text{publishTime} \le \text{D-1 Gate Closure Cutoff} < \text{startTime}$$
- **Resolution Mismatch:** Actual outturn (`FUELHH`) is recorded half-hourly (**48 settlement periods/day**), whereas `WINDFOR` forecasts are published hourly (**24 slots/day**).

### 2. Dual Resolution Comparison Modes
To provide utility traders and risk managers maximum flexibility, the portal implements two comparative methods:
- **Method 1: Hourly Aggregation (24 points):** Actual 30-minute readings are averaged over each hour to match hourly forecasts. This smooths intra-hour volatility for power exchange trading.
- **Method 2: Settlement Period Interpolation (48 points):** Hourly forecasts are linearly interpolated into 30-minute intervals to match physical settlement periods (Period 1 to 48) for grid code compliance.

### 3. Quantitative Error Formulas
- **Mean Absolute Error (MAE):** $\text{MAE} = \frac{1}{N}\sum |Actual_t - Forecast_t|$
- **Root Mean Square Error (RMSE):** $\text{RMSE} = \sqrt{\frac{1}{N}\sum (Actual_t - Forecast_t)^2}$ (penalizes large outlier forecast swings)
- **Forecast Bias:** $\text{Bias} = \frac{1}{N}\sum (Forecast_t - Actual_t)$ (identifies systematic over-forecasting vs under-forecasting)
- **Normalized MAE (%):** $\text{NMAE} = \frac{\text{MAE}}{\text{Mean}(Actual)} \times 100\%$
- **$R^2$ Variance Score & Pearson Correlation ($r$):** Quantifies waveform synchronization and trajectory tracking.

### 4. High-Performance Caching Layer
To ensure lightning-fast dashboard responsiveness and protect against third-party API rate limits or network latency, the backend features an automated disk caching layer (`backend/cache/`). Queries for evaluated milestones respond in **sub-2 milliseconds (< 0.002s)**.

---

## 🛠️ How to Run the Application Locally

### Option A: Using Docker Compose (Recommended)
Make sure Docker is running on your system:
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
Backend will be active at: `http://localhost:8000`

#### 2. Start React Frontend:
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
Frontend will be active at: `http://localhost:5173`

---

## 🧪 Automated Testing & CI/CD Pipeline

The project includes an automated test suite verifying data parsing, metric calculations, and edge cases:
```bash
# Run backend tests
python -m pytest backend/tests/
```

- **GitHub Actions CI (`.github/workflows/ci.yml`):** Automatically triggers on every push and pull request to `main`, validating:
  1. Python 3.11 environment setup and dependency installation.
  2. Pytest execution verifying all 5 core mathematical and causality tests pass.
  3. Node.js environment setup and production Vite build compilation.

---

## 🔒 Enterprise Security & Production Architecture Roadmap

While authentication was intentionally omitted in this submission to allow seamless evaluator review in incognito mode (per challenge guidelines), an enterprise deployment on a utility trading desk would incorporate:
1. **SSO (Single Sign-On):** Corporate identity integration via SAML 2.0 / OIDC with **Microsoft Entra ID (Azure AD)** or **Okta**.
2. **Role-Based Access Control (RBAC):**
   - **Power Trader:** Access to real-time wind curves, cutoff controls, and schedule bid exports.
   - **Risk Manager / Quant:** Access to error variance models, penalty thresholds, and historical backtesting.
   - **Auditor / Executive:** Read-only access to compliance reports and aggregate spend.
3. **Network Isolation:** Hosting within private VPC subnets with strict IP allowlisting and TLS 1.3 encryption.

---

## 🤖 AI Tools Disclosure

As permitted and requested in the challenge specification, AI developer tools (Gemini / Claude via Antigravity IDE) were utilized during the development of this project for brainstorming architectural patterns, scaffolding UI components, and refining documentation.
