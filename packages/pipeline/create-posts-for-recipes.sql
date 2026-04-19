-- Create posts for all pipeline-ingested recipes
-- This makes them visible in the Discover feed

-- Step 1: Create a system user for pipeline recipes if it doesn't exist
-- You'll need to replace 'YOUR_SYSTEM_USER_ID' with an actual user UUID from your auth.users table
-- Or create a dedicated system user first

-- Step 2: Insert posts for recipes that don't have posts yet
-- IMPORTANT: Replace '00000000-0000-0000-0000-000000000000' with a real user UUID from auth.users
INSERT INTO posts (
  id,
  author_id,
  post_type,
  caption,
  media_url,
  recipe_id,
  like_count,
  view_count,
  share_count,
  created_at
)
SELECT 
  gen_random_uuid() as id,
  (SELECT id FROM auth.users LIMIT 1) as author_id,  -- Use first available user as author
  'recipe_share' as post_type,
  COALESCE(description, title) as caption,
  media_url,
  id as recipe_id,
  0 as like_count,
  0 as view_count,
  0 as share_count,
  created_at
FROM recipes
WHERE source = 'themealdb'  -- Only pipeline recipes
  AND id NOT IN (SELECT recipe_id FROM posts WHERE recipe_id IS NOT NULL);  -- Skip if post already exists

-- Show how many posts were created
SELECT COUNT(*) as posts_created 
FROM posts 
WHERE recipe_id IN (
  SELECT id FROM recipes WHERE source = 'themealdb'
);
