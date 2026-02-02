# IngressosZ - Event and Ticket Platform

![Status](https://img.shields.io/badge/Status-In_Development-yellow)
![License](https://img.shields.io/badge/License-MIT-blue)

**IngressosZ** is a complete platform for selling, managing, and validating event tickets. The system uses a modern serverless architecture with Firebase and a reactive frontend with React.

## 🚀 Implemented Features

### 👤 Users and Authentication
- **Login/Registration**: Email/Password authentication with Firebase Auth.
- **Profile Management**: View user data.
- **Access Control (RBAC)**:
  - `user`: Standard user (buys tickets).
  - `validator`: Permission to validate QR Codes.
  - `organizer`: Permission to create and manage events.
  - `admin`: Full access to the system.

### 📅 Event Management
- **Event Listing**: Grid view with filters for search, category, and date.
- **Event Details**: Dedicated page with information, map (descriptive), and ticket selection.
- **CRUD for Events**: Create, edit, and delete events (for Organizers/Admins).
- **Image Upload**: Integration with Firebase Storage for event covers.

### 🎟️ Ticket Purchase and Management
- **Transparent Checkout**: Integration with Mercado Pago (Webhooks implemented for automatic approval).
- **My Tickets**: Digital wallet with all purchased tickets.
- **Secure QR Code**: Generation of unique QR Codes with a security token to prevent fraud.
- **Ticket Status**: Real-time view (Valid, Used, Canceled).

### 📱 Ticket Validation (Validator App)
- **QR Code Scanner**: Reading via the device's camera.
- **Offline-First Validation**: Quick authenticity check.
- **Fraud Prevention**:
  - Verification of the token's digital signature.
  - Blocking of already used tickets.
  - Audit logs (who validated and when).

### 🛠️ Development Tools
- **DevPanel**: Floating panel for quick role switching (become Admin/Validator with one click).
- **Local Emulators**: Robust configuration to run Auth, Firestore, Functions, and Storage locally.
- **UI Skeletons**: Fluid loading with skeletons on all main pages.

---

## 🚧 What's Missing (Roadmap)

Below are the planned or necessary features to take the project to production:

### 🔴 Critical (High Priority)
1.  **Email Service**:
    - [ ] Send purchase confirmation with tickets attached (PDF or Link).
    - [ ] Send notifications for canceled/changed events.
2.  **Production Security**:
    - [ ] Configure Mercado Pago secrets in Firebase Secret Manager (currently in `.env`).
    - [ ] Review Firestore security rules for production (basic rules already exist).
3.  **Production URLs**:
    - [ ] Configure Mercado Pago Webhooks to point to the real Firebase Functions URL in production.

### 🟡 Improvements (Medium Priority)
4.  **Advanced Reports**:
    - [ ] Dashboard for organizers to see daily sales and total revenue.
    - [ ] Export participant list (Guest List).
5.  **Media Management**:
    - [ ] Implement automatic deletion of old images when deleting events.
    - [ ] Image optimization/compression on upload.
6.  **UX/UI**:
    - [ ] Infinite scrolling on the event list (currently loads all).
    - [ ] Advanced filters (price, geographic location).

### 🟢 Future (Low Priority)
7.  **Social**:
    - [ ] Event sharing.
    - [ ] Review and comment system.
8.  **Native App**:
    - [ ] Convert the validator to an installable PWA or React Native App.

---

## 💻 Technologies

### Frontend (`/ingressosZ`)
- **Core**: React 18, Vite, TypeScript.
- **Styling**: Tailwind CSS, shadcn/ui.
- **State/Data Fetching**: React Query (TanStack Query).
- **Routing**: React Router DOM v6.
- **Testing**: Vitest, React Testing Library.

### Backend (`/functions`)
- **Core**: Firebase Cloud Functions (Node.js 20).
- **Database**: Cloud Firestore (NoSQL).
- **Files**: Cloud Storage.
- **Payments**: Mercado Pago SDK.

---

## 🚀 How to Run the Project

### Prerequisites
- Node.js 20+
- Java (for Firebase emulators)
- Firebase CLI (`npm install -g firebase-tools`)

### Quick Installation

1.  **Install Dependencies (Root, Front, and Back)**
    ```bash
    npm run install:all
    ```

2.  **Configure Variables**
    - Copy `.env.example` to `ingressosZ/.env.local` and fill in the Firebase keys.

3.  **Start Development Environment**
    ```bash
    npm run dev
    ```
    - **Frontend**: `http://localhost:5173`
    - **Emulators**: `http://localhost:4000`
    - **Local API**: `http://127.0.0.1:5001/...`

---

## 📂 Folder Structure

```
/
├── functions/              # Backend (Cloud Functions)
│   ├── src/
│   │   ├── index.ts        # Entrypoint (Webhooks, Triggers)
│   │   └── ...
├── ingressosZ/             # Frontend (React)
│   ├── src/
│   │   ├── components/     # Reusable Components (UI, Events, Tickets)
│   │   ├── hooks/          # Custom logic (useAuth, useEvents)
│   │   ├── pages/          # Application routes
│   │   ├── services/       # Communication with Firebase/API
│   │   └── ...
├── firestore.rules         # Database security rules
├── storage.rules           # File security rules
└── firebase.json           # Emulator configuration
```

---

Made with ❤️ by Lucas Vilhena & Trae AI.
