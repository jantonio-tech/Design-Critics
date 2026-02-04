# 🎨 Design Critics Tracker - UI/UX Specification

This document outlines the design, screens, and components for the Design Critics Tracker application.
*Note: Created as an alternative to `pencil-new.pen` (unavailable format).*

## 🎨 Visual Identity & Design System

- **Theme**: Light/Dark Mode support (System default or User toggle).
- **Primary Color**: Sky Blue (`hsl(199 89% 48%)`) / Dark Mode Cyan.
- **Typography**: `Inter` (Sans-serif).
- **Styling**: Tailwind CSS v4 + Shadcn UI (Radix Primitives).
- **Corner Radius**: Rounded-XL (`0.5rem` or `12px` for cards).

---

## 📱 Screens (Pantallas)

### 1. Login Screen
**Goal**: Simple, secure entry point ensuring corporate email usage.
- **Layout**: Centered Card on a gradient background.
- **Elements**:
  - Logo/Icon (Sparkles).
  - Title: "Design Critics".
  - Subtitle: "Gestión de sesiones de crítica de diseño".
  - Action: "Continuar con Google" (Button, full width).
  - Error Message: Red alert box for non-corporate emails.
- **Background**:
  - Light: Soft gradient `hsl(var(--primary) / 0.1)`.
  - Dark: Deep dark gradient.

### 2. Dashboard Personal (Home)
**Goal**: Overview of user's active Jira tickets and quick scheduling.
- **Header**: "Dashboard Personal" + Date/Welcome message.
- **Content**:
  - **Zero State**: Card saying "No tienes tickets activos asignados."
  - **Active State**: Grid of **Ticket Accordion** cards.
    - Each card shows Ticket ID, Summary, and a progress bar of critics performed.
    - **Quick Action**: "Agendar Hoy" button directly on the card if 0/2 critics.

### 3. Calendar View (Teams Timeline)
**Goal**: Visualise team workload and find open slots.
- **Layout**: 5-Column Grid (Monday - Friday).
- **Navigation**: "Previous Week", "Next Week", "Today" buttons.
- **Day Column**:
  - Header: Day Name (LUN) + Number (24). Highlight "Today" with a circle.
  - Body: Scrollable list of sessions.
- **Session Card (Calendar Item)**:
  - Color coded strip (Blue for Critic, Purple for DS Iteration).
  - Title: Flow Name (e.g., "Checkout V2").
  - Subtitle: Ticket ID (e.g., UX-123).
  - Hover Actions: Edit (Pencil), Delete (Trash) - only for owner.
- **Empty State**: "+ Agendar" ghost button in empty slots.

### 4. Create/Edit Session Modal
**Goal**: Detailed form to schedule a critic.
- **Trigger**: "Agendar" button or clicking empty calendar slot.
- **Type**: Dialog (Modal).
- **Fields**:
  - **Ticket**: Dropdown (Jira integration).
  - **Happy Path (Flow)**: Dropdown (Auto-fetched from Figma/Jira).
  - **Session Type**: Radio Cards (Design Critic, Iteración DS, Nuevo alcance).
    - Visual selection with icons/descriptions.
  - **Figma Link**: Auto-detected or manual input.
- **Validation**: Prevent scheduling if "Done" or max slots reached (logic dependent).

---

## 🧩 Components (Componentes)

### `Navbar`
- **Left**: Logo + Brand Name.
- **Right**:
  - **Theme Toggle**: Moon/Sun icon button (outline).
  - **User Profile**: Avatar + Name.
  - **Logout**: Subtle text link.
- **Behavior**: Sticky, backdrop-blur.

### `TicketAccordion`
- **State**: Collapsed by default.
- **Collapsed View**: Ticket Key, Product Badge, Summary, Progress Bar.
- **Expanded View**: Detailed list of "Happy Paths" active in that ticket with status indicators (Green/Yellow/Red).

### `CreateCriticsSession` (Form)
- **Logic**: Smart defaults based on selected ticket.
- **Fetching**: auto-retrieves Figma links from Jira description.

### `Badge`
- **Usage**: Product tags (PGH, Recadia, etc.).
- **Style**: Secondary variants, pill shape.

---

## 🛠️ Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| **Login** | ✅ Done | Google Auth Integrated |
| **Dashboard** | ✅ Done | Skeletons added |
| **Calendar** | ✅ Done | Grid layout |
| **Forms** | ✅ Done | Jira/Figma integration active |
| **Dark Mode** | ✅ Done | Tailwind `dark:` classes |
