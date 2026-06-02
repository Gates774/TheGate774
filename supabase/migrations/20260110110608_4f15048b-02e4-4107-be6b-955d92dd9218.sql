-- RLS Policies for login_attempts table
-- This table is used for rate limiting and should only be accessible by service role (edge functions)
-- Regular authenticated users should not be able to read or modify login attempt records

-- Policy: Allow service role to manage login attempts (via edge functions)
-- Note: Service role bypasses RLS, so we just need to block authenticated users

-- Policy: Prevent authenticated users from viewing login attempts
CREATE POLICY "Users cannot view login attempts"
ON public.login_attempts
FOR SELECT
TO authenticated
USING (false);

-- Policy: Prevent authenticated users from inserting login attempts
-- (Only edge functions with service role should insert)
CREATE POLICY "Users cannot insert login attempts"
ON public.login_attempts
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Policy: Prevent authenticated users from updating login attempts
CREATE POLICY "Users cannot update login attempts"
ON public.login_attempts
FOR UPDATE
TO authenticated
USING (false);

-- Policy: Prevent authenticated users from deleting login attempts
CREATE POLICY "Users cannot delete login attempts"
ON public.login_attempts
FOR DELETE
TO authenticated
USING (false);