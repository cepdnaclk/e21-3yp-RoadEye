# Firebase → Spring Boot Migration - Quick Reference

## Migration Summary

### Removed

- ❌ Firebase Cloud Functions
- ❌ Firestore database
- ❌ Firebase configuration files (firebase.json, .firebaserc, etc.)

### Added

- ✅ Spring Boot 3.2.0 backend
- ✅ PostgreSQL database
- ✅ JPA entities and repositories
- ✅ Service layer with business logic
- ✅ REST API controllers
- ✅ Database migration scripts (Flyway)

---

## File Structure

```
backend/
├── pom.xml                          # Maven configuration with all dependencies
├── .gitignore                       # Git ignore rules
├── README.md                        # Backend documentation
│
├── src/main/java/com/roadeye/
│   ├── RoadEyeApplication.java      # Spring Boot entry point
│   │
│   ├── model/                       # JPA Entity classes
│   │   ├── User.java               # User entity (was Firestore users collection)
│   │   ├── Ride.java               # Ride entity (was Firestore rides collection)
│   │   ├── CrashEvent.java         # CrashEvent entity (was Firestore crash_events)
│   │   └── EmergencyContact.java   # EmergencyContact entity
│   │
│   ├── repository/                 # Spring Data JPA Repository interfaces
│   │   ├── UserRepository.java
│   │   ├── RideRepository.java
│   │   ├── CrashEventRepository.java
│   │   └── EmergencyContactRepository.java
│   │
│   ├── service/                    # Business logic layer
│   │   ├── UserService.java        # User management
│   │   ├── RideService.java        # Ride management
│   │   ├── CrashEventService.java  # Crash event handling
│   │   └── EmergencyContactService.java
│   │
│   ├── controller/                 # REST API endpoints (replaced Firebase callable functions)
│   │   ├── UserController.java     # /api/users/*
│   │   ├── RideController.java     # /api/rides/*
│   │   ├── CrashEventController.java # /api/crashes/*
│   │   └── EmergencyContactController.java # /api/emergency-contacts/*
│   │
│   └── config/                     # Spring configuration
│       ├── AppConfiguration.java   # Password encoder, CORS config
│       └── SecurityConfig.java     # Spring Security settings
│
├── src/main/resources/
│   ├── application.yml             # Application properties and DB config
│   └── db/migration/
│       └── V1__Initial_Schema.sql  # Database creation script
│
└── src/test/java/
    └── com/roadeye/               # Test classes
```

---

## API Endpoints Comparison

### Firebase Callable Functions → Spring Boot REST Endpoints

#### User Management

| Firebase | Spring Boot    | Method | Path                  |
| -------- | -------------- | ------ | --------------------- |
| N/A      | registerUser   | POST   | `/api/users/register` |
| N/A      | updateProfile  | PUT    | `/api/users/{userId}` |
| N/A      | getUserProfile | GET    | `/api/users/{userId}` |
| N/A      | deactivateUser | DELETE | `/api/users/{userId}` |

#### Rides

| Firebase        | Spring Boot       | Method | Path                         |
| --------------- | ----------------- | ------ | ---------------------------- |
| saveRideSummary | saveRideSummary   | POST   | `/api/rides?userId={userId}` |
| N/A             | getUserRides      | GET    | `/api/rides/user/{userId}`   |
| N/A             | getRideById       | GET    | `/api/rides/{rideId}`        |
| N/A             | getRideStatistics | GET    | `/api/rides/stats/{userId}`  |

#### Crashes

| Firebase         | Spring Boot             | Method | Path                                            |
| ---------------- | ----------------------- | ------ | ----------------------------------------------- |
| reportCrashEvent | reportCrashEvent        | POST   | `/api/crashes?userId={userId}`                  |
| N/A              | getUserCrashEvents      | GET    | `/api/crashes/user/{userId}`                    |
| N/A              | getCrashEventById       | GET    | `/api/crashes/{crashId}`                        |
| N/A              | notifyEmergencyContacts | POST   | `/api/crashes/{crashId}/notify?userId={userId}` |
| N/A              | getCrashStatistics      | GET    | `/api/crashes/stats/{userId}`                   |

#### Emergency Contacts

| Firebase | Spring Boot                 | Method | Path                                            |
| -------- | --------------------------- | ------ | ----------------------------------------------- |
| N/A      | addEmergencyContact         | POST   | `/api/emergency-contacts?userId={userId}`       |
| N/A      | getUserEmergencyContacts    | GET    | `/api/emergency-contacts/user/{userId}`         |
| N/A      | getEnabledEmergencyContacts | GET    | `/api/emergency-contacts/user/{userId}/enabled` |
| N/A      | updateEmergencyContact      | PUT    | `/api/emergency-contacts/{contactId}`           |
| N/A      | deleteEmergencyContact      | DELETE | `/api/emergency-contacts/{contactId}`           |
| N/A      | toggleContact               | PATCH  | `/api/emergency-contacts/{contactId}/toggle`    |

---

## Data Model Mapping

### Firestore Collections → PostgreSQL Tables

#### users (Firestore) → users (PostgreSQL)

```
Firestore Document:          PostgreSQL Row:
{                            id: 1 (BIGSERIAL)
  id: auto-generated         email: "rider@example.com"
  email: "rider@example.com" password_hash: "bcrypt_hash"
  passwordHash: "xxx"        first_name: "John"
  firstName: "John"          last_name: "Doe"
  lastName: "Doe"            phone_number: "+1234567890"
  phoneNumber: "+xxx"        profile_photo_url: "https://..."
  profilePhotoUrl: "https"   active: true
  active: true               created_at: timestamp
  createdAt: timestamp       updated_at: timestamp
  updatedAt: timestamp
}
```

#### rides (Firestore) → rides (PostgreSQL)

```
Same structure with additional safety_score field
All timestamps stored as TIMESTAMP type
Foreign key: user_id references users(id)
```

#### crash_events (Firestore) → crash_events (PostgreSQL)

```
Same structure plus:
- emergency_contacts_notified: BOOLEAN
- description: VARCHAR(500)
Foreign keys: user_id, ride_id (optional)
```

#### emergency_contacts (Firestore) → emergency_contacts (PostgreSQL)

```
Firestore Document:          PostgreSQL Row:
{                            id: BIGSERIAL
  id: auto-generated         user_id: FK to users
  name: "Jane"               name: "Jane"
  phone: "+1234567890"       phone: "+1234567890"
  relationship: "Sister"     email: "jane@example.com"
  channel: "sms" | "email"   relationship: "Sister"
  enabled: true              channel: "SMS" | "EMAIL" | "BOTH"
  ...timestamps              enabled: true
}                            created_at, updated_at
```

---

## Technology Stack Changes

| Component          | Before (Firebase)   | After (Spring Boot)            |
| ------------------ | ------------------- | ------------------------------ |
| **Language**       | TypeScript/Node.js  | Java 17                        |
| **Framework**      | Firebase Functions  | Spring Boot 3.2                |
| **Database**       | Firestore (NoSQL)   | PostgreSQL (SQL)               |
| **ORM**            | None (Firebase SDK) | JPA/Hibernate                  |
| **Build Tool**     | npm                 | Maven                          |
| **Authentication** | Firebase Auth       | Spring Security + JWT (to add) |
| **Data Model**     | Document-based      | Relational                     |
| **Scalability**    | Auto-scaling        | Manual scaling                 |
| **Cost**           | Pay-per-use         | Dedicated resources            |

---

## Setup Checklist

Before running the application:

- [ ] Java 17 installed and configured
- [ ] PostgreSQL installed (version 12+)
- [ ] Maven installed and in PATH
- [ ] PostgreSQL database `roadeye_db` created
- [ ] PostgreSQL user `roadeye_user` created with password
- [ ] User has all privileges on `roadeye_db`
- [ ] Backend folder structure created
- [ ] All Java classes created
- [ ] `application.yml` configured with correct DB credentials
- [ ] Flyway migration script in place

---

## Running the Application

### Step 1: Create Database

```bash
psql -U postgres
CREATE DATABASE roadeye_db;
CREATE USER roadeye_user WITH PASSWORD 'roadeye_password';
GRANT ALL PRIVILEGES ON DATABASE roadeye_db TO roadeye_user;
\q
```

### Step 2: Build

```bash
cd backend
mvn clean install
```

### Step 3: Run

```bash
mvn spring-boot:run
```

### Step 4: Test

```bash
# Server runs on localhost:8080
curl http://localhost:8080/api/users/register
```

---

## Important Notes

1. **Transactions**: Spring Boot's `@Transactional` annotation handles transactions automatically
2. **Timestamps**: Use `LocalDateTime` in Java, stored as TIMESTAMP in PostgreSQL
3. **Relationships**: JPA `@ManyToOne` and `@OneToMany` replace Firestore subcollections
4. **Indexes**: Created in Flyway migration for performance
5. **Cascading**: `cascade = CascadeType.ALL, orphanRemoval = true` ensures related records are deleted
6. **Password Security**: BCrypt hashing used instead of Firebase Auth

---

## Common Queries (from Java services)

Instead of Firebase Firestore queries:

```typescript
// Firebase: Get user's rides
db.collection("rides").where("userId", "==", uid);

// Spring Boot: Same query
rideRepository.findByUserId(userId);
```

```typescript
// Firebase: Get crash events ordered by date
db.collection("crash_events")
  .where("userId", "==", uid)
  .orderBy("occurredAt", "desc");

// Spring Boot: Same query
crashEventRepository.findByUserIdOrderByOccurredAtDesc(userId);
```

---

## Next Steps After Basic Setup

1. **Implement JWT Authentication**
   - Create `TokenProvider` service
   - Add JWT endpoints for login/refresh
   - Protect endpoints with `@PreAuthorize`

2. **Add Notification Service**
   - Integrate Twilio for SMS
   - Integrate SendGrid for email
   - Send auto-notifications for severe crashes

3. **Create Integration Tests**
   - Test endpoints with `@WebMvcTest`
   - Test services with `@SpringBootTest`

4. **Add API Documentation**
   - Integrate Springdoc OpenAPI (Swagger)
   - Generate interactive API docs

5. **Setup CI/CD**
   - GitHub Actions for automated testing
   - Docker containerization
   - Deployment pipeline

---

## Support Resources

- Spring Boot Documentation: https://spring.io/projects/spring-boot
- Spring Data JPA: https://spring.io/projects/spring-data-jpa
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Flyway: https://flywaydb.org/documentation/
- Hibernate: https://hibernate.org/orm/documentation/

---

**Created**: April 22, 2026
**Migration Status**: ✅ Complete - Ready for development
