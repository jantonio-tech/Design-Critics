# Implementation Plan - Refactoring UI & Forms

The goal is to modernize the UI implementation by adopting Shadcn components fully, enforcing type safety and validation with Zod/React Hook Form, and cleaning up CSS redundancy.

## User Review Required
> [!IMPORTANT]
> This plan requires installing new dependencies: `react-hook-form`, `zod`, `@hookform/resolvers`.
> It also involves significant changes to `CreateCriticsSession.jsx` and `TicketAccordion.jsx`.

## Proposed Changes

### 1. Dependencies and Setup
- Install `react-hook-form`, `zod`, `@hookform/resolvers`.
- Ensure Shadcn `Select`, `Accordion`, `Form` components are properly set up (might need to create `form.jsx` wrapper if not present, but generic `Controller` usage works too). *Note: The user mentioned `Popover` and `DropdownMenu` as "unused opportunities", implying they might settle for standardizing existing ones first.*

### 2. Refactor TicketAccordion
#### [MODIFY] [TicketAccordion.jsx](file:///c:/Users/luigg/OneDrive/Documents/GitHub/Design-Critics/src/components/TicketAccordion.jsx)
- Replace manual `expanded` state with Shadcn's `<Accordion>` component.
- **Structure**:
  - `Accordion` (Root)
    - `AccordionItem` (value=ticket.key)
      - `AccordionTrigger` (Header info)
      - `AccordionContent` (Happy Paths list)

### 3. Refactor CreateCriticsSession (Form)
#### [MODIFY] [CreateCriticsSession.jsx](file:///c:/Users/luigg/OneDrive/Documents/GitHub/Design-Critics/src/components/CreateCriticsSession.jsx)
- **Validation**: Create a Zod schema for the form:
  - `ticket`: required string
  - `flow`: required string
  - `type`: enum (Design Critic, Iteración DS, Nuevo alcance)
  - `figmaLink`: optional url (but logic requires it for fetching)
- **State Management**: Replace `useState` form object with `useForm`.
- **UI Components**:
  - Replace native `<select>` with Shadcn `<Select>`.
  - Use `Controller` or `FormField` (if adding form component) to bind Shadcn components to RHF.

### 4. CSS & Tailwind Optimization
#### [MODIFY] [index.css](file:///c:/Users/luigg/OneDrive/Documents/GitHub/Design-Critics/src/index.css)
- Extract repetitive card/container classes into `@layer components` or custom utility classes if found to be consistently repeated (e.g., standard card padding, input base styles).

## Verification Plan

### Automated Tests
- Run `npm run build` to ensure no regression in build process.
- (Manual) Verify Validation works by trying to submit empty forms.

### Manual Verification
- **Accordion**: Check if expanding/collapsing works smoothly with the new animation.
- **Form**:
  - Check if "Happy Paths" dropdown populates correctly when a ticket is selected.
  - Check if "Session Type" selection works.
  - Verify Zod validation feedback (if UI allows).
