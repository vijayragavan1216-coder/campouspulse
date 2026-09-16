export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export function validateTitle(title: unknown): ValidationResult {
  if (typeof title !== 'string') {
    return { valid: false, message: 'Title must be at least 5 characters.' };
  }
  const trimmed = title.trim();
  if (trimmed.length < 5) {
    return { valid: false, message: 'Title must be at least 5 characters.' };
  }
  if (trimmed.length > 180) {
    return { valid: false, message: 'Title cannot exceed 180 characters.' };
  }
  return { valid: true };
}

export function validateDescription(desc: unknown): ValidationResult {
  if (typeof desc !== 'string') {
    return { valid: false, message: 'Description must be at least 15 characters.' };
  }
  const trimmed = desc.trim();
  if (trimmed.length < 15) {
    return { valid: false, message: 'Description must be at least 15 characters.' };
  }
  if (trimmed.length > 5000) {
    return { valid: false, message: 'Description cannot exceed 5000 characters.' };
  }
  return { valid: true };
}

export function validateEmail(email: unknown): ValidationResult {
  if (typeof email !== 'string') {
    return { valid: false, message: 'Invalid email address.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, message: 'Invalid email address.' };
  }
  return { valid: true };
}

export function validatePassword(password: unknown): ValidationResult {
  if (typeof password !== 'string' || password.length < 8) {
    return { valid: false, message: 'Password does not meet the security requirements.' };
  }
  // At least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    return { valid: false, message: 'Password does not meet the security requirements.' };
  }
  return { valid: true };
}

export function validateCategory(category: unknown, validCategories: string[]): ValidationResult {
  if (typeof category !== 'string' || !category.trim()) {
    return { valid: false, message: 'Please select a valid category.' };
  }
  if (validCategories.length > 0 && !validCategories.includes(category.trim())) {
    return { valid: false, message: 'Please select a valid category.' };
  }
  return { valid: true };
}

export function validatePriority(priority: unknown): ValidationResult {
  const valid = ['Low', 'Medium', 'High', 'Emergency'];
  if (typeof priority !== 'string' || !valid.includes(priority.trim())) {
    return { valid: false, message: 'Please select a valid priority.' };
  }
  return { valid: true };
}

export function validateLocation(loc: unknown): ValidationResult {
  if (typeof loc !== 'string' || loc.trim().length < 2) {
    return { valid: false, message: 'Location must contain at least 2 characters.' };
  }
  return { valid: true };
}

export function validatePositiveId(id: unknown): number | null {
  const num = Number(id);
  if (Number.isInteger(num) && num > 0) {
    return num;
  }
  return null;
}
