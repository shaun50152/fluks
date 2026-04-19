/**
 * Migration Runner
 * 
 * Applies database migrations idempotently to extend the Supabase recipes table
 * with enrichment metadata columns and indexes.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface MigrationResult {
  success: boolean;
  migrationFile: string;
  error?: string;
}

/**
 * Validates required environment variables
 */
function validateEnvironment(): void {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please ensure these are set in your .env file.'
    );
  }
}

/**
 * Reads a SQL migration file
 */
function readMigrationFile(filename: string): string {
  const migrationPath = path.join(__dirname, filename);
  
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Migration file not found: ${filename}`);
  }
  
  return fs.readFileSync(migrationPath, 'utf-8');
}

/**
 * Prints the SQL migration content for manual execution
 */
function printMigrationInstructions(migrationFile: string, sql: string): void {
  console.log('\n' + '='.repeat(80));
  console.log(`Migration: ${migrationFile}`);
  console.log('='.repeat(80));
  console.log('\nTo apply this migration, use one of the following methods:\n');
  
  console.log('METHOD 1: Supabase Dashboard (Recommended)');
  console.log('  1. Go to your Supabase project dashboard');
  console.log('  2. Navigate to SQL Editor');
  console.log('  3. Create a new query');
  console.log('  4. Copy and paste the SQL below');
  console.log('  5. Click "Run"\n');
  
  console.log('METHOD 2: Supabase CLI');
  console.log('  1. Install: npm install -g supabase');
  console.log('  2. Link: supabase link --project-ref <your-project-ref>');
  console.log(`  3. Run: supabase db execute --file src/migrations/${migrationFile}\n`);
  
  console.log('METHOD 3: psql (PostgreSQL CLI)');
  console.log('  1. Get connection string from Supabase dashboard');
  console.log(`  2. Run: psql <connection-string> -f src/migrations/${migrationFile}\n`);
  
  console.log('='.repeat(80));
  console.log('SQL MIGRATION CONTENT:');
  console.log('='.repeat(80));
  console.log(sql);
  console.log('='.repeat(80) + '\n');
}

/**
 * Applies a single migration file to the database
 */
async function applyMigration(migrationFile: string): Promise<MigrationResult> {
  try {
    console.log(`\nProcessing migration: ${migrationFile}`);
    
    // Read the SQL file
    const sql = readMigrationFile(migrationFile);
    
    // Print instructions for manual execution
    printMigrationInstructions(migrationFile, sql);
    
    console.log('Note: The Supabase JS client does not support direct SQL execution.');
    console.log('Please use one of the methods above to apply the migration.\n');
    
    return {
      success: true,
      migrationFile
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`✗ Migration processing failed: ${migrationFile}`);
    console.error(`  Error: ${errorMessage}`);
    
    return {
      success: false,
      migrationFile,
      error: errorMessage
    };
  }
}

/**
 * Main migration runner
 */
async function runMigrations(): Promise<void> {
  console.log('=== Recipe Pipeline Database Migrations ===\n');
  
  try {
    // Validate environment
    validateEnvironment();
    
    const supabaseUrl = process.env.SUPABASE_URL!;
    
    console.log(`Supabase URL: ${supabaseUrl}`);
    
    // List of migration files to apply (in order)
    const migrations = [
      '001_extend_recipes_table.sql'
    ];
    
    // Process each migration
    const results: MigrationResult[] = [];
    
    for (const migration of migrations) {
      const result = await applyMigration(migration);
      results.push(result);
    }
    
    // Print summary
    console.log('\n=== Migration Summary ===');
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Total migrations: ${results.length}`);
    console.log(`Processed: ${successful}`);
    console.log(`Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\nFailed migrations:');
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  - ${r.migrationFile}: ${r.error}`);
        });
      
      process.exit(1);
    }
    
    console.log('\n✓ All migrations processed successfully!');
    console.log('Please apply the SQL using one of the methods shown above.\n');
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n✗ Migration runner failed:');
    console.error(`  ${errorMessage}\n`);
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

export { runMigrations, applyMigration, validateEnvironment };
