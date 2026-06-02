// Admin-specific password validation (stricter than users)
export interface AdminPasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
}

export interface AdminPasswordRequirement {
  label: string;
  met: boolean;
}

// Admin passwords require 14 characters minimum (vs 12 for users)
export const ADMIN_PASSWORD_MIN_LENGTH = 14;

export function validateAdminPassword(password: string): AdminPasswordValidationResult {
  const errors: string[] = [];
  
  // Check minimum length (stricter for admin)
  if (password.length < ADMIN_PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${ADMIN_PASSWORD_MIN_LENGTH} characters`);
  }
  
  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // Check for number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Check for special character (mandatory for admin)
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Admin-specific: Check for common patterns
  const commonPatterns = ['password', 'admin', '123456', 'qwerty', 'gate774'];
  for (const pattern of commonPatterns) {
    if (password.toLowerCase().includes(pattern)) {
      errors.push('Password cannot contain common patterns');
      break;
    }
  }

  // Calculate strength
  let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
  const passedChecks = 6 - errors.length;
  
  if (passedChecks >= 6 && password.length >= 18) {
    strength = 'strong';
  } else if (passedChecks >= 5 && password.length >= 16) {
    strength = 'good';
  } else if (passedChecks >= 3) {
    strength = 'fair';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}

export function getAdminPasswordRequirements(password: string): AdminPasswordRequirement[] {
  return [
    {
      label: `At least ${ADMIN_PASSWORD_MIN_LENGTH} characters`,
      met: password.length >= ADMIN_PASSWORD_MIN_LENGTH,
    },
    {
      label: 'One uppercase letter (A-Z)',
      met: /[A-Z]/.test(password),
    },
    {
      label: 'One lowercase letter (a-z)',
      met: /[a-z]/.test(password),
    },
    {
      label: 'One number (0-9)',
      met: /[0-9]/.test(password),
    },
    {
      label: 'One special character (!@#$%^&*...)',
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    },
    {
      label: 'No common patterns (admin, password, etc.)',
      met: !['password', 'admin', '123456', 'qwerty', 'gate774'].some(
        p => password.toLowerCase().includes(p)
      ),
    },
  ];
}
