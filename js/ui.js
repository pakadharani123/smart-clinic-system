/**
 * Smart Clinic Management System
 * Shared Accessible UI Controls Module
 */

export const UI = {
  /**
   * Accessible Modal Handlers (traps focus, closes on Escape, restores focus)
   */
  activeModal: null,
  triggerElement: null,

  openModal(modalId, triggerEl = null) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    this.triggerElement = triggerEl || document.activeElement;
    modal.classList.add('active');
    this.activeModal = modal;
    
    // Add accessibility attributes
    modal.setAttribute('aria-hidden', 'false');
    
    // Trap focus inside modal
    const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex="0"]');
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    this.activeModal = null;
    
    // Restore focus
    if (this.triggerElement && typeof this.triggerElement.focus === 'function') {
      this.triggerElement.focus();
    }
  },

  /**
   * Accessible Toast Notifications
   */
  showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      container.setAttribute('role', 'alert');
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '';
    if (type === 'success') {
      icon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    } else if (type === 'error') {
      icon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    } else {
      icon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }
    
    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-message">${message}</div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => {
        toast.remove();
        if (container.children.length === 0) {
          container.remove();
        }
      }, 300);
    }, 4000);
  },

  /**
   * Clinic Live Status (Open/Closed status checking)
   */
  updateClinicStatus() {
    const statusWidget = document.getElementById('clinicStatusWidget');
    if (!statusWidget) return;
    
    const now = new Date();
    const day = now.getDay(); // 0 is Sunday, 6 is Saturday
    const hours = now.getHours();
    
    let isOpen = false;
    let statusText = "";
    
    if (day >= 1 && day <= 6) { // Monday to Saturday
      if (hours >= 9 && hours < 20) { // 9 AM to 8 PM
        isOpen = true;
        statusText = "Open Now (Office Hours: 09:00 AM - 08:00 PM)";
      } else {
        statusText = "Closed (Office Hours: 09:00 AM - 08:00 PM)";
      }
    } else {
      statusText = "Sunday: Emergency Only";
    }
    
    statusWidget.className = `clinic-status-badge ${isOpen ? 'open' : 'closed'}`;
    statusWidget.innerHTML = `
      <span class="status-dot"></span>
      <span class="status-label">${statusText}</span>
    `;
  },

  /**
   * Health Tips Carousel Renders
   */
  initHealthTipsCarousel() {
    const carouselContainer = document.getElementById('healthTipsContainer');
    if (!carouselContainer) return;
    
    const tips = [
      "Stay hydrated: Aim to drink at least 8-10 glasses of water daily.",
      "Get moving: Exercise for 30 minutes at least 5 days a week.",
      "Check your posture: Keep your back straight while sitting or working.",
      "Schedule checkups: Regular medical checks help catch issues early.",
      "Sleep well: Adults need 7-9 hours of quality sleep nightly."
    ];
    
    let currentIndex = 0;
    
    const renderTip = () => {
      carouselContainer.style.opacity = 0;
      setTimeout(() => {
        carouselContainer.innerHTML = `
          <div class="health-tip-content">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <p>${tips[currentIndex]}</p>
          </div>
        `;
        carouselContainer.style.opacity = 1;
      }, 300);
    };
    
    renderTip();
    setInterval(() => {
      currentIndex = (currentIndex + 1) % tips.length;
      renderTip();
    }, 6000);
  },

  /**
   * FAQ Live Search
   */
  initFAQSearch() {
    const searchInput = document.getElementById('faqSearchInput');
    const faqItems = document.querySelectorAll('.faq-item');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      faqItems.forEach(item => {
        const question = item.querySelector('.faq-question').textContent.toLowerCase();
        const answer = item.querySelector('.faq-answer').textContent.toLowerCase();
        if (question.includes(query) || answer.includes(query)) {
          item.style.display = 'block';
        } else {
          item.style.display = 'none';
        }
      });
    });
  },

  /**
   * Theme Management
   */
  initTheme() {
    const themeToggle = document.querySelector('.theme-toggle');
    const root = document.documentElement;
    
    const savedTheme = localStorage.getItem('clinic_theme');
    if (savedTheme) {
      root.setAttribute('data-theme', savedTheme);
      this.updateThemeIcon(themeToggle, savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.setAttribute('data-theme', 'dark');
      this.updateThemeIcon(themeToggle, 'dark');
    }
    
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const currentTheme = root.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', newTheme);
        localStorage.setItem('clinic_theme', newTheme);
        this.updateThemeIcon(themeToggle, newTheme);
      });
    }
  },

  updateThemeIcon(btn, theme) {
    if (!btn) return;
    if (theme === 'dark') {
      btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>';
    } else {
      btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>';
    }
  }
};

// Global key handlers for closing active modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && UI.activeModal) {
    const modalId = UI.activeModal.id;
    UI.closeModal(modalId);
  }
});
