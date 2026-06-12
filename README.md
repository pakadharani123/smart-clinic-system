# Smart Clinic Appointment & Patient Management System

A complete, production-ready healthcare management web application built strictly with HTML5, CSS3, and Vanilla JavaScript.

## Features

* **Complete Frontend Framework**: Built without React, Angular, Vue, or any external CSS libraries.
* **Responsive Design**: Flawless experience on Mobile, Tablet, and Desktop.
* **Premium UI/UX**: Dark mode, glassmorphism, smooth animations, and modern typography.
* **Appointment Booking System**: Multi-step validation, duplicate prevention, and unique ID generation.
* **Patient Dashboard**: Patients can search, view, and cancel their appointments.
* **Admin Dashboard**: Full CMS with visual charts, stats, and CRUD operations for appointments and patient records.
* **Data Persistence**: Uses HTML5 LocalStorage as a pseudo-database. No backend required to run.
* **Zero Dependencies**: Pure Vanilla JavaScript with zero external JS libraries. All charts are drawn using the native HTML5 Canvas API.

## File Structure

```
smart-clinic-system/
├── index.html              # Home page
├── about.html              # Doctor profile and timeline
├── services.html           # Services with live search filter
├── appointments.html       # Booking form with validation
├── patient-dashboard.html  # Patient portal
├── admin-dashboard.html    # Admin panel (password: admin123)
├── contact.html            # Contact form
├── css/
│   └── style.css           # Global design system & theme variables
├── js/
│   ├── app.js              # Shared UI components (navbar, toasts, modals)
│   ├── appointments.js     # Booking logic
│   ├── dashboard.js        # Patient search and cancellation
│   └── admin.js            # Admin charts, CRUD operations
└── assets/
    └── images/             # Images
```

## Setup Instructions

1. Clone or download the repository.
2. Ensure you have a modern web browser installed (Chrome, Firefox, Safari, Edge).
3. Using a local development server is highly recommended to ensure module loading and LocalStorage behaves correctly (though it will work just by double-clicking the HTML files in most browsers).
   * Easiest method: Use VS Code and the "Live Server" extension.
   * Alternatively, use Python: `python -m http.server 8000` or Node.js: `npx serve`.
4. Navigate to `index.html` to view the homepage.

## Admin Access
To access the admin dashboard functionalities, use the following credentials on the `/admin-dashboard.html` page:
* **Password:** `admin123`

## Technical Highlights

* **CSS Custom Properties**: Fully themeable CSS using variables for dark/light modes.
* **Intersection Observer**: Used for scroll-triggered animations and counter numbers.
* **HTML5 Canvas**: Custom-built bar charts for admin analytics.
* **LocalStorage API**: Complex relational data handling (Appointments linked to Patients).
* **Regex Validation**: Client-side form security for emails, phone numbers, and names.
