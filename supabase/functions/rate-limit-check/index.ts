import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Get allowed origins from environment or use defaults
const ALLOWED_ORIGINS = [
  Deno.env.get("ALLOWED_ORIGIN") || "",
  "https://lovable.dev",
  "https://www.lovable.dev",
].filter(Boolean);

// Add localhost for development
if (Deno.env.get("ENVIRONMENT") !== "production") {
  ALLOWED_ORIGINS.push("http://localhost:5173", "http://localhost:3000");
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) 
    ? origin 
    : ALLOWED_ORIGINS[0] || "*";
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

// Input validation schema with strict limits
const RateLimitRequestSchema = z.object({
  email: z.string()
    .email("Invalid email format")
    .max(255, "Email too long")
    .transform(val => val.toLowerCase().trim()),
  action: z.enum(["check", "record_attempt", "record_success"], {
    errorMap: () => ({ message: "Invalid action type" })
  })
});

interface RateLimitResponse {
  allowed: boolean;
  remaining_attempts: number;
  lockout_until?: string;
  message?: string;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MINUTES = 15;
const ATTEMPT_WINDOW_MINUTES = 15;

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role to bypass RLS for login_attempts table
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client IP from headers
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || req.headers.get("x-real-ip") 
      || "unknown";

    // Parse and validate request body with zod
    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parseResult = RateLimitRequestSchema.safeParse(requestBody);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid input", 
          details: parseResult.error.issues.map(i => i.message) 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email: normalizedEmail, action } = parseResult.data;
    const windowStart = new Date(Date.now() - ATTEMPT_WINDOW_MINUTES * 60 * 1000).toISOString();

    if (action === "check") {
      // Count failed attempts in the window
      const { count, error } = await supabase
        .from("login_attempts")
        .select("*", { count: "exact", head: true })
        .eq("email", normalizedEmail)
        .eq("success", false)
        .gte("attempted_at", windowStart);

      if (error) {
        console.error("Error checking attempts:", error);
        // Fail open - allow the attempt but log the error
        return new Response(
          JSON.stringify({ allowed: true, remaining_attempts: MAX_ATTEMPTS }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const failedAttempts = count || 0;
      const allowed = failedAttempts < MAX_ATTEMPTS;
      const remainingAttempts = Math.max(0, MAX_ATTEMPTS - failedAttempts);

      const response: RateLimitResponse = {
        allowed,
        remaining_attempts: remainingAttempts,
      };

      if (!allowed) {
        // Calculate lockout end time
        const lockoutUntil = new Date(Date.now() + LOCKOUT_WINDOW_MINUTES * 60 * 1000);
        response.lockout_until = lockoutUntil.toISOString();
        response.message = `Too many failed attempts. Try again after ${LOCKOUT_WINDOW_MINUTES} minutes.`;
      }

      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "record_attempt") {
      // Record a failed login attempt
      const { error } = await supabase
        .from("login_attempts")
        .insert({
          ip_address: clientIP,
          email: normalizedEmail,
          success: false,
        });

      if (error) {
        console.error("Error recording attempt:", error);
      }

      return new Response(
        JSON.stringify({ recorded: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "record_success") {
      // Record successful login and clear failed attempts for this email
      const { error: insertError } = await supabase
        .from("login_attempts")
        .insert({
          ip_address: clientIP,
          email: normalizedEmail,
          success: true,
        });

      if (insertError) {
        console.error("Error recording success:", insertError);
      }

      // Optionally clear old failed attempts on successful login
      await supabase
        .from("login_attempts")
        .delete()
        .eq("email", normalizedEmail)
        .eq("success", false)
        .lt("attempted_at", windowStart);

      return new Response(
        JSON.stringify({ recorded: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Rate limit check error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...getCorsHeaders(null), "Content-Type": "application/json" } }
    );
  }
});
