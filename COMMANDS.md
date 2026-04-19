# FoodOS Monorepo - Command Reference

Quick reference for all available commands in the monorepo.

## 📱 Mobile App Commands

Run from root directory:

```bash
# Development
npm run mobile              # Start Expo dev server
npm run mobile:ios          # Run on iOS simulator
npm run mobile:android      # Run on Android emulator
npm run mobile:web          # Run in web browser

# Testing
npm run mobile:test         # Run all mobile tests
```

Or run from `packages/mobile/`:

```bash
cd packages/mobile

npm start                   # Start Expo dev server
npm run ios                 # Run on iOS
npm run android             # Run on Android
npm run web                 # Run in browser
npm test                    # Run tests
```

## 🔄 Pipeline Commands

Run from root directory:

```bash
# Development
npm run pipeline            # Run in dev mode (with ts-node)
npm run pipeline:ingest     # Run recipe ingestion
npm run pipeline:migrate    # Run database migrations

# Production
npm run pipeline:build      # Build TypeScript to JavaScript
npm start --workspace=@foodos/pipeline  # Run built version

# Testing
npm run pipeline:test       # Run all pipeline tests
```

Or run from `packages/pipeline/`:

```bash
cd packages/pipeline

npm run dev                 # Dev mode
npm run ingest              # Run ingestion
npm run migrate             # Run migrations
npm run build               # Build for production
npm start                   # Run production build
npm test                    # Run tests
```

## 🧪 Testing Commands

```bash
# Run all tests (both packages)
npm test

# Run tests with coverage
npm run test:coverage

# Run specific package tests
npm run mobile:test
npm run pipeline:test
```

## 🛠️ Utility Commands

```bash
# Install all dependencies
npm install

# Clean all node_modules
npm run clean

# Install dependencies for specific package
npm install --workspace=@foodos/mobile
npm install --workspace=@foodos/pipeline
```

## 📦 Package Management

```bash
# Add dependency to mobile app
npm install <package> --workspace=@foodos/mobile

# Add dependency to pipeline
npm install <package> --workspace=@foodos/pipeline

# Add dev dependency
npm install -D <package> --workspace=@foodos/mobile

# Remove dependency
npm uninstall <package> --workspace=@foodos/mobile
```

## 🔍 Information Commands

```bash
# List all workspaces
npm ls --workspaces

# Show package info
npm pkg get name --workspace=@foodos/mobile
npm pkg get version --workspace=@foodos/pipeline

# Check for outdated packages
npm outdated --workspaces
```

## 🚀 Complete Workflows

### First Time Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
# Edit packages/mobile/.env
# Edit packages/pipeline/.env

# 3. Run database migrations
npm run pipeline:migrate

# 4. Ingest recipes
npm run pipeline:ingest

# 5. Start mobile app
npm run mobile
```

### Daily Development

```bash
# Terminal 1: Run mobile app
npm run mobile

# Terminal 2: Run pipeline (if needed)
npm run pipeline

# Run tests before committing
npm test
```

### Before Deployment

```bash
# 1. Run all tests
npm test

# 2. Build pipeline
npm run pipeline:build

# 3. Build mobile app
cd packages/mobile
eas build --platform all
```

## 🐛 Debugging Commands

```bash
# Clear all caches
npm run clean
npm install

# Clear Expo cache
cd packages/mobile
npx expo start --clear

# Clear Jest cache
cd packages/mobile
npx jest --clearCache

cd ../pipeline
npx jest --clearCache

# View detailed npm logs
npm run mobile --loglevel verbose
npm run pipeline --loglevel verbose
```

## 📊 Pipeline-Specific Commands

```bash
# Run with different log levels
LOG_LEVEL=debug npm run pipeline
LOG_LEVEL=info npm run pipeline
LOG_LEVEL=warn npm run pipeline
LOG_LEVEL=error npm run pipeline

# Run with custom limits
RECIPE_FETCH_LIMIT=50 npm run pipeline:ingest
RECIPE_BATCH_SIZE=5 npm run pipeline:ingest

# Run in refresh mode
REFRESH_MODE=true npm run pipeline:ingest

# Run with custom concurrency
USDA_CONCURRENCY_LIMIT=3 npm run pipeline:ingest
```

## 📱 Mobile-Specific Commands

```bash
# Clear Expo cache and restart
cd packages/mobile
npx expo start --clear

# Run on specific device
npx expo start --ios --device

# Run with tunnel (for physical device testing)
npx expo start --tunnel

# Generate native projects
npx expo prebuild

# Run native builds
npx expo run:ios
npx expo run:android
```

## 🔐 Environment Management

```bash
# View current environment
cat packages/mobile/.env
cat packages/pipeline/.env

# Copy example env files (if they exist)
cp packages/mobile/.env.example packages/mobile/.env
cp packages/pipeline/.env.example packages/pipeline/.env
```

## 📝 Git Commands (Recommended)

```bash
# Initialize git (if not done)
git init

# Add all files
git add .

# Commit
git commit -m "Migrate to monorepo structure"

# Create .gitignore (already created)
# Ensure node_modules, .env, dist are ignored
```

## 🔄 Update Commands

```bash
# Update all dependencies
npm update --workspaces

# Update specific package
npm update <package> --workspace=@foodos/mobile

# Check for security vulnerabilities
npm audit
npm audit fix
```

## 📚 Documentation Commands

```bash
# Generate documentation (if configured)
npm run docs --workspace=@foodos/mobile
npm run docs --workspace=@foodos/pipeline

# View README files
cat README.md
cat packages/mobile/README.md
cat packages/pipeline/README.md
```

## 🎯 Quick Reference Table

| Task | Command |
|------|---------|
| Install everything | `npm install` |
| Start mobile app | `npm run mobile` |
| Run pipeline | `npm run pipeline` |
| Run all tests | `npm test` |
| Run migrations | `npm run pipeline:migrate` |
| Ingest recipes | `npm run pipeline:ingest` |
| Build pipeline | `npm run pipeline:build` |
| Clean everything | `npm run clean` |

## 💡 Tips

1. **Always run commands from the root directory** unless you need package-specific behavior
2. **Use `--workspace` flag** to target specific packages
3. **Check `package.json`** in root for all available scripts
4. **Use `npm run`** without arguments to see all available scripts
5. **Set environment variables** before running commands when needed

## 🆘 Help

```bash
# Show all available scripts
npm run

# Show help for specific command
npm run mobile --help
npm run pipeline --help

# Show npm help
npm help
npm help install
npm help run-script
```

---

For more information, see:
- [README.md](./README.md) - Full documentation
- [QUICKSTART.md](./QUICKSTART.md) - Quick start guide
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Migration details
