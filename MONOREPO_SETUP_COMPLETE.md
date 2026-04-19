# ✅ Monorepo Setup Complete!

I've created all the necessary files to convert your FoodOS project into a monorepo structure.

## What Was Created

### Core Files
- ✅ `package.json` - Root workspace configuration
- ✅ `README.md` - Comprehensive documentation
- ✅ `.gitignore` - Git ignore rules
- ✅ `QUICKSTART.md` - Quick start guide
- ✅ `MIGRATION_GUIDE.md` - Detailed migration instructions

### Migration Scripts
- ✅ `migrate-to-monorepo.sh` - Automated migration (macOS/Linux)
- ✅ `migrate-to-monorepo.bat` - Automated migration (Windows)
- ✅ `verify-setup.sh` - Setup verification script

## Next Steps

### Option 1: Automated Migration (Recommended)

**On macOS/Linux:**
```bash
# Make script executable
chmod +x migrate-to-monorepo.sh

# Run migration
./migrate-to-monorepo.sh
```

**On Windows:**
```cmd
migrate-to-monorepo.bat
```

### Option 2: Manual Migration

```bash
# 1. Create packages directory
mkdir -p packages

# 2. Move projects
mv foodos-app packages/mobile
mv recipe-pipeline packages/pipeline

# 3. Update package names
cd packages/mobile && npm pkg set name="@foodos/mobile" && cd ../..
cd packages/pipeline && npm pkg set name="@foodos/pipeline" && cd ../..

# 4. Install dependencies
npm install
```

### Verify Setup

```bash
# Make verification script executable
chmod +x verify-setup.sh

# Run verification
./verify-setup.sh
```

## New Project Structure

After migration, your structure will be:

```
foodos/                          # Root (you are here)
├── packages/
│   ├── mobile/                  # React Native app (was: foodos-app/)
│   │   ├── app/                # Screens and routes
│   │   ├── components/         # UI components
│   │   ├── lib/                # Business logic
│   │   ├── stores/             # State management
│   │   ├── .env               # Mobile environment variables
│   │   └── package.json       # Mobile dependencies
│   │
│   └── pipeline/               # Recipe pipeline (was: recipe-pipeline/)
│       ├── src/               # Source code
│       ├── .env              # Pipeline environment variables
│       └── package.json      # Pipeline dependencies
│
├── .kiro/                      # Specs (unchanged)
│   └── specs/
│       ├── foodos-app/
│       └── recipe-ingestion-pipeline/
│
├── package.json                # Root workspace config (NEW)
├── README.md                   # Root documentation (NEW)
├── QUICKSTART.md              # Quick start guide (NEW)
├── MIGRATION_GUIDE.md         # Migration guide (NEW)
└── .gitignore                 # Root gitignore (NEW)
```

## New Commands

After migration, use these commands from the root directory:

### Mobile App
```bash
npm run mobile              # Start dev server
npm run mobile:ios          # Run on iOS
npm run mobile:android      # Run on Android
npm run mobile:web          # Run in browser
npm run mobile:test         # Run mobile tests
```

### Pipeline
```bash
npm run pipeline            # Dev mode
npm run pipeline:ingest     # Run ingestion
npm run pipeline:migrate    # Run migrations
npm run pipeline:build      # Build for production
npm run pipeline:test       # Run pipeline tests
```

### Both
```bash
npm test                    # Run all tests
npm run clean               # Clean all node_modules
```

## Environment Variables

After migration, your environment files stay in the same place:

- **Mobile:** `packages/mobile/.env`
- **Pipeline:** `packages/pipeline/.env`

No changes needed to your existing `.env` files!

## What Happens to Old Directories?

The migration script will:
1. Create a backup in `.backup/` directory
2. Move `foodos-app/` → `packages/mobile/`
3. Move `recipe-pipeline/` → `packages/pipeline/`

Your original directories will be gone, but backed up safely.

## Rollback (if needed)

If something goes wrong:

```bash
# Restore from backup
mv packages/mobile foodos-app
mv packages/pipeline recipe-pipeline
rm -rf packages

# Or restore from .backup/
cp -r .backup/foodos-app ./
cp -r .backup/recipe-pipeline ./
```

## Benefits of This Setup

✅ **Single install:** One `npm install` for everything
✅ **Unified commands:** Run everything from root
✅ **Better organization:** Clear separation of concerns
✅ **Shared dependencies:** Common packages installed once
✅ **Easier CI/CD:** Single pipeline for all packages
✅ **Future-ready:** Easy to add shared packages later

## Complete Workflow After Migration

### 1. Run Migration
```bash
./migrate-to-monorepo.sh
```

### 2. Verify Setup
```bash
./verify-setup.sh
```

### 3. Set Up Database
```bash
npm run pipeline:migrate
```

### 4. Ingest Recipes
```bash
npm run pipeline:ingest
```

### 5. Start Mobile App
```bash
npm run mobile
```

### 6. Run Tests
```bash
npm test
```

## Troubleshooting

### "Permission denied" on scripts
```bash
chmod +x migrate-to-monorepo.sh
chmod +x verify-setup.sh
```

### "Cannot find workspace"
```bash
npm install
```

### Tests failing
```bash
npm run clean
npm install
npm test
```

## Documentation

- **Quick Start:** [QUICKSTART.md](./QUICKSTART.md)
- **Full Guide:** [README.md](./README.md)
- **Migration Details:** [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)

## Ready to Migrate?

Run this command to start:

**macOS/Linux:**
```bash
chmod +x migrate-to-monorepo.sh && ./migrate-to-monorepo.sh
```

**Windows:**
```cmd
migrate-to-monorepo.bat
```

---

## Questions?

- Check [QUICKSTART.md](./QUICKSTART.md) for common issues
- Review [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for details
- Run `./verify-setup.sh` to check your setup

Good luck! 🚀
