# GeoEnergy Intelligence AI

With rising geopolitical tensions reshaping energy markets overnight, consumers and stakeholders rarely have a clear way to understand how each headline actually impacts the commodities they depend on. That led me to create GeoEnergy Intelligence AI, an AI-driven dashboard for energy risk and stakeholder impact.

Most energy dashboards show you a price chart and leave you to figure out the rest. This one doesn't. It takes live commodity prices, geopolitical events, and cross-market signals and turns them into actual decisions, telling you who gets hurt, by how much, and what they should do about it. I built and trained the ML model behind it myself, along with the full RAG pipeline that grounds each analysis in real commodity intelligence data.

---

## Tech Stack

- **Frontend:** React 18 + Vite, Tailwind CSS
- **Backend:** Python FastAPI
- **ML / AI:** Custom-trained signal analysis model, RAG pipeline for commodity intelligence
- **Multi-LLM:** Anthropic Claude, Google Gemini, Groq (Llama 3), OpenAI (fallback)
- **Live Data:** EIA API, Alpha Vantage, NewsAPI, Guardian API

---

## Project Structure

```
GeoEnergyIntelligenceAI/
|
├── frontend/
|   └── src/
|       ├── components/
|       |   ├── dashboard/
|       |   |   ├── GeoRiskSection.jsx
|       |   |   ├── ExecutiveBriefing.jsx
|       |   |   ├── MarketPulseStrip.jsx
|       |   |   ├── SectorCards.jsx
|       |   |   ├── CrossMarketSignals.jsx
|       |   |   ├── IntelligenceFeed.jsx
|       |   |   └── LiveFeedBar.jsx
|       |   ├── Header.jsx
|       |   ├── Modal.jsx
|       |   ├── AlertsPanel.jsx
|       |   └── SettingsPanel.jsx
|       ├── pages/
|       |   ├── DashboardPage.jsx
|       |   ├── AIAnalysisPage.jsx
|       |   ├── GeoRiskPage.jsx
|       |   ├── CommoditiesPage.jsx
|       |   ├── HeadlinesPage.jsx
|       |   └── StatisticsPage.jsx
|       ├── services/
|       |   └── api.js
|       └── utils/
|           ├── helpers.js
|           ├── mockData.js
|           ├── sectorIntelligenceEngine.js
|           └── commodityIntelligence.js
|
├── backend/
|   ├── main.py
|   ├── rag_engine.py
|   ├── ml_feature_engine.py
|   ├── model_inference.py
|   ├── model_registry.py
|   ├── prediction_engine.py
|   ├── training_data_builder.py
|   ├── feature_engineering.py
|   ├── analysis_engine.py
|   ├── sentiment_engine.py
|   ├── news_impact_classifier.py
|   ├── structured_analysis.py
|   ├── stakeholder_impact_engine.py
|   ├── consumer_impact_engine.py
|   ├── signal_rules.py
|   ├── rule_engine.py
|   ├── statistics_engine.py
|   ├── commodity_profiles.py
|   ├── requirements.txt
|   └── .env.example
|
├── dataSources/
|   ├── aiAnalysisAdapter/
|   ├── geoRiskAdapter/
|   ├── newsAdapter/
|   ├── priceAdapter/
|   ├── satelliteAdapter/
|   └── weatherAdapter/
|
└── README.md
```

---

## Key Capabilities

- The AI analysis engine doesn't just forecast prices, it evaluates stakeholder impact for commodity holders, airlines, logistics firms, refiners, utilities, traders, and retail consumers based on live signals.
- For every Bull / Base / Bear scenario the model produces posture recommendations (HOLD / HEDGE / REDUCE / WAIT) per holder type — crude, gas, refined products, power, renewables, metals — and maps them to concrete business impacts like margin pressure, cost pass-through, and risk-off flows.
- There's a consumer-impact layer that translates commodity moves into real-world price effects including typical time lags, roughly 3–4 weeks from crude to gasoline, 6–8 weeks from natural gas to power bills — so the briefing tells you not just what's happening, but when it'll show up.
- Sector risk scoring traces each geo-risk or price shock through to airlines, shipping, manufacturing, agriculture, fuel retailers, and EV/battery supply chains, rather than just flagging a number turning red.

---

## What the AI Actually Analyzes

When a new signal comes in — whether it's a pipeline disruption, a sanctions headline, or a spike in freight rates — the engine works through a set of questions a real analyst would ask:

- What does this mean for people holding crude, gas, refined products, power contracts, or metals?
- Which sectors feel it first — airlines, logistics, utilities, refiners, traders, or consumers?
- How does it show up in everyday costs: pump prices, electricity bills, groceries, flights, heating?
- Does the move in crude get confirmed or contradicted by gold, copper, freight, and carbon signals?
- What should each type of holder actually do — hold, hedge, reduce, or wait?

The answer to each of those comes back as a structured briefing, not a chart.

---

## Features

- **Live Geo-Risk Map** — a tactical SVG world map with animated pulse markers over 8 critical energy chokepoints: Hormuz, Red Sea, Suez, Russia Transit, Eastern Mediterranean, Libya, West Africa, and the US Gulf Coast. Each marker is sized and colored by live risk score.
- **Stakeholder Impact Engine** — for every price move or geo-risk event the model evaluates exposure across crude holders, refiners, airlines, shippers, utilities, traders, and retail consumers rather than just surfacing a price spike.
- **Consumer Impact Layer** — models how commodity shocks propagate into real-world consumer prices, with built-in lag estimates so the briefing can say when the effect arrives, not just that it will.
- **Trained AI Analysis Model** — a custom-trained ML model I built using a RAG pipeline over live energy intelligence data. It outputs Bull / Base / Bear scenario probabilities with confidence-weighted posture guidance per holder type.
- **AI Executive Briefing** — written by the AI in plain language: why prices are moving, who's most exposed, and what different stakeholders should consider doing. Reads like a human analyst wrote it, not a template.
- **Sector Risk Scoring** — risk scores across Oil, Gas, LNG, Refining, Shipping, Power, and downstream sectors, updated in real time as new signals come in.
- **Cross-Market Signals** — gold, copper, freight, and carbon are surfaced alongside crude and gas so you can see whether the broader market is confirming the move or pushing back against it.
- **Market Pulse Strip** — real-time commodity price indicators with 7-day sparklines so you can see direction at a glance.
- **Live Intelligence Feed** — geopolitical headlines with sentiment scoring and impact tagging, pulled from NewsAPI and the Guardian.

---

## Project Overview

### How the data flows

Live data comes in through modular adapters in `dataSources/` — one for prices, one for geo-risk, one for news, and so on. Each adapter normalizes its source into a shared schema so the backend doesn't have to care where the data came from, only what it means.

### How the intelligence is built

Once the raw signals are in, the backend runs them through a pipeline. News gets classified for sentiment and impact direction. Commodity signals get feature-engineered into vectors the model can work with. The RAG engine pulls relevant commodity context from `commodity_profiles.py` to ground the analysis in domain knowledge before anything gets sent to an LLM. Then the ML model scores the situation and the structured analysis layer assembles it all into a briefing.

### How the stakeholder and consumer layers work

`stakeholder_impact_engine.py` takes the model's output and maps it to specific groups — which holder types are most exposed, what posture they should consider, and what the business impact looks like. `consumer_impact_engine.py` takes that a level further and estimates how the shock moves through supply chains into retail prices, with realistic time-lag estimates based on historical propagation patterns.

### What the frontend does with it

The React frontend renders all of this in real time. The tactical map gives you the geographic picture. The executive briefing card gives you the written analysis. The sector cards and cross-market panels let you drill into specific angles. The AI Analysis workspace lets you query any commodity directly and get a full structured briefing back.

---

## ML / RAG Model

I trained the AI Analysis model myself, building the training pipeline from scratch.

### Training Pipeline

- `training_data_builder.py` — pulls and labels training samples from historical commodity events, geopolitical incidents, and live API data
- `feature_engineering.py` — turns raw price, news, and risk inputs into structured feature vectors
- `ml_feature_engine.py` — handles feature extraction and normalization at inference time
- `model_registry.py` — manages versioned model snapshots so older versions can be compared or rolled back
- `model_inference.py` — loads the trained model and serves predictions through FastAPI

### RAG Pipeline

- `rag_engine.py` — retrieval-augmented generation over commodity intelligence documents; retrieves context before each LLM call so answers are grounded in actual domain knowledge, not just pattern-matching
- `commodity_profiles.py` — the structured commodity knowledge base the RAG engine retrieves from
- `sentiment_engine.py` — classifies news sentiment and impact direction per commodity
- `news_impact_classifier.py` — routes each news signal to the commodities and sectors it's most likely to affect
- `structured_analysis.py` — assembles the final briefing from all the scored components and sends it to the frontend

### Validations

- Confidence thresholds are applied before any signal gets surfaced in the UI — low-confidence outputs are filtered out rather than shown with a caveat
- Null-checks and range validation on all price and sentiment inputs before they hit the model
- Model output scores are clamped to a valid range before posture classification, so the output is always well-formed

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/prabhath17/GeoEnergyIntelligenceAI.git
cd GeoEnergyIntelligenceAI
```

### 2. Set up the backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Fill in your API keys in .env
uvicorn main:app --reload --port 8081
```

### 3. Set up the frontend

```bash
cd frontend
npm install
cp .env.example .env
# .env already contains: VITE_API_BASE_URL=http://localhost:8081
npm run dev
```

Open `http://localhost:5173`

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in your keys:

| Variable | Source |
|---|---|
| `EIA_API_KEY` | https://www.eia.gov/opendata |
| `ALPHA_VANTAGE_API_KEY` | https://www.alphavantage.co |
| `GUARDIAN_API_KEY` | https://open-platform.theguardian.com |
| `NEWS_API_KEY` | https://newsapi.org |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com |
| `GEMINI_API_KEY` | https://aistudio.google.com |
| `GROQ_API_KEY` | https://console.groq.com |
| `OPENAI_API_KEY` | https://platform.openai.com (optional fallback) |

---

## Sample Output

The following screenshot shows the live dashboard with the tactical geo-risk map, executive briefing, and sector intelligence panels.

![Dashboard](docs/dashboard_preview.png)

---

## Development Process

This wasn't a solo-in-a-vacuum build. Different tools played different roles at different stages.

The core application — the backend engines, the React frontend, the data pipeline, and the API integrations — was built hands-on. For certain parts of the implementation I worked with Codex, using it to accelerate specific sections of code while keeping full ownership of the architecture and logic decisions.

The training materials for the ML model came together with help from Perplexity — I used it to research commodity behavior patterns, geopolitical impact histories, and energy market dynamics, then shaped those findings into the training data and RAG knowledge base that the model actually learns from.

The result is a system where every layer — from the data adapters to the inference pipeline to the stakeholder impact logic — reflects deliberate design decisions, not just generated code.

---

## Built By

Prabhath Chigurupati
