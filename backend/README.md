# Backend - Spring Boot + PostgreSQL

## Overview

This is the Spring Boot backend for the RoadEye motorcycle safety system, replacing the previous Firebase setup.

## Tech Stack

- **Framework**: Spring Boot 3.2.0
- **Language**: Java 17
- **Database**: PostgreSQL
- **ORM**: JPA/Hibernate
- **Build Tool**: Maven
- **Security**: Spring Security + BCrypt

## Project Structure

```
src/main/java/com/roadeye/
├── RoadEyeApplication.java          # Main Spring Boot entry point
├── model/                            # JPA Entity classes
│   ├── User.java
│   ├── Ride.java
│   ├── CrashEvent.java
│   └── EmergencyContact.java
├── repository/                       # Spring Data JPA Repositories
│   ├── UserRepository.java
│   ├── RideRepository.java
│   ├── CrashEventRepository.java
│   └── EmergencyContactRepository.java
├── service/                          # Business Logic Services
│   ├── UserService.java
│   ├── RideService.java
│   ├── CrashEventService.java
│   └── EmergencyContactService.java
├── controller/                       # REST API Endpoints
│   ├── UserController.java
│   ├── RideController.java
│   ├── CrashEventController.java
│   └── EmergencyContactController.java
└── config/                           # Spring Configuration
    ├── AppConfiguration.java
    └── SecurityConfig.java

src/main/resources/
├── application.yml                   # Application configuration
└── db/migration/                     # Flyway SQL migrations
    └── V1__Initial_Schema.sql
```

## Setup Instructions

### 1. Prerequisites

- Java 17 or higher installed
- PostgreSQL 12+ installed
- Maven 3.6+ installed
- Git

### 2. Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create the database
CREATE DATABASE roadeye_db;

# Create a user
CREATE USER roadeye_user WITH PASSWORD 'roadeye_password';

# Grant privileges
ALTER ROLE roadeye_user CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE roadeye_db TO roadeye_user;
ALTER DATABASE roadeye_db OWNER TO roadeye_user;

# Connect to the database
\c roadeye_db

# Grant schema privileges
GRANT ALL PRIVILEGES ON SCHEMA public TO roadeye_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO roadeye_user;

# Quit
\q
```

### 3. Build the Project

```bash
cd backend
mvn clean install
```

### 4. Run the Application

```bash
mvn spring-boot:run
```

The application will start on `http://localhost:8080`

Flyway will automatically create the database schema on first run.

## API Endpoints

### User Management

- `POST /api/users/register` - Register new user
- `GET /api/users/{userId}` - Get user profile
- `PUT /api/users/{userId}` - Update user profile
- `DELETE /api/users/{userId}` - Deactivate user

### Rides

- `POST /api/rides` - Save a new ride
- `GET /api/rides/user/{userId}` - Get user's rides
- `GET /api/rides/{rideId}` - Get specific ride
- `GET /api/rides/stats/{userId}` - Get ride statistics

### Crash Events

- `POST /api/crashes` - Report a crash
- `GET /api/crashes/user/{userId}` - Get user's crash events
- `GET /api/crashes/{crashId}` - Get specific crash
- `POST /api/crashes/{crashId}/notify` - Notify emergency contacts
- `GET /api/crashes/stats/{userId}` - Get crash statistics

### Emergency Contacts

- `POST /api/emergency-contacts` - Add emergency contact
- `GET /api/emergency-contacts/user/{userId}` - Get all contacts
- `GET /api/emergency-contacts/user/{userId}/enabled` - Get enabled contacts
- `PUT /api/emergency-contacts/{contactId}` - Update contact
- `DELETE /api/emergency-contacts/{contactId}` - Delete contact
- `PATCH /api/emergency-contacts/{contactId}/toggle` - Toggle contact status

## Database Configuration

Edit `src/main/resources/application.yml` to change:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/roadeye_db
    username: roadeye_user
    password: roadeye_password
```

## Future Enhancements

- [ ] JWT authentication
- [ ] SMS/Email notifications for crashes
- [ ] Admin dashboard
- [ ] Real-time WebSocket updates
- [ ] API rate limiting
- [ ] Automated testing with JUnit 5
- [ ] Swagger/OpenAPI documentation

## Troubleshooting

**Connection refused (PostgreSQL)**

- Ensure PostgreSQL is running: `pg_isready`
- Check connection string in application.yml
- Verify database and user exist

**Flyway migration fails**

- Check SQL syntax in V1\_\_Initial_Schema.sql
- Ensure user has permissions on the schema
- Try resetting: `DROP DATABASE roadeye_db;` and recreate

**Port already in use**

- Change port in application.yml: `server.port: 8081`

## Next Steps

1. Implement JWT authentication in SecurityConfig
2. Add email/SMS notification service for crash events
3. Create integration tests
4. Add API documentation with Swagger
5. Deploy to production server
