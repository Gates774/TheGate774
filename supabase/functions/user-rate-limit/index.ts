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

// Allowed action types
const allowedActions = [
  "create_post",
  "create_comment",
  "create_complaint",
  "send_message",
  "create_reaction",
  "upload_media",
] as const;

const checkRateLimitSchema = z.object({
  action_type: z.enum(allowedActions),
});

const recordActionSchema = z.object({
  action_type: z.enum(allowedActions),
});

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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || body.action;

    if (action === "check") {
      const validation = checkRateLimitSchema.safeParse(body);
      if (!validation.success) {
        return new Response(
          JSON.stringify({ error: "Invalid action_type", allowed: allowedActions }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const actionType = validation.data.action_type;

      // Get rate limit config
      const { data: limitConfig } = await serviceClient
        .from("user_rate_limits")
        .select("*")
        .eq("action_type", actionType)
        .single();

      if (!limitConfig) {
        // No limit defined, allow
        return new Response(
          JSON.stringify({ allowed: true, reason: "no_limit_configured" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Count recent actions
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: hourlyActions } = await serviceClient
        .from("user_action_rates")
        .select("created_at")
        .eq("user_id", user.id)
        .eq("action_type", actionType)
        .gte("created_at", oneHourAgo);

      const { data: dailyActions } = await serviceClient
        .from("user_action_rates")
        .select("created_at")
        .eq("user_id", user.id)
        .eq("action_type", actionType)
        .gte("created_at", oneDayAgo);

      const hourlyCount = hourlyActions?.length || 0;
      const dailyCount = dailyActions?.length || 0;

      // Check cooldown
      if (limitConfig.cooldown_seconds > 0 && hourlyActions && hourlyActions.length > 0) {
        const lastAction = new Date(hourlyActions[hourlyActions.length - 1].created_at);
        const cooldownEnd = new Date(lastAction.getTime() + limitConfig.cooldown_seconds * 1000);
        
        if (new Date() < cooldownEnd) {
          const waitSeconds = Math.ceil((cooldownEnd.getTime() - Date.now()) / 1000);
          return new Response(
            JSON.stringify({
              allowed: false,
              reason: "cooldown",
              wait_seconds: waitSeconds,
              message: `Please wait ${waitSeconds} seconds before trying again`,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Check hourly limit
      if (hourlyCount >= limitConfig.max_per_hour) {
        return new Response(
          JSON.stringify({
            allowed: false,
            reason: "hourly_limit",
            current: hourlyCount,
            limit: limitConfig.max_per_hour,
            message: `Hourly limit reached (${limitConfig.max_per_hour}). Try again later.`,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check daily limit
      if (dailyCount >= limitConfig.max_per_day) {
        return new Response(
          JSON.stringify({
            allowed: false,
            reason: "daily_limit",
            current: dailyCount,
            limit: limitConfig.max_per_day,
            message: `Daily limit reached (${limitConfig.max_per_day}). Try again tomorrow.`,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          allowed: true,
          remaining_hourly: limitConfig.max_per_hour - hourlyCount,
          remaining_daily: limitConfig.max_per_day - dailyCount,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "record") {
      const validation = recordActionSchema.safeParse(body);
      if (!validation.success) {
        return new Response(
          JSON.stringify({ error: "Invalid action_type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Record the action
      await serviceClient.from("user_action_rates").insert({
        user_id: user.id,
        action_type: validation.data.action_type,
      });

      return new Response(
        JSON.stringify({ recorded: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'check' or 'record'" }),
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
