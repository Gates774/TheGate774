export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
}

export interface PasswordRequirement {
  label: string;
  met: boolean;
}

export const PASSWORD_MIN_LENGTH = 12;

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  
  // Check minimum length
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
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
  
  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Calculate strength
  let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
  const passedChecks = 5 - errors.length;
  
  if (passedChecks >= 5 && password.length >= 16) {
    strength = 'strong';
  } else if (passedChecks >= 4) {
    strength = 'good';
  } else if (passedChecks >= 2) {
    strength = 'fair';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      label: `At least ${PASSWORD_MIN_LENGTH} characters`,
      met: password.length >= PASSWORD_MIN_LENGTH,
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
  ];
}

export function getStrengthColor(strength: PasswordValidationResult['strength']): string {
  switch (strength) {
    case 'strong':
      return 'bg-success';
    case 'good':
      return 'bg-primary';
    case 'fair':
      return 'bg-warning';
    case 'weak':
    default:
      return 'bg-destructive';
  }
}

export function getStrengthWidth(strength: PasswordValidationResult['strength']): string {
  switch (strength) {
    case 'strong':
      return 'w-full';
    case 'good':
      return 'w-3/4';
    case 'fair':
      return 'w-1/2';
    case 'weak':
    default:
      return 'w-1/4';
  }
}
