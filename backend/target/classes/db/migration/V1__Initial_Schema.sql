-- V1__Initial_Schema.sql
-- Initial database schema for RoadEye application

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) UNIQUE,
    profile_photo_url VARCHAR(500),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Create rides table
CREATE TABLE IF NOT EXISTS rides (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP NOT NULL,
    distance_km DECIMAL(10, 2) NOT NULL,
    avg_speed_kmh DECIMAL(5, 2) DEFAULT 0,
    max_speed_kmh DECIMAL(5, 2) DEFAULT 0,
    harsh_brakes INTEGER DEFAULT 0,
    harsh_accels INTEGER DEFAULT 0,
    aggressive_tilts INTEGER DEFAULT 0,
    road_quality_score DECIMAL(3, 1) DEFAULT 0,
    safety_score DECIMAL(3, 1) DEFAULT 100,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Create crash_events table
CREATE TABLE IF NOT EXISTS crash_events (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ride_id BIGINT REFERENCES rides(id) ON DELETE SET NULL,
    occurred_at TIMESTAMP NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    severity_score DECIMAL(3, 1) NOT NULL,
    alerts_sent BOOLEAN DEFAULT FALSE,
    emergency_contacts_notified BOOLEAN DEFAULT FALSE,
    description VARCHAR(500),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Create emergency_contacts table
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    relationship VARCHAR(100),
    channel VARCHAR(50) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rides_user_id ON rides(user_id);
CREATE INDEX IF NOT EXISTS idx_rides_started_at ON rides(started_at);
CREATE INDEX IF NOT EXISTS idx_crash_events_user_id ON crash_events(user_id);
CREATE INDEX IF NOT EXISTS idx_crash_events_ride_id ON crash_events(ride_id);
CREATE INDEX IF NOT EXISTS idx_crash_events_occurred_at ON crash_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id ON emergency_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
