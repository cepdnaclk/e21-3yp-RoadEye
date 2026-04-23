# RoadEye Backend Setup Guide - Spring Boot + PostgreSQL

## Overview

This guide walks you through setting up the Spring Boot backend with PostgreSQL database, replacing the Firebase setup.

---

## Phase 1: Prerequisites Installation

### Step 1.1: Install Java 17

**Windows:**

1. Download from: https://www.oracle.com/java/technologies/downloads/#java17
2. Run the installer
3. Verify installation:
   ```bash
   java -version
   # Should show: openjdk version "17.x.x"
   ```

### Step 1.2: Install PostgreSQL

**Windows:**

1. Download from: https://www.postgresql.org/download/windows/
2. Run the installer (use default port 5432)
3. Remember the password for `postgres` user
4. Complete installation
5. Verify installation:
   ```bash
   psql --version
   # Should show: psql (PostgreSQL) 15.x
   ```

### Step 1.3: Install Maven

**Windows:**

1. Download from: https://maven.apache.org/download.cgi (Binary ZIP archive)
2. Extract to a folder (e.g., `C:\apache-maven-3.9.x`)
3. Add to System Environment Variables:
   - New variable: `MAVEN_HOME` = `C:\apache-maven-3.9.x`
   - Add to PATH: `%MAVEN_HOME%\bin`
4. Verify installation:
   ```bash
   mvn -version
   # Should show: Apache Maven 3.9.x
   ```

---

## Phase 2: Database Setup

### Step 2.1: Create Database and User

Open **pgAdmin** (comes with PostgreSQL) or use **Command Prompt**:

```sql
-- Login as postgres user
psql -U postgres

-- Create database
CREATE DATABASE roadeye_db;

-- Create user
CREATE USER roadeye_user WITH PASSWORD 'roadeye_password';

-- Grant privileges
ALTER ROLE roadeye_user CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE roadeye_db TO roadeye_user;
ALTER DATABASE roadeye_db OWNER TO roadeye_user;

-- Connect to database and grant schema privileges
\c roadeye_db postgres

GRANT ALL PRIVILEGES ON SCHEMA public TO roadeye_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO roadeye_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO roadeye_user;

-- Quit
\q
```

### Step 2.2: Verify Database Connection

```bash
# Test connection as roadeye_user
psql -U roadeye_user -d roadeye_db -h localhost

# You should see: roadeye_db=>

# Exit
\q
```

---

## Phase 3: Build and Run Spring Boot Application

### Step 3.1: Navigate to Backend Directory

```bash
cd d:\e21-3yp-RoadEye\backend
```

### Step 3.2: Update Database Credentials (if different)

Edit `src/main/resources/application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/roadeye_db
    username: roadeye_user
    password: roadeye_password # Change if you used different password
```

### Step 3.3: Build the Project

```bash
# Clean and build
mvn clean install

# This will:
# - Download dependencies
# - Compile Java code
# - Run tests (if any)
# - Create JAR file
```

**Expected output:** `BUILD SUCCESS`

### Step 3.4: Run the Application

```bash
mvn spring-boot:run
```

**Expected output:**

```
...
o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat started on port(s): 8080
...
Application started successfully!
```

### Step 3.5: Test the Application

Open browser or use curl:

```bash
# Test if server is running
curl http://localhost:8080/api/users/register

# You should get a 400 error (expected, as it needs POST data)
```

---

## Phase 4: Database Schema Creation

Flyway will automatically create the schema on first run. To verify:

```bash
# Connect to database
psql -U roadeye_user -d roadeye_db

# List tables (should show 4 tables)
\dt

# You should see:
#                    List of relations
#  Schema |          Name          | Type  | Owner
# --------+------------------------+-------+-------------
#  public | crash_events           | table | roadeye_user
#  public | emergency_contacts     | table | roadeye_user
#  public | flyway_schema_history  | table | roadeye_user
#  public | rides                  | table | roadeye_user
#  public | users                  | table | roadeye_user

# Exit
\q
```

---

## Phase 5: Testing API Endpoints

### 5.1: Register a New User

```bash
curl -X POST http://localhost:8080/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rider@example.com",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Response should be 201 Created with user ID
```

### 5.2: Save a Ride

```bash
curl -X POST "http://localhost:8080/api/rides?userId=1" \
  -H "Content-Type: application/json" \
  -d '{
    "startedAt": "2026-04-22T10:00:00",
    "endedAt": "2026-04-22T10:30:00",
    "distanceKm": 15.5,
    "avgSpeedKmh": 45.0,
    "maxSpeedKmh": 65.0,
    "harshBrakes": 2,
    "harshAccels": 1,
    "aggressiveTilts": 0,
    "roadQualityScore": 8.5
  }'
```

### 5.3: Report a Crash

```bash
curl -X POST "http://localhost:8080/api/crashes?userId=1" \
  -H "Content-Type: application/json" \
  -d '{
    "occurredAt": "2026-04-22T10:15:00",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "severityScore": 8.5,
    "description": "Collision at intersection"
  }'
```

### 5.4: Add Emergency Contact

```bash
curl -X POST "http://localhost:8080/api/emergency-contacts?userId=1" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "phone": "+1234567890",
    "email": "jane@example.com",
    "relationship": "Sister",
    "channel": "SMS"
  }'
```

---

## Phase 6: Development Workflow

### Running in IDE (IntelliJ IDEA / VS Code)

**IntelliJ IDEA:**

1. Open project folder
2. Right-click `pom.xml` → "Add as Maven Project"
3. Find and run `RoadEyeApplication` main class
4. Application starts on port 8080

**VS Code:**

1. Install "Extension Pack for Java" by Microsoft
2. Open folder and wait for project to load
3. Click on Run button next to `main()` in `RoadEyeApplication.java`

### Debug Mode

```bash
# Run with debug enabled
mvn spring-boot:run -Dspring-boot.run.arguments="--debug"
```

### Monitoring Logs

Check `src/main/resources/application.yml` for log levels:

```yaml
logging:
  level:
    com.roadeye: DEBUG # Application logs
    org.hibernate.SQL: DEBUG # SQL queries
```

---

## Phase 7: Troubleshooting

### Issue: "Connection refused" to PostgreSQL

```bash
# Check if PostgreSQL is running
psql --version

# On Windows, start PostgreSQL service from Services
# Or restart PostgreSQL:
# Windows Services → PostgreSQL → Restart
```

### Issue: "Database roadeye_db does not exist"

```bash
# Recreate database
psql -U postgres

CREATE DATABASE roadeye_db;
GRANT ALL PRIVILEGES ON DATABASE roadeye_db TO roadeye_user;
\q
```

### Issue: "Port 8080 already in use"

```yaml
# Change port in application.yml
server:
  port: 8081 # Use different port
```

### Issue: Flyway migration fails

```bash
# Reset database (if needed)
psql -U postgres

DROP DATABASE roadeye_db;
CREATE DATABASE roadeye_db;
GRANT ALL PRIVILEGES ON DATABASE roadeye_db TO roadeye_user;
\q

# Then rebuild and run again
mvn clean install
mvn spring-boot:run
```

---

## Phase 8: Next Steps

### 8.1: Implement JWT Authentication

- Create JWT token generation/validation
- Add authentication endpoints
- Protect endpoints with @PreAuthorize

### 8.2: Add Email/SMS Notifications

- Integrate Twilio for SMS
- Integrate SendGrid for Email
- Send crash notifications to emergency contacts

### 8.3: Create Admin Dashboard

- Add admin endpoints for statistics
- Create web UI for monitoring

### 8.4: Deploy to Production

- Build JAR file: `mvn clean package`
- Deploy to AWS/Azure/DigitalOcean
- Configure production PostgreSQL
- Set up SSL/HTTPS

---

## Useful Commands

```bash
# Build only (no run)
mvn clean package

# Build with skip tests
mvn clean package -DskipTests

# Run tests
mvn test

# Check code style
mvn checkstyle:check

# Generate project reports
mvn site

# Update dependencies
mvn dependency:tree

# Access database
psql -U roadeye_user -d roadeye_db -h localhost

# List all databases
psql -U postgres -l

# Backup database
pg_dump -U roadeye_user -d roadeye_db > backup.sql

# Restore database
psql -U roadeye_user -d roadeye_db < backup.sql
```

---

## Summary

You now have:
✅ Spring Boot 3.2 backend
✅ PostgreSQL database with proper schema
✅ JPA entities for Users, Rides, CrashEvents, EmergencyContacts
✅ REST API endpoints replacing Firebase callable functions
✅ Flyway database migrations
✅ Spring Security configuration

**Next:** Continue with JWT authentication, notification services, and frontend integration.
