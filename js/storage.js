/**
 * Smart Clinic Management System
 * LocalStorage Data Management Module
 */

// Default admin password (hashed): SHA-256 of "admin123"
const DEFAULT_ADMIN_HASH = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9";
const LOCKOUT_LIMIT = 5; // 5 failed attempts
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export const Storage = {
  /**
   * Appointments LocalStorage CRUD
   */
  getAppointments() {
    return JSON.parse(localStorage.getItem('clinic_appointments')) || [];
  },

  saveAppointments(appointments) {
    localStorage.setItem('clinic_appointments', JSON.stringify(appointments));
  },

  /**
   * Patients LocalStorage CRUD
   */
  getPatients() {
    return JSON.parse(localStorage.getItem('clinic_patients')) || [];
  },

  savePatients(patients) {
    localStorage.setItem('clinic_patients', JSON.stringify(patients));
  },

  /**
   * Check if a slot is already booked for a specific doctor, date, and time
   */
  isSlotOccupied(doctor, date, time, excludeAptId = null) {
    const appointments = this.getAppointments();
    return appointments.some(apt => 
      apt.doctor === doctor &&
      apt.date === date &&
      apt.time === time &&
      apt.status !== 'Cancelled' &&
      apt.id !== excludeAptId
    );
  },

  /**
   * Fetch all slots booked for a doctor on a specific date
   */
  getBookedSlots(doctor, date) {
    const appointments = this.getAppointments();
    return appointments
      .filter(apt => apt.doctor === doctor && apt.date === date && apt.status !== 'Cancelled')
      .map(apt => apt.time);
  },

  /**
   * Admin Security - Lockout & Bruteforce Protection
   */
  initAdminPassword() {
    const currentHash = localStorage.getItem('clinic_admin_hash');
    if (!currentHash || currentHash === "240751fb42807e15e8da9282367d64380b06b0d9c4c2ee5d9b5443fa7a4b0870") {
      localStorage.setItem('clinic_admin_hash', DEFAULT_ADMIN_HASH);
    }
  },

  getAdminHash() {
    this.initAdminPassword();
    return localStorage.getItem('clinic_admin_hash');
  },

  updateAdminPassword(newHash) {
    localStorage.setItem('clinic_admin_hash', newHash);
  },

  getLoginAttempts() {
    const attempts = JSON.parse(localStorage.getItem('clinic_login_attempts')) || { count: 0, lockoutUntil: 0 };
    return attempts;
  },

  recordFailedLogin() {
    const attempts = this.getLoginAttempts();
    attempts.count += 1;
    if (attempts.count >= LOCKOUT_LIMIT) {
      attempts.lockoutUntil = Date.now() + LOCKOUT_DURATION;
    }
    localStorage.setItem('clinic_login_attempts', JSON.stringify(attempts));
  },

  resetLoginAttempts() {
    localStorage.setItem('clinic_login_attempts', JSON.stringify({ count: 0, lockoutUntil: 0 }));
  },

  isLockedOut() {
    const attempts = this.getLoginAttempts();
    if (attempts.lockoutUntil && Date.now() < attempts.lockoutUntil) {
      return true;
    }
    // Auto reset if lockout duration has passed
    if (attempts.lockoutUntil && Date.now() >= attempts.lockoutUntil) {
      this.resetLoginAttempts();
    }
    return false;
  },

  getLockoutRemainingTime() {
    const attempts = this.getLoginAttempts();
    if (!attempts.lockoutUntil) return 0;
    const remaining = attempts.lockoutUntil - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  },

  /**
   * CSV & Backup Actions
   */
  exportToCSV(data, headers, filename) {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += headers.join(",") + "\n";

    data.forEach(row => {
      const csvRow = headers.map(header => {
        let val = row[header.toLowerCase()] || row[header] || '';
        // Escape quotes
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      });
      csvContent += csvRow.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  backupDatabase() {
    const backupData = {
      appointments: this.getAppointments(),
      patients: this.getPatients(),
      adminHash: this.getAdminHash(),
      timestamp: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `smart_clinic_backup_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  restoreDatabase(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.appointments && data.patients) {
        localStorage.setItem('clinic_appointments', JSON.stringify(data.appointments));
        localStorage.setItem('clinic_patients', JSON.stringify(data.patients));
        if (data.adminHash) {
          localStorage.setItem('clinic_admin_hash', data.adminHash);
        }
        return { success: true, message: "Database restored successfully!" };
      } else {
        return { success: false, message: "Invalid backup format: missing fields." };
      }
    } catch (e) {
      return { success: false, message: "Restore failed: Invalid JSON file." };
    }
  }
};
