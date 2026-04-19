-- Clean up duplicate posts for the same recipe
-- Keeps only the oldest post for each recipe_id

-- Step 1: Delete duplicate posts, keeping only the first one created for each recipe
DELETE FROM posts
WHERE id IN (
  SELECT p.id
  FROM posts p
  INNER JOIN (
    SELECT recipe_id, MIN(created_at) as first_created
    FROM posts
    WHERE recipe_id IS NOT NULL
    GROUP BY recipe_id
    HAVING COUNT(*) > 1
  ) dups ON p.recipe_id = dups.recipe_id
  WHERE p.created_at > dups.first_created
);

-- Step 2: Show how many posts remain per recipe
SELECT 
  COUNT(DISTINCT recipe_id) as unique_recipes,
  COUNT(*) as total_posts
FROM posts
WHERE recipe_id IS NOT NULL;
