-- Review duplicate Diesel/Petrol products and their inventory arrivals first.
-- The products schema has no active/status column; each existing row is treated
-- as an active candidate. The oldest row (created_at, then id) is retained.

WITH ranked_products AS (
  SELECT
    id,
    name,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY name
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS product_rank
  FROM public.products
  WHERE name IN ('Diesel', 'Petrol')
)
SELECT
  name,
  id,
  created_at,
  product_rank,
  product_rank = 1 AS will_be_kept
FROM ranked_products
ORDER BY name, product_rank;

WITH ranked_products AS (
  SELECT
    id,
    name,
    ROW_NUMBER() OVER (
      PARTITION BY name
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS product_rank
  FROM public.products
  WHERE name IN ('Diesel', 'Petrol')
)
SELECT
  arrival.id AS inventory_arrival_id,
  arrival.product_id,
  ranked_products.name AS product_name,
  arrival.created_at,
  arrival.billed_liters,
  arrival.actual_received_liters
FROM public.inventory_arrivals AS arrival
JOIN ranked_products ON ranked_products.id = arrival.product_id
WHERE ranked_products.product_rank > 1
ORDER BY arrival.created_at;

DO $$
DECLARE
  duplicate_product RECORD;
  confirmed_test_arrival_deletions UUID[] := ARRAY[]::UUID[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Diesel')
     OR NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Petrol') THEN
    RAISE EXCEPTION 'Cleanup cancelled: both Diesel and Petrol products must exist';
  END IF;

  -- Only add IDs after confirming those arrival rows are disposable test data.
  -- Example: ARRAY['00000000-0000-0000-0000-000000000000']::UUID[];
  FOR duplicate_product IN
    WITH ranked_products AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY name
          ORDER BY created_at ASC NULLS LAST, id ASC
        ) AS product_rank,
        FIRST_VALUE(id) OVER (
          PARTITION BY name
          ORDER BY created_at ASC NULLS LAST, id ASC
        ) AS keeper_id
      FROM public.products
      WHERE name IN ('Diesel', 'Petrol')
    )
    SELECT id AS duplicate_id, keeper_id
    FROM ranked_products
    WHERE product_rank > 1
  LOOP
    -- Preserve all non-test references by reassigning them to the retained product.
    DELETE FROM public.inventory_arrivals AS arrival
    WHERE arrival.id = ANY (confirmed_test_arrival_deletions)
      AND arrival.product_id = duplicate_product.duplicate_id;

    UPDATE public.transactions AS child
    SET product_id = duplicate_product.keeper_id
    WHERE child.product_id = duplicate_product.duplicate_id;

    UPDATE public.shifts AS child
    SET product_id = duplicate_product.keeper_id
    WHERE child.product_id = duplicate_product.duplicate_id;

    UPDATE public.fuel_tanks AS child
    SET product_id = duplicate_product.keeper_id
    WHERE child.product_id = duplicate_product.duplicate_id;

    UPDATE public.inventory_arrivals AS child
    SET product_id = duplicate_product.keeper_id
    WHERE child.product_id = duplicate_product.duplicate_id;

    DELETE FROM public.products AS product
    WHERE product.id = duplicate_product.duplicate_id;
  END LOOP;

  IF (SELECT COUNT(*) FROM public.products WHERE name = 'Diesel') <> 1
     OR (SELECT COUNT(*) FROM public.products WHERE name = 'Petrol') <> 1 THEN
    RAISE EXCEPTION 'Cleanup cancelled: expected exactly one Diesel and one Petrol product';
  END IF;
END;
$$;

SELECT name, COUNT(*) AS remaining_products
FROM public.products
WHERE name IN ('Diesel', 'Petrol')
GROUP BY name
ORDER BY name;
