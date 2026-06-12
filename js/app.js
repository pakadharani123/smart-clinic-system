/**
 * Smart Clinic Management System
 * Shared JavaScript Module (ES Module)
 */

import { UI } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Shared UI Components
  UI.initTheme();
  initNavbar();
  initScrollAnimations();
  initBackToTop();
  UI.updateClinicStatus();
  
  // Specific page components initialization based on elements present
  if (document.querySelector('.testimonial-slider')) {
    initTestimonialSlider();
  }
  
  if (document.querySelector('.faq-container')) {
    initAccordion();
    UI.initFAQSearch();
  }
  
  if (document.querySelector('.stats-grid')) {
    initCounters();
  }
  
  if (document.getElementById('healthTipsContainer')) {
    UI.initHealthTipsCarousel();
  }

  // Hide loader if present
  const loader = document.querySelector('.loader-wrapper');
  if (loader) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        loader.classList.add('hidden');
      }, 500);
    });
  }

  // Register PWA Service Worker
  registerServiceWorker();
  
  // Setup PWA Installation Prompt Promotion
  initPWAInstallPrompt();
});

// Expose UI methods on window for backward compatibility with inline HTML onclick handlers
window.showToast = (msg, type) => UI.showToast(msg, type);
window.openModal = (modalId, triggerEl) => UI.openModal(modalId, triggerEl);
window.closeModal = (modalId) => UI.closeModal(modalId);

/**
 * Navbar Scroll Effect & Mobile Menu
 */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }
  
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      const isExpanded = navLinks.classList.contains('active');
      hamburger.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
      
      const icon = isExpanded ? 
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' : 
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>';
      hamburger.innerHTML = icon;
    });
  }
}

/**
 * Intersection Observer for Scroll Animations
 */
function initScrollAnimations() {
  const elements = document.querySelectorAll('.animate-on-scroll');
  if (!elements.length) return;
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  }, {
    threshold: 0.05,
    rootMargin: "0px 0px -30px 0px"
  });
  
  elements.forEach(el => observer.observe(el));
}

/**
 * Animated Counters
 */
function initCounters() {
  const counters = document.querySelectorAll('.counter');
  let started = false;
  
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !started) {
      started = true;
      counters.forEach(counter => {
        const target = +counter.getAttribute('data-target');
        const duration = 2000; // ms
        const step = target / (duration / 16); // 60fps
        
        let current = 0;
        const updateCounter = () => {
          current += step;
          if (current < target) {
            counter.innerText = Math.ceil(current);
            requestAnimationFrame(updateCounter);
          } else {
            counter.innerText = target + (counter.getAttribute('data-plus') ? '+' : '');
          }
        };
        updateCounter();
      });
    }
  });
  
  const statsSection = document.querySelector('.stats');
  if (statsSection) {
    observer.observe(statsSection);
  }
}

/**
 * Testimonial Slider
 */
function initTestimonialSlider() {
  const track = document.querySelector('.testimonial-track');
  const slides = document.querySelectorAll('.testimonial-slide');
  const dotsContainer = document.querySelector('.slider-dots');
  
  if (!track || !slides.length || !dotsContainer) return;
  
  let currentIndex = 0;
  
  // Clear any existing dots
  dotsContainer.innerHTML = '';
  
  // Create dots
  slides.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.classList.add('dot');
    dot.setAttribute('role', 'button');
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goToSlide(i));
    dotsContainer.appendChild(dot);
  });
  
  const dots = document.querySelectorAll('.dot');
  
  function goToSlide(index) {
    currentIndex = index;
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach(d => d.classList.remove('active'));
    dots[index].classList.add('active');
  }
  
  // Auto slide
  setInterval(() => {
    let nextIndex = (currentIndex + 1) % slides.length;
    goToSlide(nextIndex);
  }, 6000);
}

/**
 * FAQ Accordion
 */
function initAccordion() {
  const items = document.querySelectorAll('.faq-item');
  
  items.forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      
      // Close all
      items.forEach(i => {
        i.classList.remove('active');
        i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      });
      
      // Open clicked if it wasn't already active
      if (!isActive) {
        item.classList.add('active');
        question.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/**
 * Back to Top Button
 */
function initBackToTop() {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  });
  
  btn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

/**
 * Register Service Worker for PWA
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then((reg) => {
          console.log('ServiceWorker registered successfully: ', reg.scope);
        })
        .catch((err) => {
          console.warn('ServiceWorker registration failed: ', err);
        });
    });
  }
}

/**
 * Setup install promotion trigger for PWA
 */
let deferredPrompt;
function initPWAInstallPrompt() {
  const installBtn = document.getElementById('pwaInstallBtn');
  if (!installBtn) return;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'inline-flex';
  });
  
  installBtn.addEventListener('click', () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the PWA install prompt');
      }
      deferredPrompt = null;
      installBtn.style.display = 'none';
    });
  });
  
  window.addEventListener('appinstalled', () => {
    console.log('App installed successfully');
    installBtn.style.display = 'none';
  });
}
