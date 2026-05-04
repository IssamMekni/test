-- PostgreSQL initialization script
-- This file runs automatically when the postgres container starts for the first time.

-- Create the suspicious_transactions table if it does not already exist
CREATE TABLE IF NOT EXISTS suspicious_transactions (
    id               SERIAL PRIMARY KEY,
    transaction_id   VARCHAR(255),
    user_id          VARCHAR(255),
    amount           FLOAT,
    location         VARCHAR(255),
    timestamp        TIMESTAMP
);
