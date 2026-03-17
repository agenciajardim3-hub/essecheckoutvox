-- Add variations column to checkouts table
ALTER TABLE checkouts ADD COLUMN variations JSONB DEFAULT '[]'::jsonb;

-- Comment on column
COMMENT ON COLUMN checkouts.variations IS 'List of product variations (sub-checkouts) with specific pricing and slugs';
