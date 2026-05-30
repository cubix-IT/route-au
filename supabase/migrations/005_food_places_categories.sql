-- Add Brewery and Distillery as distinct food_places categories
ALTER TABLE food_places DROP CONSTRAINT IF EXISTS food_places_category_check;
ALTER TABLE food_places ADD CONSTRAINT food_places_category_check
  CHECK (category IN ('Cafe','Pub','Restaurant','Winery','Brewery','Distillery','Bakery',
                      'Seafood','Bar','Deli','Other'));
