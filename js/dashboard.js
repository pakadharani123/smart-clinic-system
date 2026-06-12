/**
 * Smart Clinic Management System
 * Patient Dashboard Module
 */

import { Utils } from './utils.js';
import { Storage } from './storage.js';
import { UI } from './ui.js';

let searchResults = [];
let currentAptToCancel = null;

document.addEventListener('DOMContentLoaded', () => {
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('searchInput');

  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') performSearch();
    });
  }

  // Setup filters event listeners
  initFilters();

  const confirmCancelBtn = document.getElementById('confirmCancelBtn');
  if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener('click', () => {
      if (currentAptToCancel) {
        cancelAppointment(currentAptToCancel);
        UI.closeModal('cancelModal');
      }
    });
  }
});

/**
 * Perform initial search and compute statistics
 */
function performSearch() {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  const emptyState = document.getElementById('emptyState');
  const listContainer = document.getElementById('appointmentsList');
  const filtersSection = document.getElementById('patientFiltersSection');
  
  if (!query) {
    UI.showToast('Please enter an Appointment ID or Mobile Number', 'info');
    return;
  }

  const appointments = Storage.getAppointments();
  
  // Find matching appointments
  searchResults = appointments.filter(apt => 
    apt.id.toLowerCase() === query || apt.mobile === query
  );

  // Render stats
  renderStats(searchResults);

  if (searchResults.length === 0) {
    emptyState.style.display = 'block';
    listContainer.style.display = 'none';
    if (filtersSection) filtersSection.style.display = 'none';
    UI.showToast('No appointments found matching your query.', 'error');
  } else {
    emptyState.style.display = 'none';
    listContainer.style.display = 'block';
    if (filtersSection) filtersSection.style.display = 'block';
    
    // Sort latest first by default
    document.getElementById('patientSortSelect').value = 'date-desc';
    
    applyFiltersAndRender();
    UI.showToast(`Found ${searchResults.length} appointment(s)`, 'success');
  }
}

/**
 * Setup Sort and Filter Listener callbacks
 */
function initFilters() {
  const sortSelect = document.getElementById('patientSortSelect');
  const doctorSelect = document.getElementById('patientDoctorFilter');
  const dateInput = document.getElementById('patientDateFilter');
  const statusSelect = document.getElementById('patientStatusFilter');

  if (sortSelect) sortSelect.addEventListener('change', applyFiltersAndRender);
  if (doctorSelect) doctorSelect.addEventListener('change', applyFiltersAndRender);
  if (dateInput) dateInput.addEventListener('change', applyFiltersAndRender);
  if (statusSelect) statusSelect.addEventListener('change', applyFiltersAndRender);
}

/**
 * Filter, sort and render matching items
 */
function applyFiltersAndRender() {
  let filtered = [...searchResults];

  // 1. Filter by Doctor
  const doctorVal = document.getElementById('patientDoctorFilter').value;
  if (doctorVal) {
    filtered = filtered.filter(a => a.doctor === doctorVal);
  }

  // 2. Filter by Date
  const dateVal = document.getElementById('patientDateFilter').value;
  if (dateVal) {
    filtered = filtered.filter(a => a.date === dateVal);
  }

  // 3. Filter by Status
  const statusVal = document.getElementById('patientStatusFilter').value;
  if (statusVal) {
    filtered = filtered.filter(a => a.status === statusVal);
  }

  // 4. Sort
  const sortVal = document.getElementById('patientSortSelect').value;
  if (sortVal === 'date-asc') {
    filtered.sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));
  } else if (sortVal === 'date-desc') {
    filtered.sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
  } else if (sortVal === 'id-asc') {
    filtered.sort((a, b) => a.id.localeCompare(b.id));
  }

  renderAppointments(filtered);
}

/**
 * Render lists of matching appointments
 */
function renderAppointments(appointments) {
  const listContainer = document.getElementById('appointmentsList');
  listContainer.innerHTML = '';

  if (appointments.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align: center; padding: 48px; color: var(--text-secondary); background: var(--surface-color); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
        No appointments match the current filters.
      </div>
    `;
    return;
  }

  appointments.forEach(apt => {
    const dateObj = new Date(apt.date);
    const formattedDate = Utils.formatDate(apt.date);
    
    let statusClass = '';
    if (apt.status === 'Pending') statusClass = 'status-pending';
    else if (apt.status === 'Confirmed') statusClass = 'status-confirmed';
    else if (apt.status === 'In Progress') statusClass = 'status-confirmed';
    else if (apt.status === 'Completed') statusClass = 'status-completed';
    else if (apt.status === 'Cancelled') statusClass = 'status-cancelled';

    const canCancel = apt.status === 'Pending' || apt.status === 'Confirmed';

    const card = document.createElement('div');
    card.className = 'appointment-card animate-on-scroll fade-up is-visible';
    card.innerHTML = `
      <div class="apt-details">
        <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 8px;">
          <h4 style="margin: 0; font-size: 1.15rem;">${apt.id}</h4>
          <span class="status-badge ${statusClass}">${apt.status}</span>
        </div>
        <p style="margin-bottom: 6px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ${formattedDate} at ${apt.time}
        </p>
        <p>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          ${apt.doctor.split('(')[0].trim()}
        </p>
      </div>
      <div class="apt-actions">
        <button class="btn btn-secondary btn-sm" onclick="viewDetails('${apt.id}')">View Details</button>
        ${canCancel ? `<button class="btn btn-sm" style="background-color: transparent; color: var(--status-cancelled); border: 1px solid var(--status-cancelled);" onclick="promptCancel('${apt.id}')">Cancel</button>` : ''}
      </div>
    `;
    
    listContainer.appendChild(card);
  });
}

/**
 * Display metrics counter cards
 */
function renderStats(appointments) {
  const statsContainer = document.getElementById('patientStatsWrapper');
  if (!statsContainer) return;

  const total = appointments.length;
  const upcoming = appointments.filter(a => a.status === 'Pending' || a.status === 'Confirmed').length;
  const completed = appointments.filter(a => a.status === 'Completed').length;
  const cancelled = appointments.filter(a => a.status === 'Cancelled').length;

  statsContainer.style.display = total > 0 ? 'grid' : 'none';
  
  document.getElementById('patientStatTotal').innerText = total;
  document.getElementById('patientStatUpcoming').innerText = upcoming;
  document.getElementById('patientStatCompleted').innerText = completed;
  document.getElementById('patientStatCancelled').innerText = cancelled;
}

/**
 * Render details modal showing appointment and timeline
 */
window.viewDetails = function(id) {
  const appointments = Storage.getAppointments();
  const apt = appointments.find(a => a.id === id);
  if (!apt) return;

  const formattedDate = Utils.formatDate(apt.date);
  const formattedCreated = Utils.formatDateTime(apt.createdAt);

  let statusClass = '';
  if (apt.status === 'Pending') statusClass = 'status-pending';
  else if (apt.status === 'Confirmed') statusClass = 'status-confirmed';
  else if (apt.status === 'In Progress') statusClass = 'status-confirmed';
  else if (apt.status === 'Completed') statusClass = 'status-completed';
  else if (apt.status === 'Cancelled') statusClass = 'status-cancelled';

  // Generate Status Timeline HTML
  const timelineHTML = renderTimelineHTML(apt.status);

  const content = document.getElementById('modalDetailsContent');
  content.innerHTML = `
    <div style="display: flex; justify-content: space-between; margin-bottom: 24px; align-items: center;">
      <h4 style="margin: 0; color: var(--primary-color); font-size: 1.3rem;">${apt.id}</h4>
      <span class="status-badge ${statusClass}">${apt.status}</span>
    </div>

    <!-- Timeline Component -->
    <div style="margin-bottom: 32px;">
      <span style="color: var(--text-secondary); font-size: 0.9rem; display: block; margin-bottom: 12px; font-weight: 600;">Status Progress</span>
      ${timelineHTML}
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
      <div>
        <span style="color: var(--text-secondary); font-size: 0.9rem; display: block;">Patient Name</span>
        <strong>${apt.name}</strong>
      </div>
      <div>
        <span style="color: var(--text-secondary); font-size: 0.9rem; display: block;">Contact</span>
        <strong>${apt.mobile}</strong>
      </div>
      <div>
        <span style="color: var(--text-secondary); font-size: 0.9rem; display: block;">Date</span>
        <strong>${formattedDate}</strong>
      </div>
      <div>
        <span style="color: var(--text-secondary); font-size: 0.9rem; display: block;">Time</span>
        <strong>${apt.time}</strong>
      </div>
    </div>
    
    <div style="margin-bottom: 16px;">
      <span style="color: var(--text-secondary); font-size: 0.9rem; display: block;">Consulting Doctor</span>
      <strong>${apt.doctor}</strong>
    </div>
    
    ${apt.problem ? `
    <div style="margin-bottom: 16px; padding: 16px; background-color: var(--surface-hover); border-radius: var(--radius-sm);">
      <span style="color: var(--text-secondary); font-size: 0.9rem; display: block; margin-bottom: 4px;">Problem Description</span>
      <p style="margin: 0;">${apt.problem}</p>
    </div>` : ''}
    
    <div style="font-size: 0.85rem; color: var(--text-light); text-align: right; border-top: 1px solid var(--border-color); padding-top: 16px;">
      Booked on: ${formattedCreated}
    </div>
  `;
  
  UI.openModal('detailsModal');
};

/**
 * Generate HTML for Status Progression Timeline
 */
function renderTimelineHTML(currentStatus) {
  const states = ['Pending', 'Confirmed', 'In Progress', 'Completed'];
  if (currentStatus === 'Cancelled') {
    return `
      <div class="timeline-wrapper">
        <div class="timeline-step active cancelled" style="width: 100%;">
          <div class="step-circle">&times;</div>
          <div class="step-label">Cancelled</div>
        </div>
      </div>
    `;
  }

  const activeIndex = states.indexOf(currentStatus);
  
  return `
    <div class="timeline-wrapper">
      ${states.map((state, i) => {
        let stateClass = '';
        if (i < activeIndex) stateClass = 'completed';
        else if (i === activeIndex) stateClass = 'active';
        
        return `
          <div class="timeline-step ${stateClass}">
            <div class="step-circle">${i < activeIndex ? '✓' : i + 1}</div>
            <div class="step-label">${state}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

window.promptCancel = function(id) {
  currentAptToCancel = id;
  document.getElementById('cancelAptId').textContent = id;
  UI.openModal('cancelModal');
};

function cancelAppointment(id) {
  const appointments = Storage.getAppointments();
  const index = appointments.findIndex(a => a.id === id);
  
  if (index !== -1) {
    appointments[index].status = 'Cancelled';
    Storage.saveAppointments(appointments);
    
    UI.showToast('Appointment cancelled successfully', 'success');
    
    // Refresh lists and stats
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    searchResults = appointments.filter(apt => 
      apt.id.toLowerCase() === query || apt.mobile === query
    );
    renderStats(searchResults);
    applyFiltersAndRender();
  }
}
