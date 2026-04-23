# Database Creation Script for PostgreSQL
# Run this to quickly set up the database for RoadEye

BEGIN TRANSACTION;

-- Create database
CREATE DATABASE roadeye_db
    WITH 
    ENCODING = 'UTF8'
    LOCALE = 'en_US.UTF-8'
    TEMPLATE = template0;

-- Create user
CREATE USER roadeye_user WITH ENCRYPTED PASSWORD 'roadeye_password';

-- Grant privileges
ALTER ROLE roadeye_user CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE roadeye_db TO roadeye_user;

-- Connect to the database and grant schema privileges
-- Note: You may need to run this separately after connecting to roadeye_db
-- \c roadeye_db
-- GRANT ALL PRIVILEGES ON SCHEMA public TO roadeye_user;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO roadeye_user;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO roadeye_user;

COMMIT;

-- To use this script:
-- psql -U postgres -f setup-database.sql

-- Or manually via psql:
-- psql -U postgres
-- \i setup-database.sql
-- \q
