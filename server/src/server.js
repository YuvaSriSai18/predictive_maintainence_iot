// Express server setup with routes, MQTT, and WebSocket
import http from "http";
import express from "express";
import "dotenv/config";

import connectDB from "./config/db.js";
import deviceRoutes from "./routes/device.routes.js";
import sensorRoutes from "./routes/sensor.routes.js";
import alertRoutes from "./routes/alert.routes.js";
import { initializeSocket } from "./sockets/realtime.socket.js";
import { connectMQTT, disconnectMQTT } from "./config/mqtt.js";
import { saveSensorData, flushAllBatches } from "./services/ingestion.service.js";

const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Origin",
    process.env.FRONTEND_URL || "http://localhost:5173"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is running",
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/init-devices", async (req, res) => {
  try {
    const { saveSensorData } = await import("./services/ingestion.service.js");
    const Device = (await import("./models/Device.model.js")).default;
    
    const mockDevices = [
      { deviceId: "MOTOR_01", name: "Main Motor", location: "Warehouse A" },
      { deviceId: "PUMP_01", name: "Water Pump", location: "Warehouse B" },
      { deviceId: "COMPRESSOR_01", name: "Air Compressor", location: "Factory Floor" },
    ];
    
    for (const device of mockDevices) {
      await Device.findOneAndUpdate(
        { deviceId: device.deviceId },
        { ...device, status: "OPERATIONAL" },
        { upsert: true, new: true }
      );
      
      for (let i = 0; i < 20; i++) {
        const timestamp = new Date(Date.now() - (20 - i) * 10000);
        await saveSensorData({
          deviceId: device.deviceId,
          temperature: 70 + Math.random() * 15,
          vibration: 0.2 + Math.random() * 0.3,
          pressure: 30 + Math.random() * 10,
          timestamp: timestamp.toISOString(),
        });
      }
    }
    
    res.json({
      success: true,
      message: "Mock devices initialized with sensor data",
      devices: mockDevices.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.use("/api/devices", deviceRoutes);
app.use("/api/sensors", sensorRoutes);
app.use("/api/alerts", alertRoutes);

const server = http.createServer(app);
initializeSocket(server);

const startServer = async () => {
  try {
    console.log("\n🚀 Initializing Predictive Maintenance Backend...\n");

    await connectDB();
    console.log("✓ MongoDB connected");

    try {
      const mqttPromise = connectMQTT((topic, payload) => {
        const { deviceId, temperature, vibration, pressure, timestamp } = payload;

        console.log("\n📥 ═══════════════════════════════════════════════");
        console.log(`📥 MQTT Message Received from: ${topic}`);
        console.log("📥 ───────────────────────────────────────────────");
        console.log(`📥 Device ID:    ${deviceId}`);
        console.log(`📥 Temperature:  ${temperature}°C`);
        console.log(`📥 Vibration:    ${vibration}`);
        console.log(`📥 Pressure:     ${pressure}`);
        console.log(`📥 Timestamp:    ${timestamp}`);
        console.log("📥 ═══════════════════════════════════════════════\n");

        saveSensorData({
          deviceId,
          temperature,
          vibration,
          pressure,
          timestamp,
        }).catch((error) => {
          console.error("✗ Error processing sensor data:", error.message);
        });
      });

      await Promise.race([
        mqttPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("MQTT connection timeout")), 10000)
        )
      ]);
    } catch (mqttError) {
      console.warn("⚠️  Failed to connect to MQTT - continuing without MQTT support:", mqttError.message);
    }

    server.listen(PORT, () => {
      console.log("\n✓ Backend initialization complete\n");
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(
        `📊 Frontend URL: ${
          process.env.FRONTEND_URL || "http://localhost:5173"
        }`
      );
      console.log(
        `🗄️  MongoDB URI: ${
          process.env.MONGODB_URI ? "Configured" : "Not Configured"
        }`
      );
      console.log(
        `📡 MQTT Broker: ${
          process.env.MQTT_BROKER_URL ? "Configured" : "Not configured"
        }`
      );
      console.log("\n✓ Backend ready to receive MQTT + REST + WebSockets\n");
      console.log("✓ Mathematical health prediction enabled (3-min intervals)\n");
    });
  } catch (error) {
    console.error("✗ Failed to start server:", error.message);
    process.exit(1);
  }
};

const shutdown = () => {
  console.log("\n⚠ Shutting down server...");
  flushAllBatches().then(() => {
    disconnectMQTT();
    server.close(() => {
      console.log("✓ Server closed");
      process.exit(0);
    });
  }).catch((error) => {
    console.error("✗ Error flushing batches during shutdown:", error.message);
    disconnectMQTT();
    server.close(() => {
      console.log("✓ Server closed");
      process.exit(1);
    });
  });
};

process.on("SIGINT", () => {
  console.log("[SIGNAL] Received SIGINT");
  console.trace("[SIGNAL] Stack trace");
  shutdown();
});

process.on("SIGTERM", () => {
  console.log("[SIGNAL] Received SIGTERM");
  console.trace("[SIGNAL] Stack trace");
  shutdown();
});

process.on("exit", (code) => {
  console.log(`[DEBUG] Process exiting with code ${code}`);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

startServer();

setInterval(() => {}, 30000);
