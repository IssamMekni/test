/**
 * Node.js Kafka Producer
 * Simulates real-time banking transactions and sends them to the
 * "transactions" Kafka topic every second.
 *
 * Usage:
 *   npm install
 *   node producer.js
 */

const { Kafka } = require("kafkajs");

// ─── Kafka client configuration ────────────────────────────────────────────
const kafka = new Kafka({
  clientId: "transaction-producer",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
  // Retry settings — useful while Kafka is starting up
  retry: {
    initialRetryTime: 300,
    retries: 10,
  },
});

const producer = kafka.producer();
const TOPIC = process.env.KAFKA_TOPIC || "transactions";

// ─── Helper: random integer in [min, max] ──────────────────────────────────
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Helper: random element from an array ──────────────────────────────────
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Transaction generator ─────────────────────────────────────────────────
const LOCATIONS = ["Tunis", "Sfax", "Sousse", "Nabeul"];
let txCounter = 1000;

function generateTransaction() {
  txCounter += 1;
  const amount = randomInt(10, 5000);
  const userId = `user_${randomInt(1, 20)}`;
  const location = randomChoice(LOCATIONS);
  const timestamp = new Date().toISOString().slice(0, 19); // e.g. 2026-05-04T10:00:00

  return {
    transaction_id: `tx_${txCounter}`,
    user_id: userId,
    amount: amount,
    location: location,
    timestamp: timestamp,
  };
}

// ─── Main: connect and send one message per second ─────────────────────────
async function run() {
  await producer.connect();
  console.log("✅  Producer connected to Kafka broker.");

  setInterval(async () => {
    const transaction = generateTransaction();
    const message = JSON.stringify(transaction);

    try {
      await producer.send({
        topic: TOPIC,
        messages: [{ value: message }],
      });
      console.log(`📤  Sent: ${message}`);
    } catch (err) {
      console.error("❌  Failed to send message:", err.message);
    }
  }, 1000); // send every 1 second
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑  Shutting down producer...");
  await producer.disconnect();
  process.exit(0);
});

run().catch(console.error);
