# Enterprise360 – Advanced Business Management Platform

> **Frontend-Only** | HTML5 · CSS3 · JavaScript ES6+ · Bootstrap 5 · Chart.js

---

## 📌 Project Overview

Enterprise360 is a fully responsive, multi-module enterprise web application built entirely with frontend technologies. It simulates a real business management platform with role-based access, persistent data via Local Storage, interactive charts, drag-and-drop Kanban, and a beautiful dark/light theme.

---

## 🚀 Quick Start

1. **Open** `index.html` in a modern browser (Chrome, Firefox, Edge).
2. Click **"Launch App"** or use a demo credential below.
3. No build step, server, or installation required.

> ⚠️ Uses ES6 modules — must be served over HTTP (not `file://`).  
> Run with VS Code Live Server, or: `npx serve .`

---

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@enterprise360.com | admin123 |
| HR Manager | hr@enterprise360.com | hr123 |
| Project Manager | pm@enterprise360.com | pm123 |
| Employee | emp@enterprise360.com | emp123 |
| Finance Manager | finance@enterprise360.com | fin123 |

---

## 📦 Folder Structure

```
Enterprise360/
├── index.html                  ← Landing / Entry point
├── pages/
│   ├── login.html              ← Authentication
│   ├── register.html           ← User registration
│   ├── forgot-password.html    ← Password recovery UI
│   ├── dashboard.html          ← Main dashboard
│   ├── employees.html          ← HRMS – Employee management
│   ├── attendance.html         ← Attendance & leave management
│   ├── projects.html           ← Project management
│   ├── tasks.html              ← Kanban task board
│   ├── customers.html          ← CRM – Customer management
│   ├── finance.html            ← Finance, invoices & budget
│   ├── inventory.html          ← Inventory & stock management
│   ├── reports.html            ← Reports & analytics
│   ├── notifications.html      ← Notifications & communication
│   └── settings.html           ← Settings & customization
├── css/
│   └── style.css               ← Global styles, dark mode, all components
├── js/
│   ├── app.js                  ← Shared sidebar, topbar, page init
│   ├── auth.js                 ← Authentication logic
│   ├── storage.js              ← localStorage / sessionStorage wrappers
│   ├── utils.js                ← Utility functions
│   └── dashboard.js            ← Dashboard charts & widgets
├── data/
│   └── sample-data.json        ← Seed data for all modules
└── assets/
    ├── images/
    └── icons/
```

---

## 🧩 Modules

| # | Module | Features |
|---|--------|---------|
| 1 | **Auth** | Login, Register, Forgot Password, Role-based nav, Session handling |
| 2 | **Dashboard** | 6 KPI stat cards, Revenue/Expense bar chart, Project doughnut, Dept bar, Activity feed |
| 3 | **HRMS** | Add/Edit/Delete employees, table+grid views, search/filter/sort, profile photo upload, pagination |
| 4 | **Attendance** | Daily attendance, check-in/out, Leave application, approve/reject leaves |
| 5 | **Projects** | Create/manage projects, status/priority filters, progress tracking |
| 6 | **Tasks** | Drag-and-drop Kanban board (Todo / In Progress / Done), task CRUD |
| 7 | **CRM** | Customer & lead management, sales pipeline view, lead status tracking |
| 8 | **Finance** | Transactions, invoice creation with tax+discount calc, budget charts |
| 9 | **Inventory** | Product CRUD, stock levels, low-stock alerts, stock-in/out simulation |
| 10 | **Reports** | 5 report types with Chart.js charts, CSV export |
| 11 | **Notifications** | Toast notifications, announcement board, reminders, activity timeline |
| 12 | **Settings** | Profile editor, dark/light mode, accent color picker, password change, data export/reset |

---

## ⚙️ Advanced JavaScript Features

- ✅ ES6+ syntax (arrow functions, destructuring, template literals, spread)
- ✅ ES Modules (`import`/`export`)
- ✅ `Array.map()`, `filter()`, `find()`, `reduce()`, `sort()`
- ✅ DOM manipulation & dynamic HTML rendering
- ✅ Event delegation & bubbling
- ✅ Promises & `async`/`await`
- ✅ `try`/`catch` error handling
- ✅ Debouncing & throttling
- ✅ `localStorage` & `sessionStorage`
- ✅ Drag and drop (Kanban board)
- ✅ File upload & image preview (profile photos)
- ✅ Dynamic calculations (invoice totals, stats)
- ✅ Reusable utility functions (`utils.js`)
- ✅ Date and time operations (`formatDate`, `timeAgo`)

---

## 🎨 UI Features

- ✅ Fully responsive (mobile, tablet, desktop)
- ✅ Collapsible sidebar
- ✅ Dark / Light mode with persistence
- ✅ Accent color customization
- ✅ Bootstrap 5 modals, dropdowns, tooltips
- ✅ Tabs & accordions
- ✅ Pagination on all data tables
- ✅ Search, sort & filter on all lists
- ✅ Skeleton loading states
- ✅ Empty states
- ✅ Error & confirmation dialogs
- ✅ Toast notifications
- ✅ Interactive charts (Chart.js)
- ✅ Drag-and-drop Kanban
- ✅ Avatar with initials + photo upload
- ✅ Activity timeline

---

## 🧪 Testing Checklist

- [ ] All navigation links work correctly
- [ ] Login/logout with all 5 roles
- [ ] Add, edit, delete in every module
- [ ] Search, filter, and sort in tables
- [ ] Pagination works
- [ ] Kanban drag-and-drop
- [ ] Dark/light mode toggle and persistence
- [ ] Invoice total calculation (amount + tax - discount)
- [ ] Stock movement simulation
- [ ] Leave approval/rejection
- [ ] CSV export from Reports page
- [ ] Profile photo upload
- [ ] Data persists after page refresh
- [ ] Mobile responsive layout
- [ ] No browser console errors

---

## 🛠️ Technology Stack

| Technology | Usage |
|------------|-------|
| HTML5 | Semantic markup, structure |
| CSS3 | Custom properties, animations, responsive |
| JavaScript ES6+ | Modules, async/await, all logic |
| Bootstrap 5.3 | Layout, components, utilities |
| Bootstrap Icons 1.11 | Icon library |
| Chart.js 4.4 | Interactive charts |
| Local Storage | Data persistence |
| Session Storage | Session auth |

---

## 📋 Development Phases

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | HTML structure, CSS, Bootstrap layout | ✅ Done |
| 2 | Login, Dashboard, Sidebar | ✅ Done |
| 3 | HRMS and Employee Management | ✅ Done |
| 4 | Project Management and Kanban | ✅ Done |
| 5 | CRM and Customer Management | ✅ Done |
| 6 | Finance and Inventory | ✅ Done |
| 7 | Reports, Charts and Analytics | ✅ Done |
| 8 | Notifications and Settings | ✅ Done |
| 9 | Validation, testing and polish | 🔄 In Progress |
| 10 | GitHub and deployment | ⏳ Pending |

---

## ⚠️ Scope & Disclaimer

This is a **frontend-only** project. It uses:
- **Mock data** from `data/sample-data.json`
- **Browser storage** (localStorage / sessionStorage)
- **No real authentication** — credentials are compared locally
- **No real database**, backend, or server

Real authentication, email, database, payments, file storage, and multi-user sync require backend integration and are **outside this assignment's scope**.

---

*Built as part of the Enterprise Frontend Development curriculum.*
