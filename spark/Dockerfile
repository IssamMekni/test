FROM python:3.11-slim

# Install Java (required by Spark)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        openjdk-17-jre-headless \
    && rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Add PySpark's bundled spark-submit to PATH
ENV SPARK_HOME=/usr/local/lib/python3.11/site-packages/pyspark
ENV PATH=${SPARK_HOME}/bin:${PATH}
ENV PYSPARK_PYTHON=python3

COPY streaming.py .

CMD ["spark-submit", \
     "--packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.1,org.postgresql:postgresql:42.7.3", \
     "streaming.py"]
