-- Add SKU column to products table
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS sku TEXT;
