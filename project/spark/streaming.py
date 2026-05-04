"""
Spark Structured Streaming Job
================================
Reads banking transactions from Kafka topic "transactions",
detects suspicious ones (amount > 1000), prints them to the console,
and stores them in the PostgreSQL "suspicious_transactions" table.

Prerequisites (run once):
    pip install -r requirements.txt

    # Download the Kafka + PostgreSQL JARs that Spark needs:
    mvn / wget — handled automatically via spark --packages flag.

Run:
    spark-submit \\
        --packages org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.1,org.postgresql:postgresql:42.7.3 \\
        streaming.py
"""

import os
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, from_json, to_timestamp
from pyspark.sql.types import StructType, StructField, StringType, DoubleType

# ─── PostgreSQL connection details ────────────────────────────────────────
PG_HOST     = os.getenv("POSTGRES_HOST", "localhost")
PG_PORT     = os.getenv("POSTGRES_PORT", "5432")
PG_DB       = os.getenv("POSTGRES_DB",   "anomaly_db")
PG_USER     = os.getenv("POSTGRES_USER", "postgres")
PG_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
PG_TABLE    = "suspicious_transactions"
PG_URL      = f"jdbc:postgresql://{PG_HOST}:{PG_PORT}/{PG_DB}"

# ─── Kafka connection details ─────────────────────────────────────────────
KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
KAFKA_TOPIC  = os.getenv("KAFKA_TOPIC",  "transactions")

# ─── Checkpoint directory (required for Structured Streaming) ─────────────
CHECKPOINT_DIR = "/tmp/spark_checkpoint"

# ─── Transaction JSON schema ──────────────────────────────────────────────
TRANSACTION_SCHEMA = StructType([
    StructField("transaction_id", StringType(), True),
    StructField("user_id",        StringType(), True),
    StructField("amount",         DoubleType(), True),
    StructField("location",       StringType(), True),
    StructField("timestamp",      StringType(), True),
])

# ─── SparkSession ─────────────────────────────────────────────────────────
spark = (
    SparkSession.builder
    .appName("AnomalyDetection")
    .config("spark.sql.shuffle.partitions", "2")  # keep it lightweight locally
    .getOrCreate()
)
spark.sparkContext.setLogLevel("WARN")

# ─── Read stream from Kafka ───────────────────────────────────────────────
raw_stream = (
    spark.readStream
    .format("kafka")
    .option("kafka.bootstrap.servers", KAFKA_BROKER)
    .option("subscribe", KAFKA_TOPIC)
    .option("startingOffsets", "latest")
    .option("failOnDataLoss", "false")
    .load()
)

# ─── Parse JSON payload ───────────────────────────────────────────────────
# Kafka delivers the message body in the "value" column as binary
parsed = (
    raw_stream
    .selectExpr("CAST(value AS STRING) AS json_str")
    .select(from_json(col("json_str"), TRANSACTION_SCHEMA).alias("data"))
    .select("data.*")
    .withColumn("timestamp", to_timestamp(col("timestamp"), "yyyy-MM-dd'T'HH:mm:ss"))
)

# ─── Filter: suspicious if amount > 1000 ─────────────────────────────────
suspicious = parsed.filter(col("amount") > 1000)


# ─── Write each micro-batch to PostgreSQL ────────────────────────────────
def write_to_postgres(batch_df, batch_id):
    """Called for every micro-batch; writes suspicious rows to PostgreSQL."""
    if batch_df.isEmpty():
        return

    # Print to console for visibility
    print(f"\n🚨  Batch {batch_id}: {batch_df.count()} suspicious transaction(s)")
    batch_df.show(truncate=False)

    # Write to PostgreSQL using JDBC
    (
        batch_df.write
        .format("jdbc")
        .option("url", PG_URL)
        .option("dbtable", PG_TABLE)
        .option("user", PG_USER)
        .option("password", PG_PASSWORD)
        .option("driver", "org.postgresql.Driver")
        .mode("append")
        .save()
    )


# ─── Start streaming query ────────────────────────────────────────────────
query = (
    suspicious.writeStream
    .foreachBatch(write_to_postgres)
    .option("checkpointLocation", CHECKPOINT_DIR)
    .trigger(processingTime="5 seconds")  # process every 5 seconds
    .start()
)

print("🚀  Spark Structured Streaming job started. Waiting for data...")
query.awaitTermination()
