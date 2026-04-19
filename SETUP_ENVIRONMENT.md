# Environment Setup Guide

You need to configure environment variables for both the mobile app and the pipeline.

## 📱 Mobile App Environment Variables

File: `packages/mobile/.env`

This file already exists. Check if it has the correct values:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### How to Get Supabase Keys:

1. Go to https://supabase.com
2. Sign in and select your project (or create a new one)
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## 🔄 Pipeline Environment Variables

File: `packages/pipeline/.env`

I've created this file for you. You need to fill in these values:

```bash
# REQUIRED
USDA_API_KEY=your_usda_api_key_here
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_SERVICE_KEY=your_supabase_service_role_key_here
```

### How to Get USDA API Key:

1. Go to https://fdc.nal.usda.gov/api-key-signup.html
2. Fill out the form (it's free!)
3. Check your email for the API key
4. Copy the key to `USDA_API_KEY` in `.env`

### How to Get Supabase Keys:

1. Go to https://supabase.com
2. Sign in and select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** → `SUPABASE_SERVICE_KEY` ⚠️ (NOT the anon key!)

⚠️ **Important:** The pipeline needs the **service_role key**, not the anon key!

## Quick Setup Steps

### Step 1: Edit Mobile .env

```bash
# Open in your editor
code packages/mobile/.env

# Or use notepad
notepad packages/mobile/.env
```

Make sure it has:
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 2: Edit Pipeline .env

```bash
# Open in your editor
code packages/pipeline/.env

# Or use notepad
notepad packages/pipeline/.env
```

Replace the placeholder values:
```
USDA_API_KEY=your_actual_key_here
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 3: Verify

After setting up the environment variables:

```bash
# Test the pipeline
npm run pipeline

# If it works, you'll see:
# {"timestamp":"...","level":"info","stage":"config","message":"Validating environment configuration"}
# {"timestamp":"...","level":"info","stage":"ingestion","message":"Starting recipe ingestion job"}
```

## Common Issues

### "Missing required environment variable"

- Make sure you've replaced `your_xxx_here` with actual values
- Check there are no extra spaces or quotes
- Make sure the file is named `.env` (not `.env.txt`)

### "Invalid API key"

- USDA: Check your email for the correct key
- Supabase: Make sure you copied the full key (they're long!)

### "Cannot connect to Supabase"

- Check the URL format: `https://xxxxx.supabase.co`
- Make sure your Supabase project is active
- For pipeline: Use **service_role key**, not anon key
- For mobile: Use **anon key**, not service_role key

## Environment Variable Reference

### Mobile App (.env)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Public/anon key | Supabase Dashboard → Settings → API |

### Pipeline (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `USDA_API_KEY` | ✅ Yes | - | USDA FoodData Central API key |
| `SUPABASE_URL` | ✅ Yes | - | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | ✅ Yes | - | Supabase service role key |
| `RECIPE_FETCH_LIMIT` | No | 100 | Number of recipes to fetch |
| `RECIPE_BATCH_SIZE` | No | 10 | Batch size for processing |
| `REFRESH_MODE` | No | false | Re-enrich stale recipes |
| `STALENESS_THRESHOLD_DAYS` | No | 90 | Days before recipe is stale |
| `USDA_CONCURRENCY_LIMIT` | No | 5 | Max concurrent API requests |
| `LOG_LEVEL` | No | info | Logging level (debug/info/warn/error) |

## Next Steps

After setting up environment variables:

1. **Run database migrations:**
   ```bash
   npm run pipeline:migrate
   ```

2. **Ingest recipes:**
   ```bash
   npm run pipeline:ingest
   ```

3. **Start mobile app:**
   ```bash
   npm run mobile
   ```

## Security Notes

⚠️ **Never commit `.env` files to git!**

The `.gitignore` file already excludes `.env` files, but double-check:

```bash
# Check if .env is ignored
git check-ignore packages/mobile/.env
git check-ignore packages/pipeline/.env

# Should output the file paths if they're ignored
```

## Need Help?

- **USDA API:** https://fdc.nal.usda.gov/api-guide.html
- **Supabase Docs:** https://supabase.com/docs
- **Check your setup:** Run `npm run pipeline` and look at the error messages
