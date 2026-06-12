/**
 * Smart Clinic Management System
 * Input & Schedule Validation Module
 */

export const Validation = {
  /**
   * Validate Name (letters and spaces only)
   */
  validateName(name) {
    return name.trim().length >= 2 && /^[a-zA-Z\s]+$/.test(name.trim());
  },

  /**
   * Validate Phone Number (10 digits)
   */
  validatePhone(phone) {
    return /^\d{10}$/.test(phone.trim());
  },

  /**
   * Validate Email Address
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  },

  /**
   * Validate Age (integer between 1 and 120)
   */
  validateAge(age) {
    const num = parseInt(age, 10);
    return !isNaN(num) && num >= 1 && num <= 120;
  },

  /**
   * Validate Date (must be today or in the future)
   */
  validateDate(dateStr) {
    if (!dateStr) return false;
    const selectedDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  }
};
