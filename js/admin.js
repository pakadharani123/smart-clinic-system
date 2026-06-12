/**
 * Smart Clinic Management System
 * Admin Dashboard Module
 */

import { Utils } from './utils.js';
import { Storage } from './storage.js';
import { UI } from './ui.js';

let selectedApts = [];
let currentPage = 1;
const rowsPerPage = 10;

// Session activity monitor variables
let lastActivityTime = Date.now();
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in ms

document.addEventListener('DOMContentLoaded', () => {
  // Setup login credentials hash placeholder if needed
  Storage.initAdminPassword();

  // Simple auth gate checking
  const authOverlay = document.getElementById('authOverlay');
  const authForm = document.getElementById('adminAuthForm');
  
  if (sessionStorage.getItem('adminLoggedIn') === 'true') {
    authOverlay.style.display = 'none';
    initAdminData();
    startActivityMonitor();
  } else {
    authOverlay.style.display = 'flex';
    checkLockoutState();
  }

  if (authForm) {
    authForm.addEventListener('submit', handleLogin);
  }

  // Bind dashboard filter listeners
  setupFilters();

  // Patient Records form submit
  const patientForm = document.getElementById('patientForm');
  if (patientForm) {
    patientForm.addEventListener('submit', (e) => {
      e.preventDefault();
      savePatientRecord();
    });
  }

  // Bind Bulk Actions & Backup utilities
  initBulkAndBackupHandlers();
});

/**
 * Admin Security - Authentication with failed attempts lockout
 */
async function handleLogin(e) {
  e.preventDefault();
  
  if (Storage.isLockedOut()) {
    checkLockoutState();
    return;
  }

  const pwdInput = document.getElementById('adminPassword');
  const errorMsg = document.getElementById('authError');
  const hashedInput = await Utils.hashPassword(pwdInput.value);
  const correctHash = Storage.getAdminHash();

  if (hashedInput === correctHash) {
    sessionStorage.setItem('adminLoggedIn', 'true');
    Storage.resetLoginAttempts();
    document.getElementById('authOverlay').style.display = 'none';
    initAdminData();
    startActivityMonitor();
  } else {
    Storage.recordFailedLogin();
    pwdInput.classList.add('invalid');
    
    if (Storage.isLockedOut()) {
      checkLockoutState();
    } else {
      const attempts = Storage.getLoginAttempts();
      errorMsg.textContent = `Incorrect password. Attempt ${attempts.count}/5.`;
      errorMsg.style.display = 'block';
    }
  }
}

function checkLockoutState() {
  const errorMsg = document.getElementById('authError');
  const submitBtn = document.querySelector('#adminAuthForm button[type="submit"]');
  const pwdInput = document.getElementById('adminPassword');

  if (Storage.isLockedOut()) {
    pwdInput.disabled = true;
    submitBtn.disabled = true;
    
    const countdown = setInterval(() => {
      const remaining = Storage.getLockoutRemainingTime();
      if (remaining <= 0) {
        clearInterval(countdown);
        pwdInput.disabled = false;
        submitBtn.disabled = false;
        pwdInput.classList.remove('invalid');
        errorMsg.style.display = 'none';
      } else {
        errorMsg.textContent = `Bruteforce detected. Locked out for ${remaining}s.`;
        errorMsg.style.display = 'block';
      }
    }, 1000);
  }
}

/**
 * Inactivity Session Auto Logout
 */
function startActivityMonitor() {
  lastActivityTime = Date.now();
  
  const resetActivity = () => {
    lastActivityTime = Date.now();
  };
  
  document.addEventListener('mousemove', resetActivity);
  document.addEventListener('keypress', resetActivity);
  document.addEventListener('click', resetActivity);

  // Check activity every 30 seconds
  setInterval(() => {
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
      const elapsed = Date.now() - lastActivityTime;
      if (elapsed >= INACTIVITY_TIMEOUT) {
        UI.showToast('Logged out due to inactivity.', 'error');
        setTimeout(() => logout(), 1500);
      }
    }
  }, 30000);
}

window.logout = function() {
  sessionStorage.removeItem('adminLoggedIn');
  window.location.reload();
};

window.switchTab = function(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  if (event) event.target.classList.add('active');
  
  document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
  document.getElementById('tab-' + tabName).classList.add('active');
};

/**
 * Dashboard Setup
 */
window.initAdminData = function(showToastMsg = false) {
  updateStats();
  renderAppointmentsTable();
  renderPatientsTable();
  drawTrendsChart();
  drawServiceChart();
  drawUtilizationChart();
  
  if (showToastMsg) {
    UI.showToast('Data refreshed successfully', 'success');
  }
};

function updateStats() {
  const appointments = Storage.getAppointments();
  const patients = Storage.getPatients();
  
  const today = new Date().toISOString().split('T')[0];
  const todayApts = appointments.filter(a => a.date === today).length;
  const pendingApts = appointments.filter(a => a.status === 'Pending').length;
  
  document.getElementById('statTotalAppointments').innerText = appointments.length;
  document.getElementById('statTotalPatients').innerText = patients.length;
  document.getElementById('statToday').innerText = todayApts;
  document.getElementById('statCancelled').innerText = pendingApts; // Label says "Pending" on upgraded metric card
}

/**
 * Filters & Pagination Bindings
 */
function setupFilters() {
  const aptStatusFilter = document.getElementById('aptStatusFilter');
  if (aptStatusFilter) {
    aptStatusFilter.addEventListener('change', () => {
      currentPage = 1;
      renderAppointmentsTable();
    });
  }

  const aptSearchInput = document.getElementById('aptSearchInput');
  if (aptSearchInput) {
    aptSearchInput.addEventListener('input', Utils.debounce(() => {
      currentPage = 1;
      renderAppointmentsTable();
    }, 300));
  }

  const patientSearchInput = document.getElementById('patientSearchInput');
  if (patientSearchInput) {
    patientSearchInput.addEventListener('input', Utils.debounce(() => {
      renderPatientsTable();
    }, 300));
  }
}

/**
 * Render appointments grid with search, filter, and pagination
 */
function renderAppointmentsTable() {
  const tbody = document.getElementById('adminAppointmentsTable');
  if (!tbody) return;
  
  let appointments = Storage.getAppointments();
  
  // Apply Search
  const query = document.getElementById('aptSearchInput')?.value.trim().toLowerCase() || '';
  if (query) {
    appointments = appointments.filter(a => 
      a.id.toLowerCase().includes(query) || 
      a.name.toLowerCase().includes(query) ||
      a.mobile.includes(query)
    );
  }

  // Apply filter
  const filter = document.getElementById('aptStatusFilter').value;
  if (filter !== 'All') {
    appointments = appointments.filter(a => a.status === filter);
  }
  
  // Sort latest first
  appointments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Clear checkboxes selections
  selectedApts = [];
  const mainCheckbox = document.getElementById('selectAllApts');
  if (mainCheckbox) mainCheckbox.checked = false;

  // Pagination bounds
  const totalItems = appointments.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginated = appointments.slice(start, end);

  tbody.innerHTML = '';
  
  if (paginated.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">No appointments found.</td></tr>';
    renderPaginationControls(0);
    return;
  }
  
  paginated.forEach(apt => {
    let statusClass = '';
    if (apt.status === 'Pending') statusClass = 'status-pending';
    else if (apt.status === 'Confirmed') statusClass = 'status-confirmed';
    else if (apt.status === 'In Progress') statusClass = 'status-confirmed';
    else if (apt.status === 'Completed') statusClass = 'status-completed';
    else if (apt.status === 'Cancelled') statusClass = 'status-cancelled';
    
    const formattedDate = Utils.formatDate(apt.date);
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" class="apt-row-checkbox" data-apt-id="${apt.id}"></td>
      <td><strong>${apt.id}</strong></td>
      <td>
        <div style="font-weight: 500;">${apt.name}</div>
        <div style="font-size: 0.85rem; color: var(--text-secondary);">${apt.mobile}</div>
      </td>
      <td>
        <div>${formattedDate}</div>
        <div style="font-size: 0.85rem; color: var(--text-secondary);">${apt.time}</div>
      </td>
      <td>${apt.doctor.split('(')[0].trim()}</td>
      <td><span class="status-badge ${statusClass}">${apt.status}</span></td>
      <td>
        <button class="action-btn" title="Edit" onclick="editAppointment('${apt.id}')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="action-btn" title="Update Status" onclick="openStatusModal('${apt.id}', '${apt.status}')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </button>
        <button class="action-btn delete" title="Delete" onclick="deleteAppointment('${apt.id}')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </td>
    `;
    
    // Bind selection event listener
    const cb = tr.querySelector('.apt-row-checkbox');
    cb.addEventListener('change', () => toggleRowSelection(apt.id, cb.checked));
    
    tbody.appendChild(tr);
  });

  renderPaginationControls(totalPages);
}

function renderPaginationControls(totalPages) {
  const container = document.getElementById('aptPagination');
  if (!container) return;
  container.innerHTML = '';
  
  if (totalPages <= 1) return;

  const prevBtn = document.createElement('button');
  prevBtn.className = 'btn btn-secondary btn-sm';
  prevBtn.innerText = 'Prev';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => {
    currentPage -= 1;
    renderAppointmentsTable();
  });
  container.appendChild(prevBtn);

  const label = document.createElement('span');
  label.style.margin = '0 12px';
  label.innerText = `Page ${currentPage} of ${totalPages}`;
  container.appendChild(label);

  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn btn-secondary btn-sm';
  nextBtn.innerText = 'Next';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => {
    currentPage += 1;
    renderAppointmentsTable();
  });
  container.appendChild(nextBtn);
}

/**
 * Bulk actions handler
 */
function toggleRowSelection(aptId, isChecked) {
  if (isChecked) {
    selectedApts.push(aptId);
  } else {
    selectedApts = selectedApts.filter(id => id !== aptId);
  }
  updateBulkActionVisibility();
}

function updateBulkActionVisibility() {
  const bar = document.getElementById('bulkActionsBar');
  if (!bar) return;
  bar.style.display = selectedApts.length > 0 ? 'flex' : 'none';
  document.getElementById('bulkSelectCount').innerText = `${selectedApts.length} selected`;
}

/**
 * Bind bulk selectors and database actions
 */
function initBulkAndBackupHandlers() {
  const mainCb = document.getElementById('selectAllApts');
  if (mainCb) {
    mainCb.addEventListener('change', (e) => {
      const rows = document.querySelectorAll('.apt-row-checkbox');
      selectedApts = [];
      rows.forEach(cb => {
        cb.checked = e.target.checked;
        if (e.target.checked) {
          selectedApts.push(cb.getAttribute('data-apt-id'));
        }
      });
      updateBulkActionVisibility();
    });
  }

  // Bulk Status trigger
  const bulkStatusBtn = document.getElementById('bulkStatusBtn');
  if (bulkStatusBtn) {
    bulkStatusBtn.addEventListener('click', () => {
      openStatusModal('BULK', 'Pending');
    });
  }

  // Bulk Delete
  const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
  if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener('click', () => {
      if (confirm(`Are you sure you want to delete ${selectedApts.length} appointments?`)) {
        let appointments = Storage.getAppointments();
        appointments = appointments.filter(a => !selectedApts.includes(a.id));
        Storage.saveAppointments(appointments);
        UI.showToast('Bulk delete completed', 'success');
        initAdminData();
      }
    });
  }

  // Exports CSV / Backup buttons
  document.getElementById('exportAptCSVBtn')?.addEventListener('click', () => {
    const data = Storage.getAppointments();
    Storage.exportToCSV(data, ['ID', 'Name', 'Mobile', 'Date', 'Time', 'Doctor', 'Status'], 'appointments_list.csv');
  });

  document.getElementById('exportPtCSVBtn')?.addEventListener('click', () => {
    const data = Storage.getPatients();
    Storage.exportToCSV(data, ['ID', 'Name', 'Age', 'Gender', 'Contact', 'Allergies', 'BloodGroup', 'EmergencyContact'], 'patients_list.csv');
  });

  document.getElementById('backupDbBtn')?.addEventListener('click', () => {
    Storage.backupDatabase();
  });

  const restoreFile = document.getElementById('restoreDbFile');
  restoreFile?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const res = Storage.restoreDatabase(evt.target.result);
      if (res.success) {
        UI.showToast(res.message, 'success');
        initAdminData();
      } else {
        UI.showToast(res.message, 'error');
      }
    };
    reader.readAsText(file);
  });
}

/**
 * Status Management (Single / Bulk)
 */
window.openStatusModal = function(id, currentStatus) {
  document.getElementById('updateAptId').value = id;
  document.getElementById('newStatusSelect').value = currentStatus;
  UI.openModal('statusModal');
};

window.updateStatus = function() {
  const id = document.getElementById('updateAptId').value;
  const newStatus = document.getElementById('newStatusSelect').value;
  
  let appointments = Storage.getAppointments();
  
  if (id === 'BULK') {
    appointments.forEach(apt => {
      if (selectedApts.includes(apt.id)) {
        apt.status = newStatus;
      }
    });
    Storage.saveAppointments(appointments);
    UI.closeModal('statusModal');
    initAdminData();
    UI.showToast('Bulk status updated successfully', 'success');
  } else {
    const index = appointments.findIndex(a => a.id === id);
    if (index !== -1) {
      appointments[index].status = newStatus;
      Storage.saveAppointments(appointments);
      UI.closeModal('statusModal');
      initAdminData();
      UI.showToast('Status updated successfully', 'success');
    }
  }
};

/**
 * Edit appointment details (Single)
 */
window.editAppointment = function(id) {
  const appointments = Storage.getAppointments();
  const apt = appointments.find(a => a.id === id);
  if (!apt) return;

  document.getElementById('editAptId').value = apt.id;
  document.getElementById('editAptName').value = apt.name;
  document.getElementById('editAptPhone').value = apt.mobile;
  document.getElementById('editAptDoctor').value = apt.doctor;
  document.getElementById('editAptDate').value = apt.date;
  document.getElementById('editAptTime').value = apt.time;

  UI.openModal('editAptModal');
};

window.saveEditAppointment = function() {
  const id = document.getElementById('editAptId').value;
  const name = document.getElementById('editAptName').value.trim();
  const mobile = document.getElementById('editAptPhone').value.trim();
  const doctor = document.getElementById('editAptDoctor').value;
  const date = document.getElementById('editAptDate').value;
  const time = document.getElementById('editAptTime').value;

  if (!name || !mobile || !date || !time) {
    UI.showToast('Please fill all required fields.', 'error');
    return;
  }

  // Check scheduling conflicts
  if (Storage.isSlotOccupied(doctor, date, time, id)) {
    UI.showToast('Doctor slot collision! That slot is already booked.', 'error');
    return;
  }

  let appointments = Storage.getAppointments();
  const idx = appointments.findIndex(a => a.id === id);
  if (idx !== -1) {
    appointments[idx].name = name;
    appointments[idx].mobile = mobile;
    appointments[idx].doctor = doctor;
    appointments[idx].date = date;
    appointments[idx].time = time;
    
    Storage.saveAppointments(appointments);
    UI.closeModal('editAptModal');
    initAdminData();
    UI.showToast('Appointment updated successfully', 'success');
  }
};

window.deleteAppointment = function(id) {
  if (confirm('Are you sure you want to delete this appointment?')) {
    let appointments = Storage.getAppointments();
    appointments = appointments.filter(a => a.id !== id);
    Storage.saveAppointments(appointments);
    initAdminData();
    UI.showToast('Appointment deleted', 'success');
  }
};

/**
 * Patient Records CRUD with advanced medical parameters
 */
function renderPatientsTable() {
  const tbody = document.getElementById('adminPatientsTable');
  if (!tbody) return;
  
  let patients = Storage.getPatients();

  // Filter Search
  const query = document.getElementById('patientSearchInput')?.value.trim().toLowerCase() || '';
  if (query) {
    patients = patients.filter(pt => 
      pt.name.toLowerCase().includes(query) || 
      pt.contact.includes(query)
    );
  }

  tbody.innerHTML = '';
  
  if (patients.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No patient records found.</td></tr>';
    return;
  }
  
  patients.forEach(pt => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${pt.id}</strong></td>
      <td>
        <div style="font-weight: 500;">${pt.name}</div>
        <div style="font-size: 0.85rem; color: var(--text-secondary);">${pt.age} yrs, ${pt.gender}</div>
      </td>
      <td>${pt.contact}</td>
      <td>
        <div style="font-size: 0.9rem;">Blood: <span style="font-weight: bold;">${pt.bloodGroup || 'N/A'}</span></div>
        <div style="font-size: 0.85rem; color: var(--accent-color);">Allergies: ${pt.allergies || 'None'}</div>
      </td>
      <td style="max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${pt.medicalHistory || ''}">
        ${pt.medicalHistory || '<span style="color:var(--text-light)">No history</span>'}
      </td>
      <td>
        <button class="action-btn" title="Edit" onclick="editPatient('${pt.id}')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="action-btn delete" title="Delete" onclick="deletePatient('${pt.id}')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function savePatientRecord() {
  const idInput = document.getElementById('recordId');
  const id = idInput.value;
  
  const name = document.getElementById('recordName').value.trim();
  const age = document.getElementById('recordAge').value;
  const gender = document.getElementById('recordGender').value;
  const contact = document.getElementById('recordContact').value.trim();
  const history = document.getElementById('recordHistory').value.trim();
  const allergies = document.getElementById('recordAllergies').value.trim();
  const blood = document.getElementById('recordBloodGroup').value;
  const emergency = document.getElementById('recordEmergency').value.trim();
  const insurance = document.getElementById('recordInsurance').value.trim();
  
  let patients = Storage.getPatients();
  
  if (id) {
    // Update existing
    const index = patients.findIndex(p => p.id === id);
    if (index !== -1) {
      patients[index] = { 
        ...patients[index], 
        name, age, gender, contact, 
        medicalHistory: history,
        allergies,
        bloodGroup: blood,
        emergencyContact: emergency,
        insurance
      };
      UI.showToast('Patient record updated', 'success');
    }
  } else {
    // Add new patient record
    patients.push({
      id: 'PT-' + Date.now().toString().slice(-6),
      name, age, gender, contact,
      medicalHistory: history,
      allergies,
      bloodGroup: blood,
      emergencyContact: emergency,
      insurance,
      createdAt: new Date().toISOString()
    });
    UI.showToast('Patient record added', 'success');
  }
  
  Storage.savePatients(patients);
  UI.closeModal('patientModal');
  initAdminData();
}

window.editPatient = function(id) {
  const patients = Storage.getPatients();
  const pt = patients.find(p => p.id === id);
  if (pt) {
    document.getElementById('recordId').value = pt.id;
    document.getElementById('recordName').value = pt.name;
    document.getElementById('recordAge').value = pt.age;
    document.getElementById('recordGender').value = pt.gender;
    document.getElementById('recordContact').value = pt.contact;
    document.getElementById('recordHistory').value = pt.medicalHistory || '';
    document.getElementById('recordAllergies').value = pt.allergies || '';
    document.getElementById('recordBloodGroup').value = pt.bloodGroup || '';
    document.getElementById('recordEmergency').value = pt.emergencyContact || '';
    document.getElementById('recordInsurance').value = pt.insurance || '';
    
    UI.openModal('patientModal');
  }
};

window.deletePatient = function(id) {
  if (confirm('Are you sure you want to delete this patient record?')) {
    let patients = Storage.getPatients();
    patients = patients.filter(p => p.id !== id);
    Storage.savePatients(patients);
    initAdminData();
    UI.showToast('Patient record deleted', 'success');
  }
};

/**
 * Analytical Charts Canvas Drawer
 */
function drawTrendsChart() {
  const canvas = document.getElementById('trendsChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const appointments = Storage.getAppointments();
  
  // Last 7 days metrics
  const days = [];
  const counts = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const displayStr = d.toLocaleDateString('en-GB', { weekday: 'short' });
    days.push(displayStr);
    counts.push(appointments.filter(a => a.date === dateStr).length);
  }
  
  // Seed sample mock figures for visualization if empty database
  const hasData = counts.some(c => c > 0);
  if (!hasData) {
    counts[3] = 4; counts[4] = 9; counts[5] = 6; counts[6] = 3;
  }
  
  const maxVal = Math.max(...counts, 5) + 2;
  const paddingX = 40;
  const paddingY = 40;
  const width = canvas.width - paddingX * 2;
  const height = canvas.height - paddingY * 2;
  
  // Grid Lines
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
  ctx.lineWidth = 1;
  for (let l = 0; l <= 5; l++) {
    const yGrid = paddingY + (l / 5) * height;
    ctx.beginPath();
    ctx.moveTo(paddingX, yGrid);
    ctx.lineTo(canvas.width - paddingX, yGrid);
    ctx.stroke();
  }

  // Draw Axes
  ctx.beginPath();
  ctx.moveTo(paddingX, paddingY);
  ctx.lineTo(paddingX, canvas.height - paddingY);
  ctx.lineTo(canvas.width - paddingX, canvas.height - paddingY);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#f8fafc' : '#1e293b';
  const barWidth = (width / days.length) * 0.6;
  const gap = (width / days.length) * 0.4;
  
  ctx.font = '12px Inter, sans-serif';
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  
  days.forEach((day, i) => {
    const val = counts[i];
    const barHeight = (val / maxVal) * height;
    const x = paddingX + gap/2 + i * (barWidth + gap);
    const y = canvas.height - paddingY - barHeight;
    
    // Bar with clean gradient style
    const gradient = ctx.createLinearGradient(x, y, x, canvas.height - paddingY);
    gradient.addColorStop(0, '#2196f3');
    gradient.addColorStop(1, '#60a5fa');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
    ctx.fill();
    
    // Day text
    ctx.fillStyle = textColor;
    ctx.fillText(day, x + barWidth/2, canvas.height - paddingY + 20);
    if (val > 0) {
      ctx.fillText(val, x + barWidth/2, y - 8);
    }
  });
}

function drawServiceChart() {
  const canvas = document.getElementById('serviceChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const appointments = Storage.getAppointments();
  const categories = { 'General': 0, 'Pediatrics': 0, 'Cardiology': 0, 'Gynecology': 0 };
  
  appointments.forEach(apt => {
    if (apt.doctor.includes('General')) categories['General']++;
    else if (apt.doctor.includes('Pediatrics')) categories['Pediatrics']++;
    else if (apt.doctor.includes('Cardiology')) categories['Cardiology']++;
    else if (apt.doctor.includes('Gynecology')) categories['Gynecology']++;
  });
  
  const hasData = Object.values(categories).some(v => v > 0);
  if (!hasData) {
    categories['General'] = 14; categories['Pediatrics'] = 6; categories['Cardiology'] = 4; categories['Gynecology'] = 8;
  }
  
  const keys = Object.keys(categories);
  const values = Object.values(categories);
  const maxVal = Math.max(...values, 5);
  
  const paddingX = 80;
  const paddingY = 20;
  const width = canvas.width - paddingX - 25;
  const height = canvas.height - paddingY * 2;
  const barHeight = (height / keys.length) * 0.6;
  const gap = (height / keys.length) * 0.4;
  
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#f8fafc' : '#1e293b';
  
  ctx.font = '12px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  
  keys.forEach((key, i) => {
    const val = values[i];
    const barWidth = (val / maxVal) * width;
    const y = paddingY + gap/2 + i * (barHeight + gap);
    
    // Label text
    ctx.fillStyle = textColor;
    ctx.fillText(key, paddingX - 10, y + barHeight/2);
    
    // Render Bar
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.roundRect(paddingX, y, barWidth, barHeight, [0, 4, 4, 0]);
    ctx.fill();
    
    // Value text
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.fillText(val, paddingX + barWidth + 8, y + barHeight/2);
    ctx.textAlign = 'right';
  });
}

function drawUtilizationChart() {
  const canvas = document.getElementById('utilizationChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const appointments = Storage.getAppointments();
  const doctors = {
    'Dr. Vikram Sharma': 0,
    'Dr. Anjali Desai': 0,
    'Dr. Rajesh Kumar': 0,
    'Dr. Meera Patel': 0
  };

  appointments.forEach(apt => {
    const docName = Object.keys(doctors).find(name => apt.doctor.includes(name));
    if (docName && apt.status !== 'Cancelled') {
      doctors[docName]++;
    }
  });

  const hasData = Object.values(doctors).some(v => v > 0);
  if (!hasData) {
    doctors['Dr. Vikram Sharma'] = 12;
    doctors['Dr. Anjali Desai'] = 8;
    doctors['Dr. Rajesh Kumar'] = 4;
    doctors['Dr. Meera Patel'] = 9;
  }

  const keys = Object.keys(doctors);
  const values = Object.values(doctors);
  const maxVal = Math.max(...values, 5);

  const paddingX = 110;
  const paddingY = 20;
  const width = canvas.width - paddingX - 25;
  const height = canvas.height - paddingY * 2;
  const barHeight = (height / keys.length) * 0.5;
  const gap = (height / keys.length) * 0.5;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#f8fafc' : '#1e293b';

  ctx.font = '12px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  keys.forEach((key, i) => {
    const val = values[i];
    const barWidth = (val / maxVal) * width;
    const y = paddingY + gap/2 + i * (barHeight + gap);

    ctx.fillStyle = textColor;
    ctx.fillText(key.replace('Dr. ', ''), paddingX - 10, y + barHeight/2);

    ctx.fillStyle = '#ff9800';
    ctx.beginPath();
    ctx.roundRect(paddingX, y, barWidth, barHeight, [0, 4, 4, 0]);
    ctx.fill();

    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.fillText(val, paddingX + barWidth + 8, y + barHeight/2);
    ctx.textAlign = 'right';
  });
}
