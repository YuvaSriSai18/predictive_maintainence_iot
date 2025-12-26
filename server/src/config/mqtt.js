// MQTT broker connection configuration
import mqtt from "mqtt";
import dotenv from "dotenv";

dotenv.config();

console.log("🚀 Starting MQTT Publish + Subscribe Client...");

const isMQTTConfigured = process.env.MQTT_BROKER_URL && 
  process.env.MQTT_USERNAME && 
  process.env.MQTT_PASSWORD;

if (!isMQTTConfigured) {
  console.warn("⚠️  MQTT_BROKER_URL, MQTT_USERNAME, or MQTT_PASSWORD not set - MQTT will be skipped");
}

let client = null;

if (isMQTTConfigured) {
  client = mqtt.connect(process.env.MQTT_BROKER_URL, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    clientId: `combined-${Date.now()}`,
    clean: true,
    reconnectPeriod: 2000,
    connectTimeout: 10000
  });
}

const SUBSCRIBE_TOPIC = "iot/sensors/#";

export const connectMQTT = (onMessageCallback) => {
  if (!isMQTTConfigured || !client) {
    console.warn("⚠️  MQTT is not configured - returning resolved promise");
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    // Set up event handlers only once
    let resolved = false;

    const onConnect = () => {
      if (resolved) return;
      console.log("✓ MQTT connected to HiveMQ Cloud");

      client.subscribe(SUBSCRIBE_TOPIC, { qos: 0 }, (err) => {
        if (resolved) return;
        resolved = true;
        if (err) {
          console.error("✗ Subscribe failed:", err.message);
          reject(err);
        } else {
          console.log(`✓ Subscribed to ${SUBSCRIBE_TOPIC}`);
          resolve(client);
        }
      });
    };

    const onError = (err) => {
      if (resolved) return;
      resolved = true;
      console.error("✗ MQTT error:", err.message);
      reject(err);
    };

    const onMessage = (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log("📥 Received:", topic, data);
        if (onMessageCallback) {
          onMessageCallback(topic, data);
        }
      } catch (err) {
        console.error("✗ Invalid JSON message");
      }
    };

    const onReconnect = () => {
      console.log("🔄 Reconnecting to broker...");
    };

    client.once("connect", onConnect);
    client.on("error", onError);
    client.on("message", onMessage);
    client.on("reconnect", onReconnect);
  });
};

export const disconnectMQTT = () => {
  if (client) {
    client.end(true, () => {
      console.log("✓ MQTT disconnected");
    });
  }
};

