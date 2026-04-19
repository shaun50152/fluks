# FoodOS Monorepo - Quick Start Guide

Get up and running with the FoodOS monorepo in minutes.

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git (optional)

## Step 1: Migrate to Monorepo Structure

Choose your operating system:

### On macOS/Linux:

```bash
# Make the script executable
chmod +x migrate-to-monorepo.sh

# Run the migration
./migrate-to-monorepo.sh
```

### On Windows:

```cmd
# Run the migration
migrate-to-monorepo.bat
```

### Manual Migration (if scripts don't work):

```bash
# Create packages directory
mkdir -p packages

# Move projects
mv foodos-app packages/mobile
mv recipe-pipeline packages/pipeline

# Update package names
cd packages/mobile && npm pkg set name="@foodos/mobile" && cd ../..
cd packages/pipeline && npm pkg set name="@foodos/pipeline" && cd ../..

# Install dependencies
npm install
```

## Step 2: Set Up Environment Variables

### Mobile App

Create `packages/mobile/.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Pipeline

Create `packages/pipeline/.env`:

```bash
# Required
USDA_API_KEY=your-usda-api-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Optional (defaults shown)
RECIPE_FETCH_LIMIT=100
RECIPE_BATCH_SIZE=10
REFRESH_MODE=false
STALENESS_THRESHOLD_DAYS=90
USDA_CONCURRENCY_LIMIT=5
LOG_LEVEL=info
```

**Get your keys:**
- Supabase: https://supabase.com → Your Project → Settings → API
- USDA: https://fdc.nal.usda.gov/api-key-signup.html

## Step 3: Set Up Database

Run the database migrations:

```bash
npm run pipeline:migrate
```

This creates all necessary tables in your Supabase database.

## Step 4: Run the Pipeline (First Time)

Fetch and enrich recipes:

```bash
npm run pipeline:ingest
```

This will:
- Fetch 100 recipes from TheMealDB
- Enrich them with USDA nutrition data
- Store them in your Supabase database

Expected output:
```json
{
  "totalFetched": 100,
  "totalEnriched": 85,
  "totalPartial": 10,
  "totalFailed": 5,
  "durationMs": 45000
}
```

## Step 5: Start the Mobile App

```bash
npm run mobile
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Press `w` for web browser
- Scan QR code with Expo Go app

## Verify Everything Works

### Run Tests

```bash
# All tests
npm test

# Mobile tests only
npm run mobile:test

# Pipeline tests only
npm run pipeline:test
```

### Check Mobile App

1. Sign up with email/password
2. Complete onboarding (select persona)
3. See DecisionCard on home screen
4. Browse recipes in Discover tab

### Check Pipeline

```bash
# View logs
npm run pipeline

# Check database
# Go to Supabase dashboard → Table Editor → recipes
# You should see enriched recipes with macros
```

## Common Commands

### Mobile App

```bash
npm run mobile              # Start dev server
npm run mobile:ios          # Run on iOS
npm run mobile:android      # Run on Android
npm run mobile:web          # Run in browser
npm run mobile:test         # Run tests
```

### Pipeline

```bash
npm run pipeline            # Dev mode
npm run pipeline:ingest     # Run ingestion
npm run pipeline:migrate    # Run migrations
npm run pipeline:build      # Build for production
npm run pipeline:test       # Run tests
```

### Both

```bash
npm test                    # Run all tests
npm run clean               # Clean all node_modules
```

## Troubleshooting

### "Cannot find workspace"

```bash
# Reinstall from root
npm install
```

### Mobile app won't start

```bash
cd packages/mobile
npm install
npx expo start --clear
```

### Pipeline fails

```bash
# Check environment variables
cat packages/pipeline/.env

# Check API keys are valid
# USDA: https://fdc.nal.usda.gov/
# Supabase: https://supabase.com

# Run with debug logging
cd packages/pipeline
LOG_LEVEL=debug npm run dev
```

### Tests failing

```bash
# Clear caches
npm run clean
npm install

# Run tests again
npm test
```

## Next Steps

1. **Customize the app:** Edit files in `packages/mobile/app/`
2. **Add more recipes:** Increase `RECIPE_FETCH_LIMIT` in pipeline `.env`
3. **Schedule pipeline:** Set up cron job for weekly recipe refresh
4. **Deploy mobile app:** Use `eas build` for iOS/Android
5. **Deploy pipeline:** Use Docker or serverless functions

## Project Structure

```
foodos/
├── packages/
│   ├── mobile/              # React Native app
│   │   ├── app/            # Screens and routes
│   │   ├── components/     # UI components
│   │   ├── lib/            # Business logic
│   │   ├── stores/         # State management
│   │   └── .env            # Environment variables
│   │
│   └── pipeline/            # Recipe pipeline
│       ├── src/            # Source code
│       │   ├── clients/    # API clients
│       │   ├── parsers/    # Ingredient parsing
│       │   ├── matchers/   # USDA matching
│       │   └── storage/    # Supabase storage
│       └── .env            # Environment variables
│
├── .kiro/                   # Specs and config
├── package.json             # Root workspace config
└── README.md               # Full documentation
```

## Resources

- **Full Documentation:** [README.md](./README.md)
- **Migration Guide:** [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- **Mobile Spec:** [.kiro/specs/foodos-app/](../.kiro/specs/foodos-app/)
- **Pipeline Spec:** [.kiro/specs/recipe-ingestion-pipeline/](../.kiro/specs/recipe-ingestion-pipeline/)

## Getting Help

1. Check the troubleshooting section above
2. Review package-specific READMEs
3. Check the specs in `.kiro/specs/`
4. Open an issue on GitHub

## Success Checklist

- [ ] Migration completed successfully
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Pipeline ingested recipes
- [ ] Mobile app starts and shows recipes
- [ ] All tests pass

If all boxes are checked, you're ready to develop! 🎉
