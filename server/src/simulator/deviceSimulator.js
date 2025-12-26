// IoT device simulator publishing mock data to MQTT
import mqtt from 'mqtt';
import dotenv from 'dotenv';

dotenv.config();

const isDirectExecution = process.argv[1].endsWith('deviceSimulator.js');

if (isDirectExecution) {
  console.log('\n🚀 Starting IoT Device Simulator...\n');

  if (!process.env.MQTT_BROKER_URL || !process.env.MQTT_USERNAME || !process.env.MQTT_PASSWORD) {
    console.error('\n✗ Missing MQTT configuration');
    console.error('  Required: MQTT_BROKER_URL, MQTT_USERNAME, MQTT_PASSWORD');
    process.exit(1);
  }

  const DEVICE_IDS = ['MOTOR_01', 'MOTOR_02', 'PUMP_01', 'COMPRESSOR_01'];
  const PUBLISH_INTERVAL = 3000;
  const FAILURE_TIME = 60000;

  const client = mqtt.connect(process.env.MQTT_BROKER_URL, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    clientId: `simulator-${Date.now()}`,
    reconnectPeriod: 2000,
    connectTimeout: 10000
  });

  const deviceStartTimes = new Map();

  client.on('connect', () => {
    console.log('✓ Simulator connected to HiveMQ Cloud');
    console.log(`Publishing to: ${process.env.MQTT_BROKER_URL}`);
    console.log(`Devices: ${DEVICE_IDS.join(', ')}`);
    console.log(`Interval: ${PUBLISH_INTERVAL}ms`);
    console.log(`Device failure simulation after: ${FAILURE_TIME}ms\n`);
    console.log('Press Ctrl+C to stop\n');

    DEVICE_IDS.forEach((deviceId) => {
      deviceStartTimes.set(deviceId, Date.now());
    });

    DEVICE_IDS.forEach((deviceId) => {
      setInterval(() => {
        const now = Date.now();
        const startTime = deviceStartTimes.get(deviceId);
        const elapsedTime = now - startTime;

        let temperature = 70 + Math.random() * 10;
        let vibration = 0.3 + Math.random() * 0.15;
        let pressure = 30 + Math.random() * 5;

        if (elapsedTime > FAILURE_TIME) {
          const degradationFactor = (elapsedTime - FAILURE_TIME) / 30000;
          temperature += degradationFactor * 20;
          vibration += degradationFactor * 0.5;
          pressure += degradationFactor * 15;
          console.log(`⚠️  ${deviceId} degradation: ${(degradationFactor * 100).toFixed(1)}%`);
        }

        const payload = {
          deviceId,
          temperature: parseFloat(temperature.toFixed(2)),
          vibration: parseFloat(vibration.toFixed(3)),
          pressure: parseFloat(pressure.toFixed(2)),
          timestamp: new Date().toISOString()
        };

        const topic = `iot/sensors/${deviceId}`;
        client.publish(topic, JSON.stringify(payload), { qos: 0 }, (err) => {
          if (!err) {
            console.log(`📡 Published [${deviceId}] T:${payload.temperature}°C V:${payload.vibration} P:${payload.pressure}`);
          }
        });
      }, PUBLISH_INTERVAL);
    });
  });

  client.on('error', (err) => {
    const errorMsg = err?.message || err?.toString() || 'Unknown error';
    console.error('\n✗ Simulator MQTT error:', errorMsg);
    console.error('  Broker URL:', process.env.MQTT_BROKER_URL);
    console.error('  Username:', process.env.MQTT_USERNAME);
    console.error('\n⚠️  Check your HiveMQ credentials in .env\n');
    process.exit(1);
  });

  client.on('reconnect', () => {
    console.log('🔄 Reconnecting to HiveMQ...');
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n⚠ Shutting down simulator...');
    client.end(true, () => {
      console.log('✓ Simulator stopped');
      process.exit(0);
    });
  });
}
