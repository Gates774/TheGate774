import { supabase } from "@/integrations/supabase/client";

interface SecureUploadResult {
  success: boolean;
  fileName?: string;
  signedUrl?: string;
  error?: string;
}

/**
 * Securely upload a file using server-side validation.
 * This function validates file type using magic bytes on the server
 * to prevent file type spoofing attacks.
 * 
 * @param file - The file to upload
 * @param bucket - The storage bucket ('complaint-evidence' or 'post-media')
 * @returns Promise with upload result
 */
export async function secureUpload(
  file: File,
  bucket: 'complaint-evidence' | 'post-media'
): Promise<SecureUploadResult> {
  try {
    // Get current session for auth
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.access_token) {
      return { success: false, error: 'Not authenticated' };
    }

    // Prepare form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    formData.append('type', file.type);

    // Call the secure upload edge function
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-upload`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: formData,
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        error: result.error || 'Upload failed' 
      };
    }

    return {
      success: true,
      fileName: result.fileName,
      signedUrl: result.signedUrl,
    };
  } catch (error) {
    console.error('Secure upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Client-side file validation helper.
 * This provides immediate feedback but server-side validation is the source of truth.
 */
export function validateFileClient(file: File): { valid: boolean; error?: string } {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
  const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

  const maxImageSize = 5 * 1024 * 1024; // 5MB
  const maxVideoSize = 50 * 1024 * 1024; // 50MB

  // Check type
  if (!allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: 'File type not allowed. Accepted: JPG, PNG, GIF, WebP, MP4, MOV, WebM' 
    };
  }

  // Check size
  const isImage = allowedImageTypes.includes(file.type);
  const maxSize = isImage ? maxImageSize : maxVideoSize;
  
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: isImage 
        ? 'Image must be smaller than 5MB' 
        : 'Video must be smaller than 50MB' 
    };
  }

  return { valid: true };
}
