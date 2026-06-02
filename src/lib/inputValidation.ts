import { z } from 'zod';

// =====================================================
// Common Validation Schemas
// =====================================================

// String validators with common constraints
export const safeString = (maxLength: number = 255) =>
  z.string()
    .trim()
    .max(maxLength, `Must be ${maxLength} characters or less`);

export const safeText = (maxLength: number = 2000) =>
  z.string()
    .trim()
    .max(maxLength, `Must be ${maxLength} characters or less`);

// Check for malicious patterns (used separately)
export const isSafeContent = (val: string) => !/<script|javascript:|data:/i.test(val);

// Email validation
export const emailSchema = z
  .string()
  .trim()
  .email('Please enter a valid email address')
  .max(255, 'Email is too long')
  .toLowerCase();

// Phone validation (Nigerian format)
export const phoneSchema = z
  .string()
  .trim()
  .regex(
    /^(\+234|0)[789][01]\d{8}$/,
    'Please enter a valid Nigerian phone number'
  )
  .optional()
  .or(z.literal(''));

// URL validation
export const urlSchema = z
  .string()
  .trim()
  .url('Please enter a valid URL')
  .max(2048, 'URL is too long')
  .refine(
    (val) => val.startsWith('https://') || val.startsWith('http://'),
    'URL must start with http:// or https://'
  );

// =====================================================
// Form Schemas
// =====================================================

// Post creation schema
export const createPostSchema = z.object({
  content: safeText(5000).min(1, 'Post content is required'),
  title: safeString(200).optional(),
  tags: z.array(safeString(50)).max(5, 'Maximum 5 tags allowed').optional(),
  postType: z.enum(['text', 'image', 'video', 'blog', 'announcement']).default('text'),
});

// Comment schema
export const createCommentSchema = z.object({
  content: safeText(2000).min(1, 'Comment is required'),
  parentId: z.string().uuid().optional(),
});

// Complaint schema
export const createComplaintSchema = z.object({
  title: safeString(100).min(5, 'Title must be at least 5 characters'),
  description: safeText(5000).min(20, 'Description must be at least 20 characters'),
  category: safeString(100).min(1, 'Please select a category'),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  location_address: safeString(500).optional(),
});

// Chat message schema
export const sendMessageSchema = z.object({
  content: safeText(4000).min(1, 'Message cannot be empty'),
  messageType: z.enum(['text', 'image', 'video', 'voice']).default('text'),
});

// Profile update schema
export const updateProfileSchema = z.object({
  display_name: safeString(100).min(2, 'Name must be at least 2 characters').optional(),
  bio: safeText(500).optional(),
  phone: phoneSchema,
  is_contact_visible: z.boolean().optional(),
});

// Discussion schema
export const createDiscussionSchema = z.object({
  title: safeString(200).min(5, 'Title must be at least 5 characters'),
  content: safeText(10000).min(20, 'Content must be at least 20 characters'),
});

// =====================================================
// Sanitization Helpers
// =====================================================

// Remove potential XSS patterns from text
export function sanitizeText(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:/gi, '')
    .trim();
}

// Sanitize for use in URLs
export function sanitizeForUrl(input: string): string {
  return encodeURIComponent(input.trim());
}

// Validate and sanitize file name
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}

// =====================================================
// Validation Helpers
// =====================================================

// Type-safe validation with error messages
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.errors.map((err) => err.message);
  return { success: false, errors };
}

// Check if a string contains potentially malicious content
export function containsMaliciousContent(input: string): boolean {
  const patterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:text\/html/i,
    /data:application/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /expression\s*\(/i,
    /url\s*\(/i,
  ];
  
  return patterns.some((pattern) => pattern.test(input));
}

// Validate file type for uploads
export function validateFileType(
  file: File,
  allowedTypes: string[]
): boolean {
  return allowedTypes.includes(file.type);
}

// Validate file size (in bytes)
export function validateFileSize(file: File, maxSizeBytes: number): boolean {
  return file.size <= maxSizeBytes;
}

// Image file validation
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
];

export function validateImageFile(
  file: File,
  maxSizeMB: number = 5
): { valid: boolean; error?: string } {
  if (!validateFileType(file, ALLOWED_IMAGE_TYPES)) {
    return { valid: false, error: 'Invalid image type. Allowed: JPEG, PNG, WebP, GIF' };
  }
  
  if (!validateFileSize(file, maxSizeMB * 1024 * 1024)) {
    return { valid: false, error: `Image must be smaller than ${maxSizeMB}MB` };
  }
  
  return { valid: true };
}

export function validateVideoFile(
  file: File,
  maxSizeMB: number = 50
): { valid: boolean; error?: string } {
  if (!validateFileType(file, ALLOWED_VIDEO_TYPES)) {
    return { valid: false, error: 'Invalid video type. Allowed: MP4, QuickTime, WebM' };
  }
  
  if (!validateFileSize(file, maxSizeMB * 1024 * 1024)) {
    return { valid: false, error: `Video must be smaller than ${maxSizeMB}MB` };
  }
  
  return { valid: true };
}