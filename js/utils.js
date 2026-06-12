/**
 * Smart Clinic Management System
 * Shared Utilities Module
 */

export const Utils = {
  /**
   * Simple debouncing function for performance optimization
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Formats ISO Date string into local friendly format (e.g., "12 Oct 2026")
   */
  formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  },

  /**
   * Formats ISO Date-Time string into friendly format
   */
  formatDateTime(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + 
             ' ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dateStr;
    }
  },

  /**
   * Generates a unique, structured appointment ID: APT-YYYYMMDD-HHMMSS-XXXX
   */
  generateAppointmentId() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    
    const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    
    return `APT-${yyyy}${mm}${dd}-${hh}${min}${ss}-${random}`;
  },

  /**
   * Hashes a string using SHA-256 for secure local storage of credentials
   */
  async hashPassword(password) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
};
