"""
Streamlit Dashboard — Real-Time Anomaly Detection
===================================================
Displays suspicious banking transactions stored in PostgreSQL.
Auto-refreshes every 5 seconds.

Run:
    pip install -r requirements.txt
    streamlit run app.py
"""

import os
import time

import pandas as pd
import psycopg2
import streamlit as st

# ─── Page configuration ───────────────────────────────────────────────────
st.set_page_config(
    page_title="Anomaly Detection Dashboard",
    page_icon="🚨",
    layout="wide",
)

# ─── PostgreSQL connection details ────────────────────────────────────────
PG_HOST     = os.getenv("POSTGRES_HOST",     "localhost")
PG_PORT     = int(os.getenv("POSTGRES_PORT", "5432"))
PG_DB       = os.getenv("POSTGRES_DB",       "anomaly_db")
PG_USER     = os.getenv("POSTGRES_USER",     "postgres")
PG_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")

REFRESH_INTERVAL = 5  # seconds


# ─── Database helper ──────────────────────────────────────────────────────
@st.cache_resource
def get_connection():
    """Create a persistent PostgreSQL connection (cached across reruns)."""
    return psycopg2.connect(
        host=PG_HOST,
        port=PG_PORT,
        dbname=PG_DB,
        user=PG_USER,
        password=PG_PASSWORD,
    )


def fetch_suspicious_transactions():
    """Query all suspicious transactions, most recent first."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, transaction_id, user_id, amount, location, timestamp
                FROM suspicious_transactions
                ORDER BY timestamp DESC
                LIMIT 200
                """
            )
            rows = cur.fetchall()
            columns = ["ID", "Transaction ID", "User ID", "Amount (TND)", "Location", "Timestamp"]
            return pd.DataFrame(rows, columns=columns)
    except Exception as e:
        # Reconnect on stale connection
        conn.close()
        st.cache_resource.clear()
        st.error(f"Database error: {e}")
        return pd.DataFrame()


# ─── Dashboard layout ─────────────────────────────────────────────────────
st.title("🚨 Real-Time Anomaly Detection Dashboard")
st.markdown("Displays banking transactions flagged as **suspicious** (amount > 1,000 TND).")
st.markdown("---")

# Placeholder containers — updated on each refresh
count_placeholder  = st.empty()
table_placeholder  = st.empty()
status_placeholder = st.empty()

# ─── Auto-refresh loop ────────────────────────────────────────────────────
while True:
    df = fetch_suspicious_transactions()

    with count_placeholder.container():
        col1, col2, col3 = st.columns(3)
        total = len(df)
        avg_amount = df["Amount (TND)"].mean() if total > 0 else 0
        max_amount = df["Amount (TND)"].max()  if total > 0 else 0

        col1.metric("🔢 Total Suspicious Transactions", total)
        col2.metric("💰 Average Suspicious Amount",     f"{avg_amount:,.2f} TND")
        col3.metric("📈 Highest Suspicious Amount",     f"{max_amount:,.2f} TND")

    with table_placeholder.container():
        st.subheader("📋 Latest Suspicious Transactions")
        if df.empty:
            st.info("No suspicious transactions detected yet. Waiting for data...")
        else:
            st.dataframe(df, use_container_width=True, hide_index=True)

    with status_placeholder.container():
        st.caption(f"⏱ Last refreshed: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')} — auto-refreshing every {REFRESH_INTERVAL}s")

    time.sleep(REFRESH_INTERVAL)
