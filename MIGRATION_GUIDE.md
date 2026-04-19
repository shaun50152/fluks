# Monorepo Migration Guide

This guide will help you reorganize your existing FoodOS projects into a monorepo structure.

## Current Structure

```
workspace/
├── foodos-app/           # Mobile app
├── recipe-pipeline/      # Recipe ingestion pipeline
└── .kiro/               # Specs
```

## Target Structure

```
workspace/
├── packages/
│   ├── mobile/          # Moved from foodos-app/
│   └── pipeline/        # Moved from recipe-pipeline/
├── .kiro/               # Stays here
├── package.json         # Root workspace config (CREATED)
├── README.md            # Root README (CREATED)
└── .gitignore          # Root gitignore (CREATED)
```

## Migration Steps

### Step 1: Create packages directory

```bash
mkdir -p packages
```

### Step 2: Move existing projects

```bash
# Move mobile app
mv foodos-app packages/mobile

# Move pipeline
mv recipe-pipeline packages/pipeline
```

### Step 3: Update package.json files

**For packages/mobile/package.json:**

Add/update the `name` field:
```json
{
  "name": "@foodos/mobile",
  "version": "1.0.0",
  ...
}
```

**For packages/pipeline/package.json:**

Add/update the `name` field:
```json
{
  "name": "@foodos/pipeline",
  "version": "1.0.0",
  ...
}
```

### Step 4: Install dependencies

```bash
# From the root directory
npm install
```

This will install dependencies for all packages.

### Step 5: Update environment files

**Mobile app:**
- Keep `packages/mobile/.env` as is
- No changes needed

**Pipeline:**
- Keep `packages/pipeline/.env` as is
- No changes needed

### Step 6: Update any absolute paths

If you have any scripts or configs with absolute paths, update them:

**Before:**
```bash
/path/to/foodos-app/...
/path/to/recipe-pipeline/...
```

**After:**
```bash
/path/to/foodos/packages/mobile/...
/path/to/foodos/packages/pipeline/...
```

### Step 7: Test everything works

```bash
# Test mobile app
npm run mobile:test

# Test pipeline
npm run pipeline:test

# Run all tests
npm test
```

### Step 8: Update Git (if using)

```bash
# If you have separate git repos, you may want to:
cd packages/mobile
rm -rf .git

cd ../pipeline
rm -rf .git

# Then initialize a new repo at the root
cd ../..
git init
git add .
git commit -m "Migrate to monorepo structure"
```

## Quick Migration Script

You can run this script to automate the migration:

```bash
#!/bin/bash

echo "Starting monorepo migration..."

# Create packages directory
mkdir -p packages

# Move projects
echo "Moving foodos-app to packages/mobile..."
mv foodos-app packages/mobile

echo "Moving recipe-pipeline to packages/pipeline..."
mv recipe-pipeline packages/pipeline

# Update package names
echo "Updating package.json files..."

# Update mobile package.json
cd packages/mobile
npm pkg set name="@foodos/mobile"
cd ../..

# Update pipeline package.json
cd packages/pipeline
npm pkg set name="@foodos/pipeline"
cd ../..

# Install all dependencies
echo "Installing dependencies..."
npm install

echo "Migration complete!"
echo ""
echo "Next steps:"
echo "1. Test mobile app: npm run mobile:test"
echo "2. Test pipeline: npm run pipeline:test"
echo "3. Run all tests: npm test"
```

Save this as `migrate.sh`, make it executable, and run it:

```bash
chmod +x migrate.sh
./migrate.sh
```

## Verification Checklist

After migration, verify:

- [ ] `packages/mobile/` exists with all mobile app files
- [ ] `packages/pipeline/` exists with all pipeline files
- [ ] Root `package.json` has workspaces configured
- [ ] `npm run mobile` starts the mobile app
- [ ] `npm run pipeline` runs the pipeline
- [ ] `npm test` runs tests for both packages
- [ ] Environment variables still work
- [ ] `.kiro/specs/` is accessible from root

## Rollback (if needed)

If something goes wrong:

```bash
# Move projects back
mv packages/mobile foodos-app
mv packages/pipeline recipe-pipeline

# Remove monorepo files
rm package.json
rm README.md
rm .gitignore
rm -rf packages
rm -rf node_modules

# Reinstall in original locations
cd foodos-app && npm install && cd ..
cd recipe-pipeline && npm install && cd ..
```

## New Workflow After Migration

### Running the mobile app:
```bash
npm run mobile              # Start dev server
npm run mobile:ios          # Run on iOS
npm run mobile:android      # Run on Android
npm run mobile:test         # Run tests
```

### Running the pipeline:
```bash
npm run pipeline            # Dev mode
npm run pipeline:ingest     # Run ingestion
npm run pipeline:migrate    # Run migrations
npm run pipeline:test       # Run tests
```

### Running tests:
```bash
npm test                    # All tests
npm run mobile:test         # Mobile only
npm run pipeline:test       # Pipeline only
```

## Benefits of Monorepo

1. **Single install:** One `npm install` for everything
2. **Unified scripts:** Run commands from root
3. **Shared dependencies:** Common packages installed once
4. **Easier CI/CD:** Single pipeline for all packages
5. **Better organization:** Clear separation of concerns
6. **Future-ready:** Easy to add shared packages later

## Troubleshooting

**"Cannot find module" errors:**
```bash
npm run clean
npm install
```

**Workspace not found:**
- Ensure you're running commands from the root directory
- Check `package.json` has correct workspace paths

**Tests failing:**
```bash
# Clear caches
cd packages/mobile && npx jest --clearCache && cd ../..
cd packages/pipeline && npx jest --clearCache && cd ../..

# Reinstall
npm run clean
npm install
```

## Next Steps

After successful migration:

1. Update your CI/CD pipelines to use new paths
2. Update documentation with new commands
3. Consider adding a `packages/shared` for common code
4. Update any deployment scripts
5. Commit the new structure to version control
