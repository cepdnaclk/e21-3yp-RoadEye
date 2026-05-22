# Quick Start Commands for AWS Deployment

## Prerequisites
```bash
# Install AWS CLI
# Windows: msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi
# macOS: brew install awscli
# Linux: curl https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o awscliv2.zip && unzip awscliv2.zip && sudo ./aws/install

# Configure credentials
aws configure
# Enter your AWS Access Key ID and Secret Access Key

# Install EB CLI
pip install awsebcli
```

## 1. Create RDS Database
```bash
# Via AWS Console (recommended for first time):
# AWS Console > RDS > Create Database
# Select PostgreSQL, Free Tier, set password, make publicly accessible

# Get your RDS endpoint and run:
psql -h YOUR_RDS_ENDPOINT -U dbadmin -d postgres -c "CREATE DATABASE roadeye;"
psql -h YOUR_RDS_ENDPOINT -U dbadmin -d roadeye -f backend/setup-database.sql
```

## 2. Build Backend
```bash
cd backend
mvn clean package -DskipTests
# Creates: target/roadeye-backend-1.0.0.jar
```

## 3. Deploy to Elastic Beanstalk
```bash
cd backend

# First time setup
eb init -p "Java 17 running on 64bit Amazon Linux 2" roadeye-backend --region us-east-1

# Create environment with environment variables
eb create roadeye-prod \
  --instance-type t3.micro \
  --envvars SPRING_PROFILES_ACTIVE=aws,RDS_ENDPOINT=your-endpoint.rds.amazonaws.com,RDS_USERNAME=dbadmin,RDS_PASSWORD=YourPassword123

# Or update existing environment
eb setenv SPRING_PROFILES_ACTIVE=aws RDS_ENDPOINT=your-endpoint.rds.amazonaws.com RDS_USERNAME=dbadmin RDS_PASSWORD=YourPassword123

# Deploy
eb deploy roadeye-prod

# Monitor
eb logs -f roadeye-prod

# Get URL
eb open roadeye-prod
```

## 4. Test Backend
```bash
# Replace with your actual URL
BACKEND="http://roadeye-prod.elasticbeanstalk.com/api"

# Health check
curl $BACKEND/health

# Check logs
eb logs roadeye-prod
```

## 5. Configure Mobile App
```bash
# Edit RoadEye/.env
REACT_NATIVE_ROADEYE_API_URL=http://roadeye-prod.elasticbeanstalk.com/api

# Build and test locally
cd RoadEye
npm install
npm start
```

## Troubleshooting

### Check EB logs
```bash
eb logs -f roadeye-prod
```

### Restart environment
```bash
eb abort roadeye-prod
eb create roadeye-prod --instance-type t3.micro
```

### SSH into EC2 instance
```bash
eb ssh roadeye-prod
```

### Check environment variables
```bash
eb printenv roadeye-prod
```

## Cost Management

### Monitor costs
```bash
aws ce get-cost-and-usage \
  --time-period Start=2024-05-01,End=2024-05-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

### Stop environment (don't delete)
```bash
eb terminate roadeye-prod --force
# Later: eb create roadeye-prod to restart
```

## Useful Links
- AWS Console: https://console.aws.amazon.com
- EB Dashboard: https://console.aws.amazon.com/elasticbeanstalk
- RDS Dashboard: https://console.aws.amazon.com/rds
- Account Billing: https://console.aws.amazon.com/billing
