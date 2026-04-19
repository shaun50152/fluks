/**
 * Tests for Migration Runner
 */

import * as fs from 'fs';
import * as path from 'path';
import { validateEnvironment } from './run-migrations';

describe('Migration Runner', () => {
  describe('validateEnvironment', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      // Reset environment before each test
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      // Restore original environment
      process.env = originalEnv;
    });

    it('should pass when all required environment variables are set', () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should throw when SUPABASE_URL is missing', () => {
      delete process.env.SUPABASE_URL;
      process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

      expect(() => validateEnvironment()).toThrow('Missing required environment variables: SUPABASE_URL');
    });

    it('should throw when SUPABASE_SERVICE_KEY is missing', () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      delete process.env.SUPABASE_SERVICE_KEY;

      expect(() => validateEnvironment()).toThrow('Missing required environment variables: SUPABASE_SERVICE_KEY');
    });

    it('should throw when both required variables are missing', () => {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_KEY;

      expect(() => validateEnvironment()).toThrow('Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY');
    });
  });

  describe('Migration Files', () => {
    it('should have the SQL migration file', () => {
      const migrationPath = path.join(__dirname, '001_extend_recipes_table.sql');
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    it('should have valid SQL content in migration file', () => {
      const migrationPath = path.join(__dirname, '001_extend_recipes_table.sql');
      const content = fs.readFileSync(migrationPath, 'utf-8');

      // Check for key SQL statements
      expect(content).toContain('ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source');
      expect(content).toContain('ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_recipe_id');
      expect(content).toContain('ALTER TABLE recipes ADD COLUMN IF NOT EXISTS enrichment_status');
      expect(content).toContain('ALTER TABLE recipes ADD COLUMN IF NOT EXISTS unmatched_ingredients');
      expect(content).toContain('ALTER TABLE recipes ADD COLUMN IF NOT EXISTS category');
      expect(content).toContain('ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cuisine');
      
      // Check for indexes
      expect(content).toContain('CREATE INDEX IF NOT EXISTS recipes_source_recipe_id_idx');
      expect(content).toContain('CREATE INDEX IF NOT EXISTS recipes_enrichment_status_idx');
      expect(content).toContain('CREATE INDEX IF NOT EXISTS recipes_category_idx');
      expect(content).toContain('CREATE INDEX IF NOT EXISTS recipes_cuisine_idx');
      
      // Check for unique constraint
      expect(content).toContain('recipes_source_recipe_id_key');
    });

    it('should have idempotent SQL statements', () => {
      const migrationPath = path.join(__dirname, '001_extend_recipes_table.sql');
      const content = fs.readFileSync(migrationPath, 'utf-8');

      // All ALTER TABLE statements should use IF NOT EXISTS
      const alterTableStatements = content.match(/ALTER TABLE recipes ADD COLUMN/g) || [];
      const ifNotExistsStatements = content.match(/ADD COLUMN IF NOT EXISTS/g) || [];
      
      expect(alterTableStatements.length).toBe(ifNotExistsStatements.length);

      // All CREATE INDEX statements should use IF NOT EXISTS
      const createIndexStatements = content.match(/CREATE INDEX/g) || [];
      const indexIfNotExistsStatements = content.match(/CREATE INDEX IF NOT EXISTS/g) || [];
      
      expect(createIndexStatements.length).toBe(indexIfNotExistsStatements.length);
    });

    it('should have proper check constraint on enrichment_status', () => {
      const migrationPath = path.join(__dirname, '001_extend_recipes_table.sql');
      const content = fs.readFileSync(migrationPath, 'utf-8');

      expect(content).toContain("CHECK (enrichment_status IN ('pending', 'complete', 'partial', 'failed'))");
    });

    it('should have comments for documentation', () => {
      const migrationPath = path.join(__dirname, '001_extend_recipes_table.sql');
      const content = fs.readFileSync(migrationPath, 'utf-8');

      expect(content).toContain('COMMENT ON COLUMN recipes.source');
      expect(content).toContain('COMMENT ON COLUMN recipes.source_recipe_id');
      expect(content).toContain('COMMENT ON COLUMN recipes.enrichment_status');
      expect(content).toContain('COMMENT ON COLUMN recipes.unmatched_ingredients');
      expect(content).toContain('COMMENT ON COLUMN recipes.category');
      expect(content).toContain('COMMENT ON COLUMN recipes.cuisine');
    });
  });
});
