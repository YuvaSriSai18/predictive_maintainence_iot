# Spotmies.AI – Predictive Maintenance Platform (Mathematical Inference)

## Overview

Spotmies.AI is a **real-time predictive maintenance platform for industrial IoT devices**. The system continuously ingests sensor data from devices, analyzes **patterns over time using deterministic mathematical models**, predicts equipment health degradation, generates alerts, and visualizes everything in a live dashboard.

The platform is designed to be **cost-effective, explainable, scalable, and production-ready**, eliminating dependency on external AI APIs while still delivering intelligent failure prediction through **timeline-based mathematical analysis**.

---

## Key Objectives

- Ingest high-frequency IoT sensor data in real time  
- Store telemetry efficiently as time-series data  
- Detect degradation patterns using **mathematical trend analysis**  
- Predict equipment health and failure risk  
- Generate actionable alerts  
- Provide a real-time, interactive monitoring dashboard  

---

## Core System Architecture

Spotmies.AI follows a **backend–frontend architecture** with real-time streaming:

- **IoT Devices → MQTT → Backend**
- **Backend → MongoDB (Time-Series Storage)**
- **Backend → WebSockets → Frontend Dashboard**

Static thresholds and per-reading reactions are avoided. Instead, **short timeline windows (5–10 readings)** are analyzed to detect trends, variance, and instability.

---

## Backend Capabilities

### 1. MQTT-Based Sensor Data Ingestion

- Secure connection to an MQTT broker (HiveMQ Cloud or compatible)
- Subscribes to device-specific topics
- Receives temperature, vibration, and pressure readings
- Automatically registers new devices
- Supports reconnection and high-throughput ingestion

---

### 2. Time-Series Data Storage (MongoDB)

- Each sensor reading stored as an individual document
- Indexed by `deviceId` and `timestamp`
- Optimized for historical queries and visualization
- MongoDB acts as the **system of record** for telemetry, alerts, and device state

---

### 3. Timeline-Based Mathematical Health Prediction

- Maintains an in-memory buffer of recent readings per device
- Prediction triggers when buffer size or time threshold is reached
- Analyzes:
  - Average values
  - Variance (stability)
  - Trend direction
- Produces deterministic, explainable results

---

### 4. Health Score Calculation

**Sensor Components & Weights**
- Temperature – 30%
- Vibration – 35%
- Pressure – 35%

**Output**
- `healthScore` (0–100)
- `failureRisk` (LOW / MEDIUM / HIGH / CRITICAL)
- `status` (STABLE / DEGRADING / CRITICAL)
- Explanation of degraded components

---

### 5. Intelligent Alert System

- Alerts generated only after health inference
- Triggered by HIGH or CRITICAL risk levels
- Alert data includes:
  - Device ID
  - Severity
  - Reason
  - Sensor snapshot
  - Timestamp
  - Status lifecycle
- Persisted in MongoDB and streamed instantly

---

### 6. Real-Time WebSocket Streaming

- Powered by Socket.IO
- Broadcasts:
  - Live sensor updates
  - Health score updates
  - Alerts and alert state changes
  - Device and alert lists
- Eliminates polling

---

### 7. REST API Layer

- Fetch devices and current state
- Query historical sensor data
- View and acknowledge alerts
- Optional HTTP-based sensor ingestion
- Proper validation and error handling

---

## Frontend Capabilities

### Real-Time Monitoring Dashboard

- Displays all registered devices
- Shows live health score, risk level, and status
- Color-coded indicators
- Instant updates via WebSockets

---

### Live Sensor Visualization

- Temperature, vibration, and pressure charts
- Sliding time window
- Raw sensor values (no frontend calculations)
- Real-time updates

---

### Device Detail View

- Live and historical charts
- Latest health prediction
- Component-level breakdown
- Clear reasoning for degradation

---

### Alerts Management

- Real-time alert feed
- Severity-based styling
- Acknowledge and resolve alerts
- Persistent history

---

## Why Mathematical Inference Instead of Cloud AI

- **Zero per-prediction cost**
- **No rate limits**
- **Millisecond-level inference**
- **No external dependencies**
- **Full data privacy**
- **Deterministic and explainable logic**

---

## Installation & Setup

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- MQTT broker (HiveMQ Cloud or Mosquitto)

### Environment Variables

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

MONGODB_URI=your_mongodb_connection_string

MQTT_BROKER_URL=mqtts://your-broker.hivemq.cloud:8883

MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password
```

## Running the Backend

```bash
npm install
npm start
```
## Running the Simulator
```bash
npm run simulate
```

## WebSocket Events

### Server → Client

- `sensor:update`
- `device:health`
- `alert:new`
- `alert:acknowledged`
- `alert:resolved`
- `device:list`
- `alert:list`

### Client → Server

- `acknowledge-alert`
- `subscribe-device`

---

## Performance Characteristics

- MQTT ingestion: **< 50ms**
- Health inference: **< 30ms**
- WebSocket broadcast: **< 100ms**
- Optimized MongoDB queries
- Scales to multiple devices per instance

---

## Summary

Spotmies.AI is a **real-time, mathematically driven predictive maintenance platform** that transforms raw IoT sensor data into actionable insights. By combining MQTT ingestion, time-series storage, deterministic timeline-based analysis, alerting, and live visualization, the system delivers a **scalable, explainable, and cost-effective solution** for monitoring equipment health and predicting failures.
