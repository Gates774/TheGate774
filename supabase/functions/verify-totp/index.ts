import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Get allowed origins from environment or use defaults
const ALLOWED_ORIGINS = [
  Deno.env.get("ALLOWED_ORIGIN") || "",
  "https://lovable.dev",
  "https://www.lovable.dev",
  "https://gate744platform.lovable.app",
].filter(Boolean);

// Add localhost for development
if (Deno.env.get("ENVIRONMENT") !== "production") {
  ALLOWED_ORIGINS.push("http://localhost:5173", "http://localhost:3000");
}

// Add preview URLs pattern for Lovable
const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow Lovable preview URLs
  if (origin.match(/^https:\/\/[a-z0-9-]+-preview--[a-z0-9-]+\.lovable\.app$/)) return true;
  if (origin.match(/^https:\/\/[a-z0-9]+\.lovable\.app$/)) return true;
  return false;
};

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : ALLOWED_ORIGINS[0] || "";
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

// Input validation schemas
const verifyTotpSchema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/, "Code must be 6 digits"),
  action: z.enum(["verify", "enable", "disable"]),
});

const verifyRecoverySchema = z.object({
  code: z.string().min(8).max(12),
});

// RFC 6238 compliant TOTP implementation using Web Crypto API
async function generateTOTP(
  secret: string,
  timeStep: number = 30,
  windowOffset: number = 0
): Promise<string> {
  const time = Math.floor(Date.now() / 1000 / timeStep) + windowOffset;
  const timeBuffer = new ArrayBuffer(8);
  const timeView = new DataView(timeBuffer);
  timeView.setBigUint64(0, BigInt(time), false);

  // Convert hex secret to bytes
  const secretBytes = new Uint8Array(
    secret.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );

  // Use Web Crypto API for HMAC-SHA1
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new Uint8Array(timeBuffer)
  );

  const hmac = new Uint8Array(signature);
  
  // Dynamic truncation per RFC 4226
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1000000;

  return code.toString().padStart(6, "0");
}

// Verify TOTP with window tolerance for clock skew
async function verifyTOTP(
  secret: string,
  code: string,
  window: number = 1
): Promise<boolean> {
  // Check current time and ±window for clock skew tolerance
  for (let i = -window; i <= window; i++) {
    const expectedCode = await generateTOTP(secret, 30, i);
    if (expectedCode === code) {
      return true;
    }
  }
  return false;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

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
    
    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const userClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || body.action;

    if (action === "verify" || action === "enable" || action === "disable") {
      // Validate input
      const validation = verifyTotpSchema.safeParse({ ...body, action });
      if (!validation.success) {
        return new Response(
          JSON.stringify({ error: "Invalid input", details: validation.error.errors }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user's 2FA secret from database (server-side only)
      const { data: twoFaData, error: twoFaError } = await supabaseClient
        .from("admin_2fa")
        .select("totp_secret, is_enabled")
        .eq("user_id", user.id)
        .single();

      if (twoFaError || !twoFaData) {
        return new Response(
          JSON.stringify({ error: "2FA not configured" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify the TOTP code using RFC 6238 compliant implementation
      const isValid = await verifyTOTP(twoFaData.totp_secret, validation.data.code);

      if (!isValid) {
        return new Response(
          JSON.stringify({ valid: false, error: "Invalid code" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Handle action
      if (action === "enable") {
        await supabaseClient
          .from("admin_2fa")
          .update({ is_enabled: true, verified_at: new Date().toISOString() })
          .eq("user_id", user.id);

        // Log the action
        await supabaseClient.from("audit_logs").insert({
          user_id: user.id,
          action: "2fa_enabled",
          resource_type: "admin_security",
          metadata: { method: "totp" },
        });
      } else if (action === "disable") {
        await supabaseClient
          .from("admin_2fa")
          .update({ is_enabled: false })
          .eq("user_id", user.id);

        await supabaseClient.from("audit_logs").insert({
          user_id: user.id,
          action: "2fa_disabled",
          resource_type: "admin_security",
        });
      }

      return new Response(
        JSON.stringify({ valid: true, action }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify-recovery") {
      const validation = verifyRecoverySchema.safeParse(body);
      if (!validation.success) {
        return new Response(
          JSON.stringify({ error: "Invalid input" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: twoFaData, error: twoFaError } = await supabaseClient
        .from("admin_2fa")
        .select("id, recovery_codes, used_recovery_codes")
        .eq("user_id", user.id)
        .single();

      if (twoFaError || !twoFaData) {
        return new Response(
          JSON.stringify({ valid: false, error: "2FA not configured" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const normalizedCode = validation.data.code.toUpperCase().replace(/[\s-]/g, "");
      const recoveryCodes = (twoFaData.recovery_codes as string[]) || [];
      const usedCodes = (twoFaData.used_recovery_codes as string[]) || [];

      // Check if code exists and hasn't been used
      const formattedCode = `${normalizedCode.slice(0, 4)}-${normalizedCode.slice(4, 8)}`;
      
      if (!recoveryCodes.includes(formattedCode) || usedCodes.includes(formattedCode)) {
        return new Response(
          JSON.stringify({ valid: false, error: "Invalid or used recovery code" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark code as used
      await supabaseClient
        .from("admin_2fa")
        .update({ used_recovery_codes: [...usedCodes, formattedCode] })
        .eq("id", twoFaData.id);

      await supabaseClient.from("audit_logs").insert({
        user_id: user.id,
        action: "recovery_code_used",
        resource_type: "admin_security",
      });

      return new Response(
        JSON.stringify({ valid: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...getCorsHeaders(null), "Content-Type": "application/json" } }
    );
  }
});
