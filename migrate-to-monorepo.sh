#!/bin/bash

# FoodOS Monorepo Migration Script
# This script reorganizes the project into a monorepo structure

set -e  # Exit on error

echo "========================================="
echo "FoodOS Monorepo Migration"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "foodos-app" ] || [ ! -d "recipe-pipeline" ]; then
    echo -e "${RED}Error: foodos-app and recipe-pipeline directories not found${NC}"
    echo "Please run this script from the workspace root directory"
    exit 1
fi

echo -e "${YELLOW}This script will:${NC}"
echo "1. Create packages/ directory"
echo "2. Move foodos-app to packages/mobile"
echo "3. Move recipe-pipeline to packages/pipeline"
echo "4. Update package.json files"
echo "5. Install all dependencies"
echo ""
echo -e "${YELLOW}Current structure will be backed up to .backup/${NC}"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled"
    exit 0
fi

# Create backup
echo ""
echo -e "${GREEN}Step 1: Creating backup...${NC}"
mkdir -p .backup
cp -r foodos-app .backup/ 2>/dev/null || true
cp -r recipe-pipeline .backup/ 2>/dev/null || true
echo "✓ Backup created in .backup/"

# Create packages directory
echo ""
echo -e "${GREEN}Step 2: Creating packages directory...${NC}"
mkdir -p packages
echo "✓ packages/ directory created"

# Move foodos-app to packages/mobile
echo ""
echo -e "${GREEN}Step 3: Moving foodos-app to packages/mobile...${NC}"
if [ -d "packages/mobile" ]; then
    echo -e "${YELLOW}Warning: packages/mobile already exists, skipping...${NC}"
else
    mv foodos-app packages/mobile
    echo "✓ Moved foodos-app → packages/mobile"
fi

# Move recipe-pipeline to packages/pipeline
echo ""
echo -e "${GREEN}Step 4: Moving recipe-pipeline to packages/pipeline...${NC}"
if [ -d "packages/pipeline" ]; then
    echo -e "${YELLOW}Warning: packages/pipeline already exists, skipping...${NC}"
else
    mv recipe-pipeline packages/pipeline
    echo "✓ Moved recipe-pipeline → packages/pipeline"
fi

# Update package.json for mobile
echo ""
echo -e "${GREEN}Step 5: Updating package.json files...${NC}"
cd packages/mobile
if command -v npm &> /dev/null; then
    npm pkg set name="@foodos/mobile"
    echo "✓ Updated packages/mobile/package.json"
else
    echo -e "${YELLOW}Warning: npm not found, please manually update package name${NC}"
fi
cd ../..

# Update package.json for pipeline
cd packages/pipeline
if command -v npm &> /dev/null; then
    npm pkg set name="@foodos/pipeline"
    echo "✓ Updated packages/pipeline/package.json"
else
    echo -e "${YELLOW}Warning: npm not found, please manually update package name${NC}"
fi
cd ../..

# Install dependencies
echo ""
echo -e "${GREEN}Step 6: Installing dependencies...${NC}"
if command -v npm &> /dev/null; then
    npm install
    echo "✓ Dependencies installed"
else
    echo -e "${RED}Error: npm not found${NC}"
    echo "Please install Node.js and npm, then run: npm install"
fi

# Verify structure
echo ""
echo -e "${GREEN}Step 7: Verifying structure...${NC}"
if [ -d "packages/mobile" ] && [ -d "packages/pipeline" ]; then
    echo "✓ Directory structure verified"
else
    echo -e "${RED}Error: Directory structure verification failed${NC}"
    exit 1
fi

# Success message
echo ""
echo "========================================="
echo -e "${GREEN}Migration Complete!${NC}"
echo "========================================="
echo ""
echo "New structure:"
echo "  packages/"
echo "    ├── mobile/     (formerly foodos-app)"
echo "    └── pipeline/   (formerly recipe-pipeline)"
echo ""
echo "Next steps:"
echo "  1. Test mobile app:  npm run mobile:test"
echo "  2. Test pipeline:    npm run pipeline:test"
echo "  3. Run all tests:    npm test"
echo ""
echo "Available commands:"
echo "  npm run mobile              # Start mobile dev server"
echo "  npm run mobile:ios          # Run on iOS"
echo "  npm run mobile:android      # Run on Android"
echo "  npm run pipeline            # Run pipeline in dev mode"
echo "  npm run pipeline:ingest     # Run recipe ingestion"
echo "  npm run pipeline:migrate    # Run database migrations"
echo "  npm test                    # Run all tests"
echo ""
echo -e "${YELLOW}Backup saved in .backup/ directory${NC}"
echo ""
