#!/bin/bash

# FoodOS Setup Verification Script
# Checks if the monorepo is set up correctly

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================="
echo "FoodOS Setup Verification"
echo "========================================="
echo ""

ERRORS=0
WARNINGS=0

# Function to check if a file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2"
        ((ERRORS++))
        return 1
    fi
}

# Function to check if a directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2"
        ((ERRORS++))
        return 1
    fi
}

# Function to check if a command exists
check_command() {
    if command -v "$1" &> /dev/null; then
        VERSION=$($1 --version 2>&1 | head -n 1)
        echo -e "${GREEN}✓${NC} $2 ($VERSION)"
        return 0
    else
        echo -e "${RED}✗${NC} $2"
        ((ERRORS++))
        return 1
    fi
}

# Function to check environment variable
check_env_var() {
    if [ -f "$1" ]; then
        if grep -q "^$2=" "$1" 2>/dev/null; then
            VALUE=$(grep "^$2=" "$1" | cut -d '=' -f 2)
            if [ -n "$VALUE" ] && [ "$VALUE" != "your_" ] && [ "$VALUE" != "your-" ]; then
                echo -e "${GREEN}✓${NC} $3 is set"
                return 0
            else
                echo -e "${YELLOW}⚠${NC} $3 is not configured"
                ((WARNINGS++))
                return 1
            fi
        else
            echo -e "${YELLOW}⚠${NC} $3 is missing"
            ((WARNINGS++))
            return 1
        fi
    else
        echo -e "${RED}✗${NC} $1 not found"
        ((ERRORS++))
        return 1
    fi
}

echo -e "${BLUE}Checking Prerequisites...${NC}"
check_command "node" "Node.js installed"
check_command "npm" "npm installed"
echo ""

echo -e "${BLUE}Checking Project Structure...${NC}"
check_file "package.json" "Root package.json exists"
check_file "README.md" "Root README exists"
check_dir "packages" "packages/ directory exists"
check_dir "packages/mobile" "packages/mobile/ exists"
check_dir "packages/pipeline" "packages/pipeline/ exists"
check_dir ".kiro" ".kiro/ directory exists"
echo ""

echo -e "${BLUE}Checking Mobile App...${NC}"
check_file "packages/mobile/package.json" "Mobile package.json exists"
check_file "packages/mobile/app.json" "Mobile app.json exists"
check_dir "packages/mobile/app" "Mobile app/ directory exists"
check_dir "packages/mobile/components" "Mobile components/ directory exists"
check_dir "packages/mobile/lib" "Mobile lib/ directory exists"
check_dir "packages/mobile/stores" "Mobile stores/ directory exists"
echo ""

echo -e "${BLUE}Checking Pipeline...${NC}"
check_file "packages/pipeline/package.json" "Pipeline package.json exists"
check_file "packages/pipeline/tsconfig.json" "Pipeline tsconfig.json exists"
check_dir "packages/pipeline/src" "Pipeline src/ directory exists"
echo ""

echo -e "${BLUE}Checking Environment Variables...${NC}"
echo "Mobile App:"
check_env_var "packages/mobile/.env" "EXPO_PUBLIC_SUPABASE_URL" "  Supabase URL"
check_env_var "packages/mobile/.env" "EXPO_PUBLIC_SUPABASE_ANON_KEY" "  Supabase Anon Key"
echo ""
echo "Pipeline:"
check_env_var "packages/pipeline/.env" "USDA_API_KEY" "  USDA API Key"
check_env_var "packages/pipeline/.env" "SUPABASE_URL" "  Supabase URL"
check_env_var "packages/pipeline/.env" "SUPABASE_SERVICE_KEY" "  Supabase Service Key"
echo ""

echo -e "${BLUE}Checking Dependencies...${NC}"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Root node_modules exists"
else
    echo -e "${YELLOW}⚠${NC} Root node_modules missing (run: npm install)"
    ((WARNINGS++))
fi

if [ -d "packages/mobile/node_modules" ]; then
    echo -e "${GREEN}✓${NC} Mobile node_modules exists"
else
    echo -e "${YELLOW}⚠${NC} Mobile node_modules missing"
    ((WARNINGS++))
fi

if [ -d "packages/pipeline/node_modules" ]; then
    echo -e "${GREEN}✓${NC} Pipeline node_modules exists"
else
    echo -e "${YELLOW}⚠${NC} Pipeline node_modules missing"
    ((WARNINGS++))
fi
echo ""

echo -e "${BLUE}Checking Package Names...${NC}"
if [ -f "packages/mobile/package.json" ]; then
    MOBILE_NAME=$(grep '"name"' packages/mobile/package.json | head -n 1 | cut -d '"' -f 4)
    if [ "$MOBILE_NAME" = "@foodos/mobile" ]; then
        echo -e "${GREEN}✓${NC} Mobile package name is correct (@foodos/mobile)"
    else
        echo -e "${YELLOW}⚠${NC} Mobile package name is '$MOBILE_NAME' (should be @foodos/mobile)"
        ((WARNINGS++))
    fi
fi

if [ -f "packages/pipeline/package.json" ]; then
    PIPELINE_NAME=$(grep '"name"' packages/pipeline/package.json | head -n 1 | cut -d '"' -f 4)
    if [ "$PIPELINE_NAME" = "@foodos/pipeline" ]; then
        echo -e "${GREEN}✓${NC} Pipeline package name is correct (@foodos/pipeline)"
    else
        echo -e "${YELLOW}⚠${NC} Pipeline package name is '$PIPELINE_NAME' (should be @foodos/pipeline)"
        ((WARNINGS++))
    fi
fi
echo ""

# Summary
echo "========================================="
echo "Verification Summary"
echo "========================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Your FoodOS monorepo is set up correctly."
    echo ""
    echo "Next steps:"
    echo "  1. Run database migrations: npm run pipeline:migrate"
    echo "  2. Ingest recipes: npm run pipeline:ingest"
    echo "  3. Start mobile app: npm run mobile"
    echo "  4. Run tests: npm test"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Setup complete with $WARNINGS warning(s)${NC}"
    echo ""
    echo "Your monorepo is functional but has some warnings."
    echo "Review the warnings above and fix if needed."
else
    echo -e "${RED}✗ Setup incomplete: $ERRORS error(s), $WARNINGS warning(s)${NC}"
    echo ""
    echo "Please fix the errors above before proceeding."
    echo ""
    echo "Common fixes:"
    echo "  - Missing directories: Run the migration script"
    echo "  - Missing dependencies: Run 'npm install'"
    echo "  - Missing .env files: Copy from .env.example or create new"
    exit 1
fi

echo ""
