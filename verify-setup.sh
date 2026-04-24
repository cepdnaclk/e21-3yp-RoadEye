#!/bin/bash
# Verify RoadEye Backend Setup - Linux/Mac Script

echo ""
echo "===================================="
echo "RoadEye Backend - Verification Script"
echo "===================================="
echo ""

# Check Java
echo "[1/4] Checking Java..."
if command -v java &> /dev/null; then
    java -version
    echo "✓ Java is installed"
else
    echo "✗ Java is NOT installed"
    echo "Please install Java 17"
    exit 1
fi

echo ""

# Check PostgreSQL
echo "[2/4] Checking PostgreSQL..."
if command -v psql &> /dev/null; then
    psql --version
    echo "✓ PostgreSQL is installed"
else
    echo "✗ PostgreSQL is NOT installed"
    echo "Please install PostgreSQL: https://www.postgresql.org/download/"
    exit 1
fi

echo ""

# Check Maven
echo "[3/4] Checking Maven..."
if command -v mvn &> /dev/null; then
    mvn -version | grep "Apache Maven"
    echo "✓ Maven is installed"
else
    echo "✗ Maven is NOT installed"
    echo "Please install Maven: https://maven.apache.org/"
    exit 1
fi

echo ""

# Check database connection
echo "[4/4] Checking PostgreSQL database..."
if psql -U roadeye_user -d roadeye_db -c "SELECT 1;" &> /dev/null; then
    echo "✓ Database 'roadeye_db' exists and is accessible"
else
    echo "✗ Cannot connect to database 'roadeye_db'"
    echo "Please run the database setup commands from SETUP_GUIDE.md"
    exit 1
fi

echo ""
echo "===================================="
echo "✓ All checks passed!"
echo "===================================="
echo ""
echo "Next steps:"
echo "1. cd backend"
echo "2. mvn clean install"
echo "3. mvn spring-boot:run"
echo ""
