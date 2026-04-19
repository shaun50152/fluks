-- Fix Row-Level Security for Recipe Pipeline
-- This allows the service role (used by the pipeline) to insert/update recipes

-- Option 1: Add a policy for service role to bypass RLS
CREATE POLICY "Allow service role full access to recipes"
ON recipes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Option 2 (Alternative): Temporarily disable RLS on recipes table
-- Uncomment the line below if you prefer to disable RLS entirely
-- ALTER TABLE recipes DISABLE ROW LEVEL SECURITY;
