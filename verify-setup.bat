@echo off
REM Verify RoadEye Backend Setup - Windows Batch Script

echo.
echo ====================================
echo RoadEye Backend - Verification Script
echo ====================================
echo.

REM Check Java
echo [1/4] Checking Java...
java -version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    java -version
    echo ✓ Java is installed
) else (
    echo ✗ Java is NOT installed
    echo Please install Java 17: https://www.oracle.com/java/technologies/downloads/
    pause
    exit /b 1
)

echo.

REM Check PostgreSQL
echo [2/4] Checking PostgreSQL...
psql --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    psql --version
    echo ✓ PostgreSQL is installed
) else (
    echo ✗ PostgreSQL is NOT installed
    echo Please install PostgreSQL: https://www.postgresql.org/download/windows/
    pause
    exit /b 1
)

echo.

REM Check Maven
echo [3/4] Checking Maven...
mvn -version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    mvn -version | findstr "Apache Maven"
    echo ✓ Maven is installed
) else (
    echo ✗ Maven is NOT installed
    echo Please install Maven: https://maven.apache.org/download.cgi
    pause
    exit /b 1
)

echo.

REM Check database connection
echo [4/4] Checking PostgreSQL database...
psql -U roadeye_user -d roadeye_db -c "SELECT 1;" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✓ Database 'roadeye_db' exists and is accessible
) else (
    echo ✗ Cannot connect to database 'roadeye_db'
    echo Please run the database setup commands from SETUP_GUIDE.md
    pause
    exit /b 1
)

echo.
echo ====================================
echo ✓ All checks passed!
echo ====================================
echo.
echo Next steps:
echo 1. cd backend
echo 2. mvn clean install
echo 3. mvn spring-boot:run
echo.
pause
