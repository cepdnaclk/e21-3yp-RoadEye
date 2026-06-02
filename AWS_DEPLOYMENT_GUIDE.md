# RoadEye AWS Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Phase 1: Set Up AWS Account & Tools](#phase-1-set-up-aws-account--tools)
3. [Phase 2: Create Database (RDS PostgreSQL)](#phase-2-create-database-rds-postgresql)
4. [Phase 3: Prepare Backend for AWS](#phase-3-prepare-backend-for-aws)
5. [Phase 4: Deploy Backend to Elastic Beanstalk](#phase-4-deploy-backend-to-elastic-beanstalk)
6. [Phase 5: Configure Mobile App](#phase-5-configure-mobile-app)
7. [Phase 6: Deploy Mobile App](#phase-6-deploy-mobile-app)
8. [Phase 7: Testing & Monitoring](#phase-7-testing--monitoring)

---

## Prerequisites

### Required Tools
- ✅ AWS Account (free tier eligible)
- ✅ AWS CLI installed locally
- ✅ Java 17 + Maven (already have)
- ✅ Git installed
- ✅ Node.js 18+ (for mobile app)
- ✅ Android SDK (for Android builds)
- ✅ (Optional) Xcode if deploying to iOS

### Sign Up
1. Go to **https://aws.amazon.com**
2. Click "Create an AWS Account"
3. Complete registration and payment method setup
4. You get 12 months free tier with limits

---

## Phase 1: Set Up AWS Account & Tools

### Step 1.1: Install AWS CLI
```bash
# Windows (PowerShell as Administrator)
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi

# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### Step 1.2: Configure AWS CLI Credentials
```bash
# Get credentials from AWS Console
# AWS Console > IAM > Users > Create Access Keys
aws configure

# Enter:
# AWS Access Key ID: [your-access-key]
# AWS Secret Access Key: [your-secret-key]
# Default region: us-east-1 (or closest to you)
# Default output format: json
```

### Step 1.3: Create IAM User (recommended)
1. Go to **AWS Console** > **IAM** > **Users**
2. Click **Create user**
3. Name: `roadeye-deployer`
4. Attach policy: **AdministratorAccess** (or more restrictive for production)
5. Create access keys and save them

---

## Phase 2: Create Database (RDS PostgreSQL)

### Step 2.1: Create RDS Database
1. Go to **AWS Console** > **RDS** > **Databases**
2. Click **Create database**
3. Configure:
   - **Engine**: PostgreSQL
   - **Version**: 15.x or 16.x
   - **Templates**: Free tier
   - **DB instance identifier**: `roadeye-postgres`
   - **Master username**: `dbadmin`
   - **Master password**: `YourSecurePassword123!` (save this!)
   - **Publicly accessible**: YES (for now; restrict later)
   - **VPC security group**: Create new or use default
4. Click **Create database**
5. ⏳ Wait 5-10 minutes for creation

### Step 2.2: Get Database Endpoint
1. Click on your database instance
2. Copy the **Endpoint** (looks like: `roadeye-postgres.c9akciq32.us-east-1.rds.amazonaws.com`)
3. Save it for later

### Step 2.3: Create Database Schema
```bash
# Install psql (PostgreSQL CLI)
# macOS: brew install postgresql
# Windows: Download from https://www.postgresql.org/download/windows/
# Linux: sudo apt-get install postgresql-client

# Connect to your database
psql -h roadeye-postgres.c9akciq32.us-east-1.rds.amazonaws.com -U dbadmin -d postgres

# Paste your master password when prompted

# In psql, run:
CREATE DATABASE roadeye;
```

### Step 2.4: Run Your Migration Scripts
```bash
# From backend folder
psql -h YOUR_RDS_ENDPOINT -U dbadmin -d roadeye -f setup-database.sql
```

---

## Phase 3: Prepare Backend for AWS

### Step 3.1: Create AWS Configuration File
Create a new file: `backend/src/main/resources/application-aws.yml`

```yaml
spring:
  application:
    name: roadeye-backend
  datasource:
    url: jdbc:postgresql://${RDS_ENDPOINT}:5432/roadeye
    username: ${RDS_USERNAME}
    password: ${RDS_PASSWORD}
    driverClassName: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: validate
    database-platform: org.hibernate.dialect.PostgreSQL10Dialect
    properties:
      hibernate:
        format_sql: true

server:
  port: 5000
  servlet:
    context-path: /api

logging:
  level:
    com.roadeye: INFO
    org.springframework: INFO
```

### Step 3.2: Update Main Application Configuration
Edit `backend/src/main/resources/application.yml`:

```yaml
spring:
  profiles:
    active: ${SPRING_PROFILE:dev}
  
  application:
    name: roadeye-backend
  
  datasource:
    url: jdbc:postgresql://localhost:5432/roadeye
    username: ${DB_USERNAME:postgres}
    password: ${DB_PASSWORD:password}
    driverClassName: org.postgresql.Driver
  
  jpa:
    hibernate:
      ddl-auto: validate
    database-platform: org.hibernate.dialect.PostgreSQL10Dialect

server:
  port: ${SERVER_PORT:8080}
  servlet:
    context-path: /api

logging:
  level:
    com.roadeye: INFO
```

### Step 3.3: Create .ebextensions Folder
Create folder: `backend/.ebextensions`

Create file: `backend/.ebextensions/01-java.config`

```yaml
option_settings:
  aws:autoscaling:launchconfiguration:
    IamInstanceProfile: aws-elasticbeanstalk-ec2-role
  aws:elasticbeanstalk:container:tomcat:jvmoptions:
    Xmx: 512m
    Xms: 256m
  aws:elasticbeanstalk:application:environment:
    SPRING_PROFILE: aws
    SERVER_PORT: 5000
```

### Step 3.4: Create .ebignore File
Create file: `backend/.ebignore`

```
.git
.gitignore
.env
*.md
.DS_Store
target/
.vscode/
.idea/
```

### Step 3.5: Build JAR File
```bash
cd backend

# Clean and build
mvn clean package

# Should create: target/roadeye-backend-1.0.0.jar
```

---

## Phase 4: Deploy Backend to Elastic Beanstalk

### Step 4.1: Initialize Elastic Beanstalk Project
```bash
cd backend

# Install EB CLI
pip install awsebcli

# Initialize
eb init -p "Java 17 running on 64bit Amazon Linux 2" roadeye-backend --region us-east-1

# Set up environment
eb create roadeye-prod \
  --instance-type t3.micro \
  --envvars SPRING_PROFILE=aws,RDS_ENDPOINT=YOUR_RDS_ENDPOINT,RDS_USERNAME=dbadmin,RDS_PASSWORD=YourSecurePassword123!
```

### Step 4.2: Set Environment Variables
```bash
# In AWS Console > Elastic Beanstalk > Environments > roadeye-prod > Configuration

# Add environment properties:
SPRING_PROFILE=aws
RDS_ENDPOINT=roadeye-postgres.c9akciq32.us-east-1.rds.amazonaws.com
RDS_USERNAME=dbadmin
RDS_PASSWORD=YourSecurePassword123!
```

### Step 4.3: Deploy Backend
```bash
cd backend

# Deploy your built JAR
eb deploy roadeye-prod

# Monitor deployment
eb logs -f roadeye-prod
```

### Step 4.4: Get Your Backend URL
```bash
# View environment details
eb status roadeye-prod

# URL will be: http://roadeye-prod.elasticbeanstalk.com/api
# Save this URL - you'll need it for the mobile app!
```

---

## Phase 5: Configure Mobile App

### Step 5.1: Create Environment File
Create file: `RoadEye/.env`

```env
REACT_NATIVE_ROADEYE_API_URL=http://roadeye-prod.elasticbeanstalk.com/api
```

### Step 5.2: Update API Configuration
Edit `RoadEye/src/api/client.js` (or wherever API calls are):

```javascript
import axios from 'axios';
import { API_URL } from '@env';

const API_BASE_URL = API_URL || 'http://roadeye.eu-north-1.elasticbeanstalk.com';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

export default apiClient;
```

### Step 5.3: Install Dependencies
```bash
cd RoadEye

npm install
# or
yarn install
```

---

## Phase 6: Deploy Mobile App

### For Android

#### Step 6.1: Generate Signed APK/AAB
```bash
cd RoadEye/android

# Create keystore (one-time)
keytool -genkey -v -keystore roadeye-key.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias roadeye-key

# Build release APK
cd ..
eas build --platform android --distribution apk
```

#### Step 6.2: Upload to Google Play Store
1. Go to **https://play.google.com/console**
2. Create new app: "RoadEye"
3. Follow Play Store guidelines
4. Upload your signed APK/AAB
5. Fill app store listing, privacy policy, screenshots
6. Submit for review (takes 2-4 hours)

### For iOS (macOS only)

#### Step 6.1: Build for iOS
```bash
cd RoadEye

# Install Xcode command line tools
xcode-select --install

# Build
eas build --platform ios --distribution app-store
```

#### Step 6.2: Upload to App Store
1. Go to **https://appstoreconnect.apple.com**
2. Create new app
3. Upload build with Xcode or Transporter
4. Submit for review

---

## Phase 7: Testing & Monitoring

### Step 7.1: Test Backend API
```bash
# Get your backend URL
BACKEND_URL="http://roadeye-prod.elasticbeanstalk.com/api"

# Test health endpoint
curl $BACKEND_URL/health

# Test a sample endpoint
curl -X POST $BACKEND_URL/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}'
```

### Step 7.2: Monitor Logs
```bash
# View backend logs
eb logs -f roadeye-prod

# Or via AWS Console > Elastic Beanstalk > Logs
```

### Step 7.3: Set Up CloudWatch Alarms
1. AWS Console > CloudWatch > Alarms
2. Create alarms for:
   - High CPU usage on EC2
   - Database connection errors
   - High HTTP error rates

### Step 7.4: Enable HTTPS (SSL/TLS)
1. AWS Console > Elastic Beanstalk > Configuration
2. Load Balancer > HTTPS
3. Use **AWS Certificate Manager** (free SSL)
4. Select certificate and apply

---

## Troubleshooting

### Backend won't deploy
```bash
# Check logs
eb logs -f roadeye-prod

# Common issues:
# 1. Environment variables not set - add in EB console
# 2. RDS not accessible - check security group
# 3. Java version mismatch - verify pom.xml
```

### Database connection fails
```bash
# Test RDS connectivity
psql -h YOUR_RDS_ENDPOINT -U dbadmin -d roadeye -c "SELECT 1"

# Check security group:
# AWS Console > EC2 > Security Groups
# Ensure inbound: PostgreSQL (5432) from EB instance
```

### Mobile app can't reach backend
```bash
# In mobile app, verify:
# 1. REACT_NATIVE_ROADEYE_API_URL is correct
# 2. Backend is HTTPS (if required)
# 3. CORS headers are set correctly in Spring
```

---

## Cost Summary (Monthly)

| Service | Free Tier | Production |
|---------|-----------|-----------|
| EC2 (EB) | 750 hrs | ~$10-30 |
| RDS PostgreSQL | 750 hrs, 20GB | ~$30-50 |
| Data transfer | 1GB/month | ~$5-20 |
| **Total** | **Free** | **~$50-100** |

Use free tier for 12 months, then optimize costs.

---

## Next Steps

1. ✅ Set up AWS Account
2. ✅ Create RDS database
3. ✅ Deploy backend to EB
4. ✅ Get backend URL
5. ✅ Configure mobile app
6. ✅ Build & test locally
7. ✅ Deploy mobile app to stores

---

## Useful Links

- [AWS Console](https://console.aws.amazon.com)
- [Elastic Beanstalk Docs](https://docs.aws.amazon.com/elasticbeanstalk/)
- [RDS Documentation](https://docs.aws.amazon.com/rds/)
- [Spring Boot on AWS](https://aws.amazon.com/blogs/developer/spring-boot-on-aws/)
- [AWS Free Tier](https://aws.amazon.com/free/)

---

## Questions?

Document any issues you encounter and we can troubleshoot together.
