import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Magic bytes for file type verification
// These are the first bytes that identify file formats
const MAGIC_BYTES: Record<string, { signature: number[]; offset?: number }[]> = {
  // Images
  "image/jpeg": [{ signature: [0xFF, 0xD8, 0xFF] }],
  "image/png": [{ signature: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }],
  "image/gif": [
    { signature: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
    { signature: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
  ],
  "image/webp": [{ signature: [0x52, 0x49, 0x46, 0x46], offset: 0 }], // RIFF, need to also check WEBP at offset 8
  "image/bmp": [{ signature: [0x42, 0x4D] }],
  "image/heic": [{ signature: [0x00, 0x00, 0x00], offset: 0 }], // ftyp at offset 4
  "image/heif": [{ signature: [0x00, 0x00, 0x00], offset: 0 }],
  
  // Videos
  "video/mp4": [
    { signature: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70] }, // ftyp
    { signature: [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70] }, // ftyp
    { signature: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70] }, // ftyp
  ],
  "video/quicktime": [
    { signature: [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74] }, // ftypqt
  ],
  "video/webm": [{ signature: [0x1A, 0x45, 0xDF, 0xA3] }],
  "video/x-msvideo": [{ signature: [0x52, 0x49, 0x46, 0x46] }], // AVI is RIFF based
  "video/x-matroska": [{ signature: [0x1A, 0x45, 0xDF, 0xA3] }], // Same as webm (Matroska)
};

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

// Max file sizes (in bytes)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

// Allowed buckets
const ALLOWED_BUCKETS = ["complaint-evidence", "post-media"];

// File extension to MIME type mapping
const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  avi: "video/x-msvideo",
};

function verifyMagicBytes(bytes: Uint8Array, expectedType: string): boolean {
  const signatures = MAGIC_BYTES[expectedType];
  if (!signatures) {
    // For types without defined signatures, we do a basic check
    return false;
  }

  for (const sig of signatures) {
    const offset = sig.offset || 0;
    let matches = true;
    
    for (let i = 0; i < sig.signature.length; i++) {
      if (bytes[offset + i] !== sig.signature[i]) {
        matches = false;
        break;
      }
    }
    
    if (matches) {
      // Special handling for WEBP - need to check "WEBP" at offset 8
      if (expectedType === "image/webp") {
        const webpSignature = [0x57, 0x45, 0x42, 0x50]; // "WEBP"
        for (let i = 0; i < webpSignature.length; i++) {
          if (bytes[8 + i] !== webpSignature[i]) {
            return false;
          }
        }
      }
      return true;
    }
  }

  return false;
}

function detectFileType(bytes: Uint8Array): string | null {
  // Check all known types
  for (const [mimeType, signatures] of Object.entries(MAGIC_BYTES)) {
    if (verifyMagicBytes(bytes, mimeType)) {
      return mimeType;
    }
  }
  return null;
}

function getExtensionFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
    "video/x-msvideo": ".avi",
  };
  return map[mimeType] || ".bin";
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Get user from auth header
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

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bucket = formData.get("bucket") as string | null;
    const claimedType = formData.get("type") as string | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!bucket || !ALLOWED_BUCKETS.includes(bucket)) {
      return new Response(
        JSON.stringify({ error: "Invalid bucket", allowed: ALLOWED_BUCKETS }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file size
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;

    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ 
          error: "File too large", 
          max_size: maxSize,
          actual_size: file.size,
          message: isImage ? "Maximum image size is 5MB" : "Maximum video size is 50MB"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read file bytes for magic byte verification
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Verify file content matches claimed type
    const detectedType = detectFileType(bytes);
    
    if (!detectedType) {
      console.warn(`Unknown file type detected for file from user ${user.id}`);
      return new Response(
        JSON.stringify({ error: "Unknown or unsupported file type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ALLOWED_TYPES.includes(detectedType)) {
      console.warn(`Disallowed file type ${detectedType} from user ${user.id}`);
      return new Response(
        JSON.stringify({ 
          error: "File type not allowed", 
          detected: detectedType,
          allowed: ALLOWED_TYPES 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if claimed type matches detected type (warns about spoofing)
    if (claimedType && claimedType !== detectedType) {
      console.warn(`File type mismatch for user ${user.id}: claimed ${claimedType}, detected ${detectedType}`);
      // We use the detected type, not the claimed type
    }

    // Generate secure filename
    const extension = getExtensionFromMime(detectedType);
    const fileName = `${user.id}/${crypto.randomUUID()}${extension}`;

    // Upload to storage using service role
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { error: uploadError } = await serviceClient.storage
      .from(bucket)
      .upload(fileName, bytes, {
        contentType: detectedType,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate signed URL (24 hours)
    const { data: signedUrlData, error: signError } = await serviceClient.storage
      .from(bucket)
      .createSignedUrl(fileName, 86400);

    if (signError || !signedUrlData?.signedUrl) {
      console.error("Signed URL error:", signError);
      return new Response(
        JSON.stringify({ error: "Failed to generate access URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`File uploaded successfully: ${fileName} (${detectedType}) for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        fileName,
        signedUrl: signedUrlData.signedUrl,
        detectedType,
        size: file.size,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Validate upload error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...getCorsHeaders(null), "Content-Type": "application/json" } }
    );
  }
});
