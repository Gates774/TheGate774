-- Add lga_origin and lga_residence columns to profiles table
-- This replaces the existing single lga field with dual LGA tracking

-- Add new columns for LGA of Origin and LGA of Residence
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS state_origin text,
ADD COLUMN IF NOT EXISTS lga_origin text,
ADD COLUMN IF NOT EXISTS state_residence text,
ADD COLUMN IF NOT EXISTS lga_residence text;

-- Copy existing data to new columns (residence) for backward compatibility
UPDATE public.profiles 
SET state_residence = state, lga_residence = lga
WHERE state IS NOT NULL AND lga IS NOT NULL;