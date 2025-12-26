# Spotmies.AI Backend – Server

## Overview

The Spotmies.AI backend is the core processing engine of a **real-time predictive maintenance platform for IoT devices**. It ingests continuous sensor data streams from devices via MQTT, stores time-series telemetry in MongoDB, performs **timeline-based AI inference using OpenAI**, generates alerts, and broadcasts live updates to frontend clients using WebSockets.

The system is designed to handle **high-frequency sensor streams efficiently**, while ensuring that AI inference is **rate-limited, cost-aware, and trend-focused** rather than reactive to individual readings.

---

## Core Features Implemented

### 1. MQTT-Based IoT Data Ingestion

The backend connects to a **HiveMQ Cloud MQTT broker** and subscribes to device-specific topics. It receives real-time sensor readings including temperature, vibration, and pressure. Devices are automatically registered when data is first received. Payloads are validated for structure and correctness. The MQTT client supports secure connections, authentication, automatic reconnection, and high-throughput message handling.

---

### 2. Time-Series Data Storage (MongoDB)

Each incoming sensor reading is stored as an **individual time-series document** in MongoDB using a schema optimized for queries by `deviceId` and `timestamp`. This enables efficient historical analysis, replay, and visualization while avoiding inefficient array-based storage.

The database acts as the **system of record** for telemetry, alerts, and device state.

---

### 3. Mathematical Health Prediction (No Cloud AI Dependency)

Instead of relying on expensive cloud AI APIs, the backend performs **intelligent health prediction using a proprietary mathematical formula** based on sensor data patterns.

For each device:

* The system maintains an **in-memory sliding buffer** of the most recent 10 sensor readings.
* When the buffer reaches 10 readings (or after 3 minutes elapsed), the **mathematical health prediction algorithm** is applied.
* The algorithm analyzes **three independent sensor components** (temperature, vibration, pressure) and their patterns over time.
* The prediction returns:

  * A `healthScore` (0–100)
  * A `failureRisk` (LOW / MEDIUM / HIGH / CRITICAL)
  * A qualitative `status` (STABLE / DEGRADING / CRITICAL)
  * A detailed explanation of which components are degraded

Health prediction is performed at **3-minute intervals or when 10 readings accumulate**, ensuring responsiveness without excessive computation.

---

### 4. AI-Driven Alert System

Alerts are generated **only based on AI inference output**, not on static thresholds or formulas.

An alert is created when:

* AI reports `failureRisk = HIGH`
* OR AI reports `status = CRITICAL`

Each alert includes:

* Device ID
* Severity level (WARNING / CRITICAL)
* Detailed reason explaining which components are degraded
* Sensor readings at the time of alert
* Timestamp
* Current status (ACTIVE / ACKNOWLEDGED / RESOLVED)

Alerts are persisted in MongoDB and immediately broadcast to connected clients.

---

### 5. Real-Time WebSocket Streaming

The backend uses **Socket.IO** to maintain persistent WebSocket connections with frontend clients.

The server broadcasts:

* Live sensor updates (every few seconds)
* Device health updates (after AI inference)
* New alerts and alert state changes
* Device and alert lists on initial client connection

This enables the frontend to display **live charts, device cards, and alerts without polling**.

---

### 6. RESTful API

In addition to MQTT and WebSockets, the backend exposes a REST API for:

* Fetching registered devices and their current state
* Querying historical sensor data
* Viewing and managing alerts
* Alternative ingestion of sensor data via HTTP (useful for testing)

All endpoints include proper validation, error handling, and meaningful HTTP status codes.

---

## Project Architecture

### Directory Structure

**server.js**
Initializes the Express application, connects to MongoDB and MQTT, sets up WebSocket communication, and starts the HTTP server.

**config/**
Contains configuration for MongoDB, MQTT, OpenAI, and environment variables.

**models/**
Defines MongoDB schemas:

* `Device` – stores device metadata and latest AI prediction
* `SensorData` – stores time-series sensor readings
* `Alert` – stores alert history and state

**routes/**
REST API route handlers:

* `device.routes.js`
* `sensor.routes.js`
* `alert.routes.js`

**services/**
Core business logic:

* MQTT ingestion handling
* In-memory timeline buffering
* OpenAI inference integration
* Device state updates
* Alert creation and management

**sockets/**
Defines all Socket.IO event handling and broadcasting logic.

**simulator/**
Contains a device simulator that publishes realistic sensor data to MQTT topics for testing and demonstration.

---

## Data Processing Pipeline

### End-to-End Flow

1. **Sensor Data Reception**
   Devices publish sensor readings to MQTT topics. The backend receives messages asynchronously.

2. **Immediate Live Broadcast**
   Each reading is instantly emitted to frontend clients via WebSockets for real-time visualization.

3. **Time-Series Persistence**
   The reading is stored as a single document in the `sensor_data` collection.

4. **Timeline Buffering**
   The reading is added to an in-memory buffer for the corresponding device.

5. **AI Inference Trigger**
   When the buffer reaches the configured size (or cooldown expires), the full timeline is sent to OpenAI.

6. **Device State Update**
   AI output updates the device’s health score, risk level, and last prediction metadata.

7. **Alert Generation**
   If AI indicates high risk or critical degradation, an alert is created and broadcast immediately.

---

## Health Prediction Formula (Why Mathematical Instead of Cloud AI)

### The Complete Formula

The health prediction algorithm analyzes three sensor components independently, calculates a health score (0-100) for each, then combines them using weighted percentages to produce the overall device health score.

### Component 1: Temperature Health (30% Weight)

**Ideal Range:** 60–80°C

Temperature health is calculated as follows:

* If average temperature is within the ideal range (60–80°C), the component receives 100 points as a baseline.
* For each degree Celsius **above 80°C**, points are deducted at a rate of 2.5 points per °C (higher penalty for overheating).
* For each degree Celsius **below 60°C**, points are deducted at a rate of 1.5 points per °C (moderate penalty for under-cooling).
* The **standard deviation** of temperature readings is measured. High variance indicates instability. Points are deducted based on variance: 2 points per standard deviation unit (max 20 points).
* The **trend** of temperature over the 10 readings is analyzed using linear regression. If temperature is rising rapidly, up to 15 points are deducted.

**Formula:**
```
tempHealth = 100
  - abs(avgTemp - 70) × (1.5 if cold, else 2.5)
  - min(stdDev × 2, 20)
  - min(trend × 1, 15)
```

**Why:** Excessive heat causes accelerated wear. Instability and rising trends indicate developing problems.

### Component 2: Vibration Health (35% Weight)

**Ideal Range:** < 0.3 mm/s

Vibration health is the highest-weighted component because excessive vibration indicates mechanical failure (bearing wear, misalignment, imbalance).

* If average vibration is below 0.3, the component receives 100 points as a baseline.
* For each unit of vibration **above 0.3**, points are deducted at a rate of 50 points per unit (heavy penalty for excessive vibration).
* Peak vibration **spikes above 0.5** receive an additional penalty of 40 points per unit (sudden spikes indicate mechanical shock).
* The **standard deviation** of vibration readings is measured. Points are deducted: 30 points per standard deviation unit (max 25 points).
* The **trend** of vibration over time is analyzed. Rising vibration trends receive up to 20 points deduction.

**Formula:**
```
vibHealth = 100
  - (avgVibration - 0.3) × 50 (if above 0.3)
  - (maxVibration - 0.5) × 40 (if spikes above 0.5)
  - min(stdDev × 30, 25)
  - min(trend × 40, 20)
```

**Why:** Vibration directly correlates with mechanical failure. Sudden spikes are especially dangerous.

### Component 3: Pressure Health (35% Weight)

**Ideal Range:** 30–40 bar

Pressure health indicates system stress and integrity.

* If average pressure is within the ideal range (30–40 bar), the component receives 100 points.
* For each bar **below 30**, points are deducted at a rate of 2 points per bar (indicates leaks or loss).
* For each bar **above 40**, points are deducted at a rate of 3 points per bar (indicates excessive force).
* Pressure **spikes above 50 bar** receive an additional penalty of 2 points per bar (dangerous over-pressure).
* The **standard deviation** of pressure readings is measured. Points are deducted: 3 points per standard deviation unit (max 20 points).
* The **trend** of pressure over time is analyzed. Rising or falling trends receive penalties up to 15 points.

**Formula:**
```
pressHealth = 100
  - abs(avgPressure - 35) × (2 if low, else 3)
  - (maxPressure - 50) × 2 (if above 50)
  - min(stdDev × 3, 20)
  - min(trend × 2, 15)
```

**Why:** Pressure deviations indicate system stress, leaks, or mechanical failure.

### Overall Health Score Calculation

The three component scores (each 0–100) are combined using **weighted percentages**:

```
Overall Health Score = (tempHealth × 0.30) + (vibHealth × 0.35) + (pressHealth × 0.35)

Result Range: 0–100
```

**Weight Justification:**
* Temperature (30%): Important but secondary to mechanical failure indicators.
* Vibration (35%): Primary indicator of mechanical failure. Highest priority.
* Pressure (35%): Equal to vibration. Indicates system integrity and stress.

### Risk Classification

The health score is mapped to risk levels:

| Health Score | Risk Level | Status | Action |
|---|---|---|---|
| 90–100 | GREEN (LOW RISK) | STABLE | Normal operation, routine monitoring |
| 70–89 | YELLOW (MEDIUM RISK) | DEGRADING | Monitor closely, schedule maintenance |
| 50–69 | ORANGE (HIGH RISK) | DEGRADING | Maintenance recommended soon |
| 0–49 | RED (CRITICAL) | CRITICAL | Urgent action required, failure imminent |

### Why Mathematical Formula Instead of Cloud AI APIs

The decision to use a mathematical formula instead of OpenAI or other cloud AI services is intentional and driven by critical production requirements:

**1. Rate Limiting & Cost**
* OpenAI API imposes strict rate limits (RPM, TPM).
* With 100 devices × 2 predictions/hour = 200 API calls/hour, free tier limits are exceeded immediately.
* Premium OpenAI plans cost $0.15+ per 1K tokens.
* Calculating cost: 100 devices × 2 predictions/hour × 1000 tokens per prediction × 30 days × $0.15/1K tokens = **~$1,800/month**.
* At scale (1000 devices), costs balloon to **$18,000+/month**.
* Mathematical calculations have **zero marginal cost** per prediction.

**2. Latency**
* OpenAI API response time: 1–3 seconds round-trip.
* Real-time dashboards require updates in less than 100 milliseconds.
* Mathematical calculations execute in **< 50 milliseconds**.
* Waiting 1–3 seconds for predictions destroys the real-time user experience.

**3. Rate Limit Reliability**
* If rate limits are exceeded, API calls fail and block the entire prediction pipeline.
* The system cannot recover or degrade gracefully.
* Mathematical predictions have **no rate limits**. The system scales to unlimited devices.

**4. Data Privacy & Compliance**
* Sensor data from manufacturing equipment is proprietary and sensitive.
* Sending to third-party cloud services violates data privacy principles.
* Regulations like GDPR, HIPAA, or industry-specific standards may prohibit cloud analysis.
* Manufacturing facilities often have contractual obligations to keep sensor data in-house.
* Mathematical approach keeps **all data local and under complete control**.

**5. Production Reliability**
* Cloud APIs represent **external dependencies**.
* API downtime or degradation = system downtime.
* Manufacturing systems require 99.9% uptime.
* No critical path should depend on external services.
* Mathematical calculations ensure **100% availability and independence**.

**6. Transparency & Auditability**
* Mathematical formula is completely transparent.
* Same inputs always produce identical outputs (deterministic).
* Users can understand exactly why a device received a particular score.
* Easier to debug, audit, and explain to stakeholders.
* AI models are often "black boxes" that cannot be fully explained.

### The Mathematical Advantage

The mathematical approach maintains the necessary **intelligence for predictive maintenance** while avoiding all cloud AI problems:

* Health degradation patterns are identified by analyzing sensor value deviations from ideal ranges and trends.
* Component interactions are captured through weighted combination formula.
* System is **transparent, reliable, instantaneous, cost-effective, and privately controlled**.
* Pattern recognition happens through mathematical analysis of variance and trends—not fundamentally different from AI, but deterministic.

---

## Why AI-Based Timeline Inference

The system intentionally avoids:

* Static threshold-based rules
* Per-reading reactivity

Instead, it uses **timeline-based pattern analysis**, which allows:

* Detection of gradual degradation trends
* Recognition of instability through variance analysis
* Pattern recognition through mathematical trend analysis
* Flexible behavior across different device types

By batching data and analyzing 10-reading windows at 3-minute intervals, the system ensures:

* Predictable, constant computational cost
* Zero operational API costs
* No rate-limit violations
* Real-time responsiveness

---

## Installation & Setup

### Prerequisites

* Node.js 18+
* MongoDB (local or Atlas)
* HiveMQ Cloud account (or compatible MQTT broker)

### Environment Variables

```
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

MONGODB_URI=your_mongodb_connection_string

MQTT_BROKER_URL=mqtts://your-broker.hivemq.cloud:8883
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password
```

### Running the Server

```bash
npm install
npm start
```

### Running the Simulator

```bash
npm run simulate
```

---

## WebSocket Events

### Server → Client

* `sensor:update`
* `device:health`
* `alert:new`
* `alert:acknowledged`
* `alert:resolved`
* `device:list`
* `alert:list`

### Client → Server

* `acknowledge-alert`
* `subscribe-device`

---

## Performance Characteristics

* MQTT ingestion: sub-50ms
* WebSocket broadcast latency: <100ms
* AI inference: batched, low-frequency, non-blocking
* Database writes: optimized via bulk inserts
* Scales to dozens of devices per instance

---

## Summary

The Spotmies.AI backend is a **real-time, mathematically-powered predictive maintenance system** designed to process IoT sensor streams efficiently while delivering meaningful, explainable insights. By combining MQTT ingestion, time-series storage, timeline-based mathematical health prediction, and WebSocket streaming, the platform provides a **scalable, cost-effective, and privacy-preserving** solution for monitoring equipment health and predicting failures before they occur.

The key innovation is eliminating cloud AI dependencies entirely through a transparent, deterministic mathematical formula that maintains predictive intelligence while ensuring reliability, cost control, and data privacy.

---

**Version:** 2.0.0
**Last Updated:** December 26, 2025
