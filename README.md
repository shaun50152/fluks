# FoodOS

A fitness-first, behavior-driven food intelligence platform that helps users decide what to eat, when to eat, and what to prepare ahead.

## Project Structure

This is a monorepo containing multiple packages:

```
foodos/
├── packages/
│   ├── mobile/          # React Native mobile app (iOS/Android)
│   ├── pipeline/        # Recipe ingestion and enrichment pipeline
│   └── shared/          # Shared types and utilities (future)
├── .kiro/               # Kiro specs and configuration
├── package.json         # Root package.json with workspaces
└── README.md           # This file
```

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Expo CLI (for mobile development)
- Supabase account
- USDA API key (for pipeline)

### Installation

```bash
# Install all dependencies for all packages
npm install
```

### Running the Mobile App

```bash
# Start Expo dev server
npm run mobile

# Or run on specific platform
npm run mobile:ios
npm run mobile:android
npm run mobile:web
```

### Running the Recipe Pipeline

```bash
# Set up environment variables first (see packages/pipeline/.env.example)

# Run database migrations
npm run pipeline:migrate

# Run the pipeline in development mode
npm run pipeline

# Or run ingestion directly
npm run pipeline:ingest
```

### Running Tests

```bash
# Run all tests across all packages
npm test

# Run tests for specific package
npm run mobile:test
npm run pipeline:test

# Run with coverage
npm test:coverage
```

## Package Details

### Mobile App (`packages/mobile`)

React Native + Expo mobile application with:
- User authentication and onboarding
- Meal decision support with DecisionCards
- Social feed with recipe discovery
- Prep-ahead planning
- Adaptive schedule learning
- Offline support

**Tech Stack:** React Native, Expo, TypeScript, Expo Router, Zustand, Supabase

[See mobile package README](./packages/mobile/README.md)

### Recipe Pipeline (`packages/pipeline`)

Backend data pipeline that:
- Fetches recipes from TheMealDB API
- Enriches with USDA nutrition data
- Stores in Supabase with macro calculations
- Supports refresh mode for stale recipes

**Tech Stack:** Node.js, TypeScript, Supabase, fast-check (property tests)

[See pipeline package README](./packages/pipeline/README.md)

## Environment Setup

### Mobile App Environment Variables

Create `packages/mobile/.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Pipeline Environment Variables

Create `packages/pipeline/.env`:

```bash
# Required
USDA_API_KEY=your_usda_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Optional (with defaults)
RECIPE_FETCH_LIMIT=100
RECIPE_BATCH_SIZE=10
REFRESH_MODE=false
STALENESS_THRESHOLD_DAYS=90
USDA_CONCURRENCY_LIMIT=5
LOG_LEVEL=info
```

## Development Workflow

### 1. Set Up Supabase

1. Create a Supabase project at https://supabase.com
2. Copy your project URL and keys
3. Run database migrations: `npm run pipeline:migrate`

### 2. Get API Keys

- **USDA API Key:** Sign up at https://fdc.nal.usda.gov/api-key-signup.html
- **Supabase Keys:** Found in Project Settings → API

### 3. Run the Pipeline (First Time)

```bash
# This will fetch and enrich recipes
npm run pipeline:ingest
```

### 4. Start the Mobile App

```bash
npm run mobile
```

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run mobile` | Start mobile app dev server |
| `npm run mobile:ios` | Run on iOS simulator |
| `npm run mobile:android` | Run on Android emulator |
| `npm run mobile:web` | Run in web browser |
| `npm run mobile:test` | Run mobile app tests |
| `npm run pipeline` | Run pipeline in dev mode |
| `npm run pipeline:ingest` | Run recipe ingestion |
| `npm run pipeline:migrate` | Run database migrations |
| `npm run pipeline:test` | Run pipeline tests |
| `npm run pipeline:build` | Build pipeline for production |
| `npm test` | Run all tests |
| `npm run clean` | Clean all node_modules |

## Architecture

### System Overview

```
┌─────────────────┐
│  Mobile App     │
│  (React Native) │
└────────┬────────┘
         │
         ↓
┌─────────────────┐      ┌──────────────────┐
│   Supabase      │←─────│ Recipe Pipeline  │
│   (Backend)     │      │ (Node.js)        │
└─────────────────┘      └────────┬─────────┘
                                  │
                         ┌────────┴─────────┐
                         │                  │
                    ┌────▼─────┐    ┌──────▼──────┐
                    │ TheMealDB│    │  USDA API   │
                    │   API    │    │             │
                    └──────────┘    └─────────────┘
```

### Data Flow

1. **Pipeline** fetches recipes from TheMealDB
2. **Pipeline** enriches with USDA nutrition data
3. **Pipeline** stores enriched recipes in Supabase
4. **Mobile App** queries enriched recipes from Supabase
5. **Mobile App** uses recipes for meal recommendations

## Testing

Both packages include comprehensive test suites:

- **Unit tests:** Test individual functions and components
- **Integration tests:** Test end-to-end flows
- **Property-based tests:** Test universal correctness properties using fast-check

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific package tests
npm run mobile:test
npm run pipeline:test
```

## Deployment

### Mobile App Deployment

```bash
cd packages/mobile

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to stores
eas submit
```

### Pipeline Deployment

**Option 1: Docker**
```bash
cd packages/pipeline
docker build -t foodos-pipeline .
docker run --env-file .env foodos-pipeline
```

**Option 2: Cron Job**
```bash
# Set up weekly cron job
0 2 * * 0 cd /path/to/foodos/packages/pipeline && npm run ingest
```

**Option 3: Serverless (AWS Lambda, Google Cloud Functions, etc.)**
- Build: `npm run pipeline:build`
- Deploy the `dist/` folder

## Troubleshooting

### Common Issues

**"Cannot find workspace"**
- Run `npm install` from the root directory
- Ensure you're using npm >= 9.0.0

**"Module not found" errors**
- Clean and reinstall: `npm run clean && npm install`

**Pipeline fails with USDA rate limit**
- Reduce `USDA_CONCURRENCY_LIMIT` in `.env`
- Wait a few minutes before retrying

**Mobile app can't connect to Supabase**
- Verify environment variables in `packages/mobile/.env`
- Check Supabase project is active
- Ensure you're using the anon key (not service key)

## Contributing

1. Create a feature branch
2. Make your changes in the appropriate package
3. Run tests: `npm test`
4. Submit a pull request

## License

MIT

## Support

For issues and questions:
- Check package-specific READMEs
- Review the specs in `.kiro/specs/`
- Open an issue on GitHub
