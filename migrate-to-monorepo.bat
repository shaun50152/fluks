@echo off
REM FoodOS Monorepo Migration Script (Windows)
REM This script reorganizes the project into a monorepo structure

setlocal enabledelayedexpansion

echo =========================================
echo FoodOS Monorepo Migration
echo =========================================
echo.

REM Check if we're in the right directory
if not exist "foodos-app" (
    echo Error: foodos-app directory not found
    echo Please run this script from the workspace root directory
    exit /b 1
)

if not exist "recipe-pipeline" (
    echo Error: recipe-pipeline directory not found
    echo Please run this script from the workspace root directory
    exit /b 1
)

echo This script will:
echo 1. Create packages/ directory
echo 2. Move foodos-app to packages/mobile
echo 3. Move recipe-pipeline to packages/pipeline
echo 4. Update package.json files
echo 5. Install all dependencies
echo.
echo Current structure will be backed up to .backup/
echo.
set /p CONTINUE="Continue? (y/n): "

if /i not "%CONTINUE%"=="y" (
    echo Migration cancelled
    exit /b 0
)

REM Create backup
echo.
echo Step 1: Creating backup...
if not exist ".backup" mkdir .backup
xcopy /E /I /Q foodos-app .backup\foodos-app 2>nul
xcopy /E /I /Q recipe-pipeline .backup\recipe-pipeline 2>nul
echo [OK] Backup created in .backup/

REM Create packages directory
echo.
echo Step 2: Creating packages directory...
if not exist "packages" mkdir packages
echo [OK] packages/ directory created

REM Move foodos-app to packages/mobile
echo.
echo Step 3: Moving foodos-app to packages/mobile...
if exist "packages\mobile" (
    echo [WARNING] packages/mobile already exists, skipping...
) else (
    move foodos-app packages\mobile >nul
    echo [OK] Moved foodos-app -^> packages/mobile
)

REM Move recipe-pipeline to packages/pipeline
echo.
echo Step 4: Moving recipe-pipeline to packages/pipeline...
if exist "packages\pipeline" (
    echo [WARNING] packages/pipeline already exists, skipping...
) else (
    move recipe-pipeline packages\pipeline >nul
    echo [OK] Moved recipe-pipeline -^> packages/pipeline
)

REM Update package.json for mobile
echo.
echo Step 5: Updating package.json files...
cd packages\mobile
where npm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    call npm pkg set name="@foodos/mobile"
    echo [OK] Updated packages/mobile/package.json
) else (
    echo [WARNING] npm not found, please manually update package name
)
cd ..\..

REM Update package.json for pipeline
cd packages\pipeline
where npm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    call npm pkg set name="@foodos/pipeline"
    echo [OK] Updated packages/pipeline/package.json
) else (
    echo [WARNING] npm not found, please manually update package name
)
cd ..\..

REM Install dependencies
echo.
echo Step 6: Installing dependencies...
where npm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    call npm install
    echo [OK] Dependencies installed
) else (
    echo [ERROR] npm not found
    echo Please install Node.js and npm, then run: npm install
)

REM Verify structure
echo.
echo Step 7: Verifying structure...
if exist "packages\mobile" (
    if exist "packages\pipeline" (
        echo [OK] Directory structure verified
    ) else (
        echo [ERROR] Directory structure verification failed
        exit /b 1
    )
) else (
    echo [ERROR] Directory structure verification failed
    exit /b 1
)

REM Success message
echo.
echo =========================================
echo Migration Complete!
echo =========================================
echo.
echo New structure:
echo   packages/
echo     ├── mobile/     (formerly foodos-app)
echo     └── pipeline/   (formerly recipe-pipeline)
echo.
echo Next steps:
echo   1. Test mobile app:  npm run mobile:test
echo   2. Test pipeline:    npm run pipeline:test
echo   3. Run all tests:    npm test
echo.
echo Available commands:
echo   npm run mobile              # Start mobile dev server
echo   npm run mobile:ios          # Run on iOS
echo   npm run mobile:android      # Run on Android
echo   npm run pipeline            # Run pipeline in dev mode
echo   npm run pipeline:ingest     # Run recipe ingestion
echo   npm run pipeline:migrate    # Run database migrations
echo   npm test                    # Run all tests
echo.
echo Backup saved in .backup/ directory
echo.

endlocal
