-- Disable Row-Level Security on recipes table
-- This allows the pipeline to insert recipes without policy restrictions

ALTER TABLE recipes DISABLE ROW LEVEL SECURITY;
