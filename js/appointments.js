/**
 * Smart Clinic Management System
 * Appointment Booking & Slot Management Module
 */

import { Utils } from './utils.js';
import { Storage } from './storage.js';
import { Validation } from './validation.js';
import { UI } from './ui.js';

const SLOTS = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM"
];

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('appointmentForm');
  if (!form) return;

  // Set minimum date to today
  const dateInput = document.getElementById('appointmentDate');
  const today = new Date().toISOString().split('T')[0];
  dateInput.setAttribute('min', today);

  // Initialize slot selection grid events
  const doctorSelect = document.getElementById('appointmentDoctor');
  dateInput.addEventListener('change', updateAvailableSlots);
  doctorSelect.addEventListener('change', updateAvailableSlots);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (validateForm()) {
      saveAppointment();
    }
  });

  // Real-time validation removal on input
  const inputs = form.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    input.addEventListener('input', () => input.classList.remove('invalid'));
    input.addEventListener('change', () => input.classList.remove('invalid'));
  });

  // Modal actions binding for Print/Download
  initReceiptActions();
});

/**
 * Dynamically load and render the slots for a doctor on a specific date
 */
function updateAvailableSlots() {
  const doctor = document.getElementById('appointmentDoctor').value;
  const date = document.getElementById('appointmentDate').value;
  const slotGrid = document.getElementById('slotGrid');
  const slotWrapper = document.getElementById('slotPickerWrapper');
  const hiddenTimeInput = document.getElementById('appointmentTime');
  
  if (!slotGrid || !slotWrapper) return;
  
  // Clear selection
  hiddenTimeInput.value = '';
  
  if (!doctor || !date) {
    slotWrapper.style.display = 'none';
    return;
  }
  
  slotWrapper.style.display = 'block';
  slotGrid.innerHTML = '';
  
  // Fetch booked slots from storage
  const bookedSlots = Storage.getBookedSlots(doctor, date);
  
  SLOTS.forEach(slot => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'slot-btn';
    btn.innerText = slot;
    
    if (bookedSlots.includes(slot)) {
      btn.classList.add('booked');
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
      btn.setAttribute('title', 'Slot already booked');
    } else {
      btn.addEventListener('click', () => {
        // Clear active states
        slotGrid.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        hiddenTimeInput.value = slot;
        hiddenTimeInput.classList.remove('invalid');
      });
    }
    slotGrid.appendChild(btn);
  });
}

/**
 * Validate booking form inputs
 */
function validateForm() {
  let isValid = true;
  
  const name = document.getElementById('patientName');
  const mobile = document.getElementById('patientMobile');
  const email = document.getElementById('patientEmail');
  const age = document.getElementById('patientAge');
  const gender = document.getElementById('patientGender');
  const date = document.getElementById('appointmentDate');
  const time = document.getElementById('appointmentTime');
  const doctor = document.getElementById('appointmentDoctor');

  if (!Validation.validateName(name.value)) { setInvalid(name); isValid = false; }
  if (!Validation.validatePhone(mobile.value)) { setInvalid(mobile); isValid = false; }
  if (!Validation.validateEmail(email.value)) { setInvalid(email); isValid = false; }
  if (!Validation.validateAge(age.value)) { setInvalid(age); isValid = false; }
  if (!gender.value) { setInvalid(gender); isValid = false; }
  if (!Validation.validateDate(date.value)) { setInvalid(date); isValid = false; }
  
  if (!time.value) {
    const slotWrapper = document.getElementById('slotPickerWrapper');
    if (slotWrapper) {
      slotWrapper.querySelector('.error-message').style.display = 'block';
      time.classList.add('invalid');
    }
    isValid = false;
  } else {
    const slotWrapper = document.getElementById('slotPickerWrapper');
    if (slotWrapper) {
      slotWrapper.querySelector('.error-message').style.display = 'none';
    }
  }
  
  if (!doctor.value) { setInvalid(doctor); isValid = false; }

  return isValid;
}

function setInvalid(element) {
  element.classList.add('invalid');
  UI.showToast(`Please correct the marked fields.`, 'error');
}

/**
 * Save new appointment to DB
 */
function saveAppointment() {
  const name = document.getElementById('patientName').value.trim();
  const mobile = document.getElementById('patientMobile').value.trim();
  const email = document.getElementById('patientEmail').value.trim();
  const age = document.getElementById('patientAge').value;
  const gender = document.getElementById('patientGender').value;
  const date = document.getElementById('appointmentDate').value;
  const time = document.getElementById('appointmentTime').value;
  const doctor = document.getElementById('appointmentDoctor').value;
  const problem = document.getElementById('problemDesc').value.trim();

  // Prevent double booking at Storage level
  if (Storage.isSlotOccupied(doctor, date, time)) {
    UI.showToast('This slot is already booked for this doctor. Please select another slot.', 'error');
    return;
  }

  const appointments = Storage.getAppointments();
  
  // Prevent duplicate booking for the same patient (prevent multiple overlapping bookings on same day)
  const isDuplicate = appointments.some(apt => 
    apt.name.toLowerCase() === name.toLowerCase() && 
    apt.date === date && 
    apt.time === time &&
    apt.status !== 'Cancelled'
  );

  if (isDuplicate) {
    UI.showToast('You already have an appointment booked for this time.', 'error');
    return;
  }

  const newAppointment = {
    id: Utils.generateAppointmentId(),
    name,
    mobile,
    email,
    age,
    gender,
    date,
    time,
    doctor,
    problem,
    status: 'Pending',
    createdAt: new Date().toISOString()
  };

  appointments.push(newAppointment);
  Storage.saveAppointments(appointments);

  // Sync / create patient record
  const patients = Storage.getPatients();
  const patientExists = patients.some(p => p.contact === mobile);
  if (!patientExists) {
    patients.push({
      id: 'PT-' + Date.now().toString().slice(-6),
      name,
      age,
      gender,
      contact: mobile,
      medicalHistory: '',
      allergies: '',
      bloodGroup: '',
      emergencyContact: '',
      insurance: '',
      createdAt: new Date().toISOString()
    });
    Storage.savePatients(patients);
  }

  showSuccessSlip(newAppointment);
  
  // Update slots grid
  updateAvailableSlots();
}

/**
 * Render success details in modal receipt
 */
function showSuccessSlip(apt) {
  const dateObj = new Date(apt.date);
  const formattedDate = Utils.formatDate(apt.date);

  document.getElementById('modalAptId').textContent = apt.id;
  document.getElementById('modalName').textContent = apt.name;
  document.getElementById('modalDateTime').textContent = `${formattedDate}, ${apt.time}`;
  document.getElementById('modalDoctor').textContent = apt.doctor.split('(')[0].trim();
  
  // Set values for Print/WhatsApp buttons
  const printBtn = document.getElementById('receiptPrintBtn');
  const whatsappBtn = document.getElementById('receiptWhatsAppBtn');
  
  if (printBtn) {
    printBtn.setAttribute('data-apt-id', apt.id);
  }
  
  if (whatsappBtn) {
    const doctorName = apt.doctor.split('(')[0].trim();
    const message = `Hello Smart Clinic! I have booked an appointment.\n\n*Appointment ID:* ${apt.id}\n*Patient Name:* ${apt.name}\n*Doctor Name:* ${doctorName}\n*Date:* ${formattedDate}\n*Time:* ${apt.time}`;
    const waUrl = `https://wa.me/916304959026?text=${encodeURIComponent(message)}`;
    whatsappBtn.href = waUrl;
  }

  UI.openModal('successModal');
  UI.showToast('Appointment booked successfully!', 'success');
}

/**
 * Receipt slip utilities (Print / Export)
 */
function initReceiptActions() {
  const printBtn = document.getElementById('receiptPrintBtn');
  if (!printBtn) return;
  
  printBtn.addEventListener('click', () => {
    const aptId = printBtn.getAttribute('data-apt-id');
    const appointments = Storage.getAppointments();
    const apt = appointments.find(a => a.id === aptId);
    if (!apt) return;
    
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    const doctorName = apt.doctor.split('(')[0].trim();
    
    printWindow.document.write(`
      <html>
      <head>
        <title>Appointment Slip - ${apt.id}</title>
        <style>
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; }
          .receipt { border: 2px dashed #2196f3; padding: 30px; border-radius: 12px; max-width: 450px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px; }
          .title { color: #2196f3; font-size: 24px; font-weight: bold; margin: 0; }
          .item { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 16px; }
          .label { color: #64748b; }
          .value { font-weight: bold; }
          .footer { text-align: center; border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px; font-size: 14px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="title">+ Smart Clinic</div>
            <p style="margin: 5px 0 0;">Premium Healthcare Services</p>
          </div>
          <div class="item">
            <span class="label">Appointment ID:</span>
            <span class="value" style="color: #2196f3;">${apt.id}</span>
          </div>
          <div class="item">
            <span class="label">Patient Name:</span>
            <span class="value">${apt.name}</span>
          </div>
          <div class="item">
            <span class="label">Consulting Doctor:</span>
            <span class="value">${doctorName}</span>
          </div>
          <div class="item">
            <span class="label">Date & Time:</span>
            <span class="value">${Utils.formatDate(apt.date)}, ${apt.time}</span>
          </div>
          <div class="item">
            <span class="label">Status:</span>
            <span class="value" style="color: #4caf50;">${apt.status}</span>
          </div>
          <div class="footer">
            <p>Please present this slip at the counter 15 mins prior.</p>
            <p>&copy; 2026 Smart Clinic System. All rights reserved.</p>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  });
}
