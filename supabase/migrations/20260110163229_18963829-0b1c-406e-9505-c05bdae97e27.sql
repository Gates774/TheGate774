-- Fix: admin_2fa RLS policy allows reading TOTP secrets directly
-- Solution: Replace permissive SELECT policy with one that blocks direct table access
-- Use the existing get_admin_2fa_status() RPC function instead for status queries

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Admins can check 2FA status only" ON admin_2fa;

-- Create restrictive policy that blocks all direct SELECT access
-- All 2FA operations should go through the secure RPC functions:
-- - get_admin_2fa_status() for status
-- - verify_admin_totp() for verification  
-- - verify_admin_recovery_code() for recovery code verification
CREATE POLICY "Block direct SELECT on 2FA secrets"
ON admin_2fa FOR SELECT
USING (false);

-- Keep the INSERT/UPDATE policies for 2FA setup (through RPC functions)
-- These are already properly secured via RPC functions that check auth.uid()