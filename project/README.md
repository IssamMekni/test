# Real-Time Anomaly Detection Platform

A complete MVP that detects suspicious banking transactions in real time using **Kafka**, **Apache Spark Structured Streaming**, **PostgreSQL**, and **Streamlit**.

---

## Architecture

```
┌─────────────────┐     ┌───────────────┐     ┌──────────────────────┐     ┌──────────────┐
│  Node.js        │     │  Apache Kafka │     │  Apache Spark        │     │  PostgreSQL  │
│  Producer       │────▶│  (transactions│────▶│  Structured Streaming│────▶│  anomaly_db  │
│  (1 tx/sec)     │     │   topic)      │     │  (filter amount>1000)│     │              │
└─────────────────┘     └───────────────┘     └──────────────────────┘     └──────┬───────┘
                                                                                    │
                                                                           ┌────────▼───────┐
                                                                           │  Streamlit     │
                                                                           │  Dashboard     │
                                                                           └────────────────┘
```

**Workflow:**
1. **Node.js Producer** generates a random banking transaction every second and publishes it to the Kafka `transactions` topic.
2. **Spark Structured Streaming** consumes messages from Kafka, parses the JSON payload, and filters transactions where `amount > 1000`.
3. Suspicious transactions are written to the `suspicious_transactions` table in **PostgreSQL**.
4. The **Streamlit** dashboard polls PostgreSQL every 5 seconds and displays the results live.

---

## Technologies Used

| Component | Technology |
|-----------|-----------|
| Message Broker | Apache Kafka 7.5 (Confluent) + Zookeeper |
| Producer | Node.js + KafkaJS |
| Stream Processing | Apache Spark 3.5 Structured Streaming (PySpark) |
| Storage | PostgreSQL 15 |
| Dashboard | Streamlit |
| Containerization | Docker Compose |

---

## Project Structure

```
project/
├── producer/
│   ├── producer.js        # Kafka producer (Node.js)
│   └── package.json
├── spark/
│   ├── streaming.py       # Spark Structured Streaming job
│   └── requirements.txt
├── dashboard/
│   ├── app.py             # Streamlit dashboard
│   └── requirements.txt
├── sql/
│   └── init.sql           # PostgreSQL table creation
├── docker-compose.yml     # Kafka + Zookeeper + PostgreSQL
├── .env                   # Environment variables
└── README.md
```

---

## Prerequisites

- [Docker & Docker Compose](https://docs.docker.com/get-docker/)
- [Node.js ≥ 18](https://nodejs.org/)
- [Python ≥ 3.9](https://www.python.org/)
- [Java ≥ 11](https://adoptium.net/) (required by Spark)
- [Apache Spark 3.5](https://spark.apache.org/downloads.html) with `spark-submit` on your `PATH`

---

## How to Run

### 1. Start Infrastructure (Kafka + Zookeeper + PostgreSQL)

```bash
cd project
docker compose up -d
```

Wait ~30 seconds for all services to become healthy.

```bash
docker compose ps   # verify all services are "healthy" / "running"
```

### 2. Start the Node.js Producer

```bash
cd project/producer
npm install
node producer.js
```

You will see output like:
```
✅  Producer connected to Kafka broker.
📤  Sent: {"transaction_id":"tx_1001","user_id":"user_3","amount":1847,"location":"Sfax","timestamp":"2026-05-04T10:00:01"}
📤  Sent: {"transaction_id":"tx_1002","user_id":"user_7","amount":320,"location":"Tunis","timestamp":"2026-05-04T10:00:02"}
...
```

### 3. Start the Spark Streaming Job

```bash
cd project/spark
pip install -r requirements.txt

spark-submit \
  --packages org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.1,org.postgresql:postgresql:42.7.3 \
  streaming.py
```

Spark will download the required JARs on first run (~1–2 min). Suspicious transactions will be printed and saved to PostgreSQL.

### 4. Start the Streamlit Dashboard

```bash
cd project/dashboard
pip install -r requirements.txt
streamlit run app.py
```

Open your browser at **http://localhost:8501**

---

## Docker Commands

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start all services in the background |
| `docker compose down` | Stop and remove containers |
| `docker compose down -v` | Stop containers and delete volumes (fresh start) |
| `docker compose ps` | Show running containers |
| `docker compose logs kafka` | Tail Kafka logs |
| `docker compose logs postgres` | Tail PostgreSQL logs |

---

## Environment Variables (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `postgres` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `postgres` | PostgreSQL password |
| `POSTGRES_DB` | `anomaly_db` | PostgreSQL database name |
| `POSTGRES_HOST` | `localhost` | PostgreSQL host |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `KAFKA_BROKER` | `localhost:9092` | Kafka broker address |
| `KAFKA_TOPIC` | `transactions` | Kafka topic name |

---

## Anomaly Detection Rule

A transaction is flagged as **suspicious** when:

```
amount > 1000
```

---

## Database Schema

```sql
CREATE TABLE suspicious_transactions (
    id             SERIAL PRIMARY KEY,
    transaction_id VARCHAR(255),
    user_id        VARCHAR(255),
    amount         FLOAT,
    location       VARCHAR(255),
    timestamp      TIMESTAMP
);
```

---

## Troubleshooting

**Kafka not ready / producer connection refused**
> Wait a few more seconds and retry. Kafka takes ~20–30 s to start.

**Spark cannot find Kafka/PostgreSQL packages**
> Ensure you have internet access on first run — Spark downloads JARs from Maven Central.

**Streamlit shows "No suspicious transactions"**
> Make sure the producer and Spark job are both running. Spark processes data every 5 seconds.

**Port conflicts**
> Ensure ports `2181`, `9092`, `5432`, and `8501` are free on your machine.
