# 📋 Design System - Design Critics Tracker
## Análisis Completo del Sistema de Diseño

**Fecha de análisis:** 2026-02-03
**Proyecto:** Design-Critics
**Ubicación:** `C:\Users\luigg\OneDrive\Documents\GitHub\Design-Critics`

---

## 📋 Información del Proyecto

- **Framework:** React + Vite
- **UI Library:** shadcn/ui (Radix UI + class-variance-authority)
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Notifications:** Sonner (toast library)
- **State Management:** React useState/useEffect (no Redux/Context API)
- **Backend:** Firebase (Auth + Firestore)
- **APIs:** Jira API, Figma API

---

## 🎨 Variables y Tokens de Diseño

### Colores (HSL Format)

#### Light Mode
```css
--background: 0 0% 100%;              /* #FFFFFF - Fondo principal */
--foreground: 222.2 84% 4.9%;         /* #020817 - Texto principal */
--card: 0 0% 100%;                    /* #FFFFFF - Fondo de tarjetas */
--card-foreground: 222.2 84% 4.9%;    /* #020817 - Texto en tarjetas */
--popover: 0 0% 100%;                 /* #FFFFFF - Fondo de popovers */
--popover-foreground: 222.2 84% 4.9%; /* #020817 - Texto en popovers */
--primary: 199 89% 48%;               /* #0BA5EC - Color primario Sky Blue */
--primary-foreground: 210 40% 98%;    /* #F8FAFC - Texto sobre primario */
--secondary: 210 40% 96.1%;           /* #F1F5F9 - Color secundario */
--secondary-foreground: 222.2 47.4% 11.2%; /* #0F172A - Texto sobre secundario */
--muted: 210 40% 96.1%;               /* #F1F5F9 - Elementos silenciados */
--muted-foreground: 215.4 16.3% 46.9%; /* #64748B - Texto silenciado */
--accent: 210 40% 96.1%;              /* #F1F5F9 - Color de acento */
--accent-foreground: 222.2 47.4% 11.2%; /* #0F172A - Texto sobre acento */
--destructive: 0 84.2% 60.2%;         /* #EF4444 - Color destructivo (rojo) */
--destructive-foreground: 210 40% 98%; /* #F8FAFC - Texto sobre destructivo */
--border: 214.3 31.8% 91.4%;          /* #E2E8F0 - Bordes */
--input: 214.3 31.8% 91.4%;           /* #E2E8F0 - Bordes de inputs */
--ring: 199 89% 48%;                  /* #0BA5EC - Ring de enfoque */
```

#### Dark Mode
```css
--background: 222.2 84% 4.9%;         /* #020817 - Fondo principal oscuro */
--foreground: 210 40% 98%;            /* #F8FAFC - Texto claro */
--card: 222.2 84% 4.9%;               /* #020817 - Fondo de tarjetas */
--card-foreground: 210 40% 98%;       /* #F8FAFC - Texto en tarjetas */
--popover: 222.2 84% 4.9%;            /* #020817 - Fondo de popovers */
--popover-foreground: 210 40% 98%;    /* #F8FAFC - Texto en popovers */
--primary: 199 89% 48%;               /* #0BA5EC - Mismo Sky Blue */
--primary-foreground: 222.2 47.4% 11.2%; /* #0F172A - Texto oscuro sobre primario */
--secondary: 217.2 32.6% 17.5%;       /* #1E293B - Secundario oscuro */
--secondary-foreground: 210 40% 98%;  /* #F8FAFC - Texto claro */
--muted: 217.2 32.6% 17.5%;           /* #1E293B - Silenciado oscuro */
--muted-foreground: 215 20.2% 65.1%;  /* #94A3B8 - Texto silenciado claro */
--accent: 217.2 32.6% 17.5%;          /* #1E293B - Acento oscuro */
--accent-foreground: 210 40% 98%;     /* #F8FAFC - Texto claro */
--destructive: 0 62.8% 30.6%;         /* #991B1B - Destructivo oscuro */
--destructive-foreground: 210 40% 98%; /* #F8FAFC - Texto claro */
--border: 217.2 32.6% 17.5%;          /* #1E293B - Bordes oscuros */
--input: 217.2 32.6% 17.5%;           /* #1E293B - Bordes de inputs oscuros */
--ring: 199 89% 48%;                  /* #0BA5EC - Ring de enfoque */
```

#### Colores de Gráficas
```css
/* Light Mode */
--chart-1: 12 76% 61%;   /* Naranja */
--chart-2: 173 58% 39%;  /* Verde azulado */
--chart-3: 197 37% 24%;  /* Azul oscuro */
--chart-4: 43 74% 66%;   /* Amarillo */
--chart-5: 27 87% 67%;   /* Naranja claro */

/* Dark Mode */
--chart-1: 220 70% 50%;  /* Azul */
--chart-2: 160 60% 45%;  /* Verde */
--chart-3: 30 80% 55%;   /* Naranja */
--chart-4: 280 65% 60%;  /* Púrpura */
--chart-5: 340 75% 55%;  /* Rosa */
```

### Tipografía

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
```

**Pesos de fuente usados:**
- `400` - Normal (body text)
- `500` - Medium (labels, badges)
- `600` - Semibold (card titles, section headers)
- `700` - Bold (page headers, important text)

**Tamaños comunes:**
- `text-xs` - 12px (badges, meta info)
- `text-sm` - 14px (body text, labels)
- `text-base` - 16px (inputs, buttons)
- `text-lg` - 18px (dialog titles)
- `text-xl` - 20px (section headers)
- `text-2xl` - 24px (day numbers in calendar)
- `text-3xl` - 30px (page headers on desktop)

### Border Radius

```css
--radius: 0.5rem; /* 8px - Base radius */
--radius-sm: calc(var(--radius) - 4px);  /* 4px */
--radius-md: calc(var(--radius) - 2px);  /* 6px */
--radius-lg: var(--radius);              /* 8px */
--radius-xl: calc(var(--radius) + 4px);  /* 12px */
```

**Uso:**
- `rounded-md` - 6px (inputs, buttons estándar)
- `rounded-lg` - 8px (cards, dialogs)
- `rounded-xl` - 12px (cards especiales, day columns)
- `rounded-2xl` - 16px (login card, logo icons)
- `rounded-full` - 9999px (avatars, badges pill, today circle)

### Spacing & Layout

**Container:**
- Max width: `max-w-7xl` (1280px)
- Padding mobile: `px-4 py-4`
- Padding desktop: `px-6 py-6` (768px+)

**Grid Breakpoints:**
- `sm:` - 640px
- `md:` - 768px
- `lg:` - 1024px
- `xl:` - 1280px

---

## 🧩 Componentes Base (shadcn/ui)

### 1. Button
**Ubicación:** `src/components/ui/button.jsx`

**Variantes:**
- `default` (primary) - Fondo primario con sombra
- `destructive` - Fondo destructivo (rojo)
- `outline` - Borde con fondo transparente
- `secondary` - Fondo secundario
- `ghost` - Sin fondo, solo hover
- `link` - Estilo de enlace con underline

**Tamaños:**
- `default` - h-9 (36px), px-4 py-2
- `sm` - h-8 (32px), px-3, text-xs
- `lg` - h-10 (40px), px-8
- `icon` - h-9 w-9 (cuadrado)

**Props especiales:**
- `asChild` - Usa Radix Slot para composición

**Ejemplo de uso real:**
```jsx
// De App.jsx línea 385
<Button
    type="submit"
    disabled={detectingLink || !formData.ticket || !formData.flow}
>
    {initialData?.id ? 'Guardar Cambios' : 'Agendar'}
</Button>

// De App.jsx línea 252
<Button variant="outline" size="sm" onClick={handleToday}>Hoy</Button>
```

---

### 2. Card
**Ubicación:** `src/components/ui/card.jsx`

**Sub-componentes:**
- `Card` - Contenedor principal (rounded-xl, border, shadow)
- `CardHeader` - flex flex-col space-y-1.5 p-6
- `CardTitle` - font-semibold leading-none tracking-tight
- `CardDescription` - text-sm text-muted-foreground
- `CardContent` - p-6 pt-0
- `CardFooter` - flex items-center p-6 pt-0

**Ejemplo de uso real:**
```jsx
// De App.jsx línea 157
<Card>
    <CardContent className="p-6">
        <p className="text-muted-foreground">No tienes tickets activos asignados.</p>
    </CardContent>
</Card>
```

---

### 3. Badge
**Ubicación:** `src/components/ui/badge.jsx`

**Variantes:**
- `default` - bg-primary text-primary-foreground
- `secondary` - bg-secondary text-secondary-foreground
- `destructive` - bg-destructive text-destructive-foreground
- `outline` - text-foreground (solo borde)
- `success` - bg-green-100 text-green-800 (custom)
- `warning` - bg-yellow-100 text-yellow-800 (custom)

**Estilo base:** `rounded-md px-2.5 py-0.5 text-xs font-semibold`

**Ejemplo de uso real:**
```jsx
// De TicketAccordion.jsx línea 110
<Badge variant="secondary" className="text-xs">
    {product}
</Badge>
```

---

### 4. Input
**Ubicación:** `src/components/ui/input.jsx`

**Props:**
- `type` - Tipo de input (text, email, password, etc.)
- `className` - Clases adicionales

**Estilo base:**
- h-9 (36px height)
- rounded-md
- border border-input
- px-3 py-1
- text-base (mobile), text-sm (desktop)
- shadow-sm
- focus:ring-1 focus:ring-ring

**Ejemplo de uso real:**
```jsx
// Usado en CreateCriticsSession.jsx (formularios)
<input
    type="text"
    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1..."
    placeholder="Placeholder text..."
/>
```

---

### 5. Label
**Ubicación:** `src/components/ui/label.jsx`

**Estilo:** `text-sm font-medium leading-none`

**Ejemplo de uso real:**
```jsx
// De CreateCriticsSession.jsx línea 203
<Label className="text-sm font-medium">
    Ticket de Jira <span className="text-destructive">*</span>
</Label>
```

---

### 6. Accordion
**Ubicación:** `src/components/ui/accordion.jsx`

**Sub-componentes:**
- `Accordion` - Root (Radix Accordion.Root)
- `AccordionItem` - Item con border-b
- `AccordionTrigger` - Trigger con ChevronDown automático
- `AccordionContent` - Content con animación

**Animación:** Usa `data-[state=open]:animate-accordion-down`

**Ejemplo de uso real:**
```jsx
// Usado en TicketAccordion.jsx (componente custom que simula accordion)
// Usa Card + manual expand/collapse en vez del Accordion de shadcn
```

---

### 7. Dialog
**Ubicación:** `src/components/ui/dialog.jsx`

**Sub-componentes:**
- `Dialog` - Root
- `DialogTrigger` - Trigger
- `DialogPortal` - Portal
- `DialogOverlay` - Overlay oscuro (bg-black/80)
- `DialogContent` - Contenido centrado con animación
- `DialogHeader` - Header con espacio
- `DialogFooter` - Footer con botones
- `DialogTitle` - Título (text-lg font-semibold)
- `DialogDescription` - Descripción (text-sm text-muted-foreground)
- `DialogClose` - Close button (X icon en top-right)

**Ejemplo de uso real:**
```jsx
// De App.jsx línea 318
<Dialog open={modalOpen} onOpenChange={setModalOpen}>
    <DialogContent className="max-w-lg">
        <DialogHeader>
            <DialogTitle>{editingDC?.id ? 'Editar Sesión' : 'Nueva Sesión'}</DialogTitle>
        </DialogHeader>
        <CreateCriticsSession ... />
    </DialogContent>
</Dialog>
```

---

### 8. AlertDialog
**Ubicación:** `src/components/ui/alert-dialog.jsx`

**Sub-componentes:**
- `AlertDialog` - Root
- `AlertDialogTrigger` - Trigger
- `AlertDialogPortal` - Portal
- `AlertDialogOverlay` - Overlay
- `AlertDialogContent` - Contenido
- `AlertDialogHeader` - Header
- `AlertDialogFooter` - Footer con botones
- `AlertDialogTitle` - Título
- `AlertDialogDescription` - Descripción
- `AlertDialogAction` - Botón de acción (usa buttonVariants)
- `AlertDialogCancel` - Botón de cancelar (variant outline)

**Ejemplo de uso real:**
```jsx
// De App.jsx línea 540
<AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
    <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar sesión?</AlertDialogTitle>
            <AlertDialogDescription>
                Esta acción no se puede deshacer.
            </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
        </AlertDialogFooter>
    </AlertDialogContent>
</AlertDialog>
```

---

### 9. Select
**Ubicación:** `src/components/ui/select.jsx`

**Sub-componentes:**
- `Select` - Root
- `SelectGroup` - Group
- `SelectValue` - Value display
- `SelectTrigger` - Trigger con ChevronDown
- `SelectContent` - Dropdown content (animado)
- `SelectLabel` - Label en grupo
- `SelectItem` - Item con Check icon cuando seleccionado
- `SelectSeparator` - Separador
- `SelectScrollUpButton` - Scroll up
- `SelectScrollDownButton` - Scroll down

**Ejemplo de uso real:**
```jsx
// En CreateCriticsSession.jsx se usa <select> nativo en vez de este componente
// El componente Select de shadcn está disponible pero no se usa actualmente
```

---

### 10. Tabs
**Ubicación:** `src/components/ui/tabs.jsx`

**Variantes:**
- `default` - Fondo muted con tabs como pills
- `line` - Sin fondo, con línea inferior en active

**Sub-componentes:**
- `Tabs` - Root
- `TabsList` - Lista de tabs con variant
- `TabsTrigger` - Trigger individual
- `TabsContent` - Contenido de cada tab

**Ejemplo de uso real:**
```jsx
// De App.jsx línea 495
<Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
    <TabsList variant="line" className="mb-6">
        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        <TabsTrigger value="calendar">Calendario</TabsTrigger>
    </TabsList>
    <TabsContent value="dashboard" className="mt-0">
        <DashboardPage ... />
    </TabsContent>
    <TabsContent value="calendar" className="mt-0">
        <CalendarPage ... />
    </TabsContent>
</Tabs>
```

---

### 11. Avatar
**Ubicación:** `src/components/ui/avatar.jsx`

**Sub-componentes:**
- `Avatar` - Contenedor (h-10 w-10 rounded-full por defecto)
- `AvatarImage` - Imagen
- `AvatarFallback` - Fallback con bg-muted

**Ejemplo de uso real:**
```jsx
// De App.jsx línea 54
<Avatar className="h-8 w-8">
    {user.picture ? (
        <AvatarImage src={user.picture} alt={user.name} />
    ) : null}
    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
        {user.initials}
    </AvatarFallback>
</Avatar>
```

---

### 12. Textarea
**Ubicación:** `src/components/ui/textarea.jsx`

**Estilo:**
- min-h-[60px]
- rounded-md
- border border-input
- px-3 py-2
- text-base (mobile), text-sm (desktop)

**Ejemplo de uso real:**
```jsx
// Disponible pero no usado actualmente en el proyecto
```

---

### 13. Skeleton
**Ubicación:** `src/components/ui/skeleton.jsx`

**Estilo:** `animate-pulse rounded-md bg-muted`

**Ejemplo de uso real:**
```jsx
// De TicketSkeleton.jsx
<Skeleton className="h-3 w-16" />
<Skeleton className="h-5 w-20 rounded-full" />
<Skeleton className="h-5 w-3/4 mb-3" />
```

---

### 14. Toaster (Sonner)
**Ubicación:** `src/components/ui/sonner.jsx`

**Wrapper para:** Sonner library

**Configuración:**
```jsx
toastOptions={{
    classNames: {
        toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground...",
        description: "group-[.toast]:text-muted-foreground",
        actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
        cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
    },
}}
```

**Ejemplo de uso real:**
```jsx
// De App.jsx línea 486
<Toaster position="top-right" richColors />

// De App.jsx línea 339
toast.success('Sesión actualizada correctamente');
toast.error('Error al eliminar la sesión');
```

---

## 🎯 Componentes Específicos de la Aplicación

### 1. TicketSkeleton
**Ubicación:** `src/components/skeletons/TicketSkeleton.jsx`

**Propósito:** Loading state para tarjetas de tickets en el dashboard

**Composición:**
```jsx
<Card className="transition-all">
    <CardHeader className="p-4 pb-3">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-16" />  {/* Ticket key */}
                <Skeleton className="h-5 w-20 rounded-full" />  {/* Product badge */}
            </div>
            <Skeleton className="h-5 w-5" />  {/* Chevron icon */}
        </div>
        <Skeleton className="h-5 w-3/4 mb-3" />  {/* Summary */}
        <div className="space-y-2">
            <div className="flex justify-between">
                <Skeleton className="h-3 w-24" />  {/* Progress text */}
                <Skeleton className="h-3 w-12" />  {/* HP count */}
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />  {/* Progress bar */}
        </div>
    </CardHeader>
</Card>
```

**Componentes usados:**
- Card, CardHeader (shadcn/ui)
- Skeleton (shadcn/ui)

**Visual:** Simula exactamente la estructura de TicketAccordion en estado colapsado

---

### 2. CreateCriticsSession
**Ubicación:** `src/components/CreateCriticsSession.jsx`

**Propósito:** Formulario para crear/editar sesiones de crítica de diseño

**Props:**
- `onSubmit` - Callback al enviar
- `onClose` - Callback al cerrar
- `initialData` - Datos iniciales para edición
- `user` - Usuario actual
- `activeTickets` - Array de tickets activos
- `sessions` - Array de sesiones existentes
- `readOnlyFields` - Array de campos bloqueados ['ticket', 'product', 'flow']
- `excludeTypes` - Array de tipos a excluir ['Iteración DS']

**Campos del formulario:**
1. **Ticket de Jira** (select) - Dropdown con tickets activos
   - Usa `<select>` nativo con estilos custom
   - Auto-detecta producto del summary del ticket
   - Llama a API `/api/get-jira-field` para obtener Figma link

2. **Happy Path** (select) - Dropdown con HPs de Figma
   - Solo aparece si hay figmaLink
   - Usa hook custom `useHappyPaths(figmaLink)`
   - Carga frames que empiezan con "HP-"

3. **Tipo de sesión** (radio cards) - Radio buttons estilizados
   - "Design Critic" - Primera revisión
   - "Iteración DS" - Revisión de cambios
   - "Nuevo alcance" - Solo si ya existe Design Critic previo

**Componentes usados:**
- Button (shadcn/ui)
- Label (shadcn/ui)
- Icons: Loader2, AlertTriangle, RefreshCw (lucide-react)

**Lógica especial:**
- Auto-detección de producto desde ticket summary
- Fetching automático de Figma link desde Jira
- Loading de Happy Paths desde Figma API
- Validación de "Nuevo alcance" (solo si existe Design Critic previo)
- Campos readonly según `readOnlyFields` prop

**Estados visuales:**
- Loading de Figma link (Loader2)
- Error si no hay Figma link (AlertTriangle amarillo)
- Loading de Happy Paths (Loader2)
- Error si no hay HP frames (mensaje rojo + botón Reintentar)

**Ejemplo de uso:**
```jsx
<CreateCriticsSession
    sessions={dcs}
    onSubmit={handleSaveDC}
    onClose={() => setModalOpen(false)}
    initialData={editingDC}
    user={user}
    activeTickets={activeTickets}
    readOnlyFields={editingDC?.simplifiedMode ? (editingDC.lockFlow ? ['ticket', 'product', 'flow'] : ['ticket', 'product']) : []}
    excludeTypes={editingDC?.excludeTypes || []}
/>
```

---

### 3. TicketAccordion
**Ubicación:** `src/components/TicketAccordion.jsx`

**Propósito:** Acordeón expandible que muestra un ticket de Jira con sus Happy Paths y progreso

**Props:**
- `ticket` - Objeto de ticket de Jira
- `sessions` - Array de sesiones agendadas
- `onSchedule` - Callback para agendar nueva sesión

**Estado interno:**
- `expanded` - Boolean para expandir/colapsar
- `figmaLink` - Link de Figma del ticket (fetched)

**Composición:**

**Header (siempre visible):**
```jsx
<Card>
    <CardHeader onClick={() => setExpanded(!expanded)}>
        {/* Top row: Ticket key + Product badge + Chevron */}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">{ticket.key}</span>
                <Badge variant="secondary">{product}</Badge>
            </div>
            <ChevronDown/ChevronUp />
        </div>

        {/* Summary */}
        <h3 className="text-sm font-semibold">{ticket.summary}</h3>

        {/* Progress */}
        <div className="space-y-1">
            <span>{totalCriticsDone}/{maxCritics} Critics ({happyPaths.length} HPs)</span>
            <div className="h-1.5 bg-muted rounded-full">
                <div className="h-full bg-primary rounded-full" style={{width: `${progressPercent}%`}} />
            </div>
        </div>

        {/* Quick action button (solo cuando collapsed) */}
        {!expanded && (
            <Button onClick={() => onSchedule(...)}>Agendar Hoy</Button>
        )}
    </CardHeader>
</Card>
```

**Body (cuando expanded):**
```jsx
<CardContent className="border-t bg-muted/30">
    <h4>Detalle de Happy Paths</h4>

    {/* Loading state */}
    {loadingHPs && <Loader2 />}

    {/* Empty state */}
    {!loadingHPs && happyPaths.length === 0 && (
        <div>
            <p>No se detectaron frames "HP-"...</p>
            <Button>Agendar Manualmente</Button>
        </div>
    )}

    {/* Happy Paths list */}
    <div>
        {happyPaths.map(hp => (
            <div key={hp.id}>
                <div>
                    <span>{hp.name}</span>
                    <span className={statusColor}>{status.label}</span>
                    {/* Ej: "2/2 Critics (Límite)" */}
                </div>
                <Button onClick={() => onSchedule(...)}>Agendar Hoy</Button>
            </div>
        ))}
    </div>
</CardContent>
```

**Lógica de progreso:**
- Calcula critics done por flow con lógica de reset por "Nuevo alcance"
- Max critics = happyPaths.length * 2
- Status colors:
  - Verde: 0-1 critics (good)
  - Amarillo: 2 critics (warning - límite)
  - Rojo: 3+ critics (danger - excedido)

**Auto-detección de producto:**
```javascript
const getProductBadge = (ticket) => {
    const summaryUpper = (ticket.summary || '').toUpperCase();
    if (summaryUpper.includes('PGH')) return 'PGH';
    if (summaryUpper.includes('RECADIA')) return 'Recadia';
    if (summaryUpper.includes('CAMBIO SEGURO')) return 'Cambio Seguro';
    if (summaryUpper.includes('FACTORING')) return 'Factoring';
    if (summaryUpper.includes('GESTORA')) return 'Gestora';
    if (summaryUpper.includes('TRANSVERSAL')) return 'Transversal';
    return 'Producto';
};
```

**Componentes usados:**
- Card, CardContent, CardHeader (shadcn/ui)
- Badge (shadcn/ui)
- Button (shadcn/ui)
- Icons: ChevronDown, ChevronUp, Loader2 (lucide-react)

**Hook custom:**
- `useHappyPaths(figmaLink)` - Carga HPs desde Figma

---

## 📱 Layouts y Patrones

### 1. Navbar Pattern
**Ubicación:** App.jsx línea 35-72

**Estructura:**
```jsx
<nav className="navbar">  {/* sticky top-0 z-50 backdrop-blur-xl */}
    <div className="navbar-content">  {/* max-w-7xl mx-auto flex justify-between */}
        {/* Left: Logo */}
        <div className="logo">
            <div className="logo-icon">
                <Sparkles />
            </div>
            Design Critics
        </div>

        {/* Right: Theme toggle + Avatar + User info */}
        <div className="user-info">
            <Button variant="outline" size="icon" onClick={toggleDarkMode}>
                {darkMode ? <Sun /> : <Moon />}
            </Button>
            <Avatar>
                <AvatarImage src={user.picture} />
                <AvatarFallback>{user.initials}</AvatarFallback>
            </Avatar>
            <div className="user-text">
                <div className="user-name">{user.name}</div>
                <button className="logout-btn">Salir</button>
            </div>
        </div>
    </div>
</nav>
```

**Clases CSS custom:**
```css
.navbar {
    @apply bg-background/80 backdrop-blur-xl border-b border-border sticky top-0 z-50 shadow-sm;
}

.navbar-content {
    @apply max-w-7xl mx-auto flex justify-between items-center px-4 py-3;
}
```

---

### 2. Login Page Pattern
**Ubicación:** App.jsx línea 74-131

**Estructura:**
```jsx
<div className="login-container">  {/* min-h-screen flex items-center justify-center */}
    <Card className="login-card border-0">
        <CardContent className="p-8 sm:p-12">
            <div className="login-icon">  {/* w-16 h-16 bg-primary rounded-2xl */}
                <Sparkles />
            </div>
            <h1 className="login-title">Design Critics</h1>
            <p className="login-subtitle">Gestión de sesiones de crítica de diseño</p>
            {error && <div className="login-error">{error}</div>}
            <Button className="w-full text-base py-6">
                Continuar con Google
            </Button>
        </CardContent>
    </Card>
</div>
```

**Background gradient:**
```css
.login-container {
    background: linear-gradient(135deg, hsl(var(--primary) / 0.1) 0%, hsl(280 70% 95%) 50%, hsl(var(--primary) / 0.05) 100%);
}

.dark .login-container {
    background: linear-gradient(135deg, hsl(var(--background)) 0%, hsl(217 32.6% 10%) 100%);
}
```

---

### 3. Dashboard Grid Pattern
**Ubicación:** App.jsx línea 135-180

**Estructura:**
```jsx
<div className="container">
    <div className="page-header">
        <h1>Dashboard Personal</h1>
        <p>Tus tickets activos en Jira</p>
    </div>

    <div className="dashboard-grid">  {/* grid grid-cols-1 lg:grid-cols-2 gap-4 */}
        {activeTickets.length === 0 ? (
            <Card>
                <CardContent>
                    <p className="text-muted-foreground">No tienes tickets activos asignados.</p>
                </CardContent>
            </Card>
        ) : activeTickets.map(ticket => (
            <TicketAccordion key={ticket.key} ticket={ticket} ... />
        ))}
    </div>
</div>
```

---

### 4. Calendar Grid Pattern
**Ubicación:** App.jsx línea 182-351

**Estructura:**
```jsx
<div className="container">
    {/* Header with navigation */}
    <div className="calendar-header-bar">
        <div className="calendar-nav-group">
            <h1>Calendario</h1>
            <Button onClick={handleToday}>Hoy</Button>
            <div className="nav-arrows">
                <button onClick={handlePrevWeek}>‹</button>
                <button onClick={handleNextWeek}>›</button>
            </div>
        </div>
        <span className="current-month-label">{monthYear}</span>
    </div>

    {/* 5-column grid (Monday-Friday) */}
    <div className="gcal-grid">  {/* grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 */}
        {weekDays.map((date, i) => (
            <div key={i} className={`day-column ${today ? 'is-today' : ''}`}>
                {/* Day header */}
                <div className="day-header-gcal">
                    <div className="day-name">LUN</div>
                    <div className={today ? 'today-circle' : 'day-number'}>24</div>
                </div>

                {/* Day body with sessions */}
                <div className="day-body" onClick={() => handleCellClick(date)}>
                    {dayDCs.map(dc => (
                        <div key={dc.id} className="dc-card-gcal">
                            <div className="dc-card-stripe" style={{background: color}} />
                            <div className="dc-card-content">
                                <div className="dc-gcal-title">{dc.flow}</div>
                                <div className="dc-gcal-time">{dc.ticket}</div>
                                <div className="dc-gcal-actions">
                                    <button className="tiny-btn">✎</button>
                                    <button className="tiny-btn">×</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <button className="btn-add-gcal">+ Agendar</button>
                </div>
            </div>
        ))}
    </div>
</div>
```

**Color coding:**
- Design Critic: #0ea5e9 (cyan/sky blue)
- Iteración DS: #6366f1 (indigo/purple)

**Clases CSS custom:**
```css
.gcal-grid {
    @apply grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4;
}

.day-column {
    @apply bg-card rounded-xl border border-border min-h-[300px] max-h-[500px] flex flex-col overflow-hidden;
}

.day-column.is-today {
    @apply ring-2 ring-primary ring-offset-2 ring-offset-background;
}

.today-circle {
    @apply bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center mx-auto;
}

.dc-card-stripe {
    @apply absolute left-0 top-0 bottom-0 w-1;
}
```

---

### 5. Modal/Dialog Pattern
**Ubicación:** App.jsx línea 318-348, 522-538, 540-559

**3 tipos de modales:**

**a) Form Dialog (para crear/editar)**
```jsx
<Dialog open={modalOpen} onOpenChange={setModalOpen}>
    <DialogContent className="max-w-lg">
        <DialogHeader>
            <DialogTitle>{editingDC?.id ? 'Editar Sesión' : 'Nueva Sesión'}</DialogTitle>
        </DialogHeader>
        <CreateCriticsSession
            initialData={editingDC}
            onClose={() => setModalOpen(false)}
            onSubmit={handleSubmit}
            ...
        />
    </DialogContent>
</Dialog>
```

**b) Alert Dialog (para confirmar eliminación)**
```jsx
<AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
    <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar sesión?</AlertDialogTitle>
            <AlertDialogDescription>
                Esta acción no se puede deshacer.
            </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
        </AlertDialogFooter>
    </AlertDialogContent>
</AlertDialog>
```

---

### 6. Skeleton Loading Pattern
**Ubicación:** TicketSkeleton.jsx

**Uso:**
```jsx
{isLoading ? (
    <TicketSkeleton />
    <TicketSkeleton />
    <TicketSkeleton />
) : (
    tickets.map(ticket => <TicketAccordion key={ticket.key} ticket={ticket} />)
)}
```

---

### 7. Toast Notifications Pattern
**Ubicación:** App.jsx (varios lugares)

**Uso:**
```jsx
// Success
toast.success('Sesión agendada correctamente');
toast.success('Sesión actualizada correctamente');
toast.success('Sesión eliminada correctamente');

// Error
toast.error('Error al eliminar la sesión');
```

**Posición:** top-right
**Tipo:** richColors (colored backgrounds)

---

## 🔗 Integraciones

### 1. Firebase Auth
**Archivo:** `src/utils/firebase.js`

**Uso:**
- Google Sign-In con dominio @prestamype.com
- Persistencia de sesión
- onAuthStateChanged listener

**Validación:**
```javascript
if (!firebaseUser.email.endsWith('@prestamype.com')) {
    await firebase.auth().signOut();
    // Muestra error
}
```

### 2. Firestore Database
**Archivo:** `src/services/data.js`

**Collections:**
- `all` - Sesiones públicas/compartidas
- `users/{email}/critics` - Sesiones personales del usuario

**Operaciones:**
- `readAll()` - Lee sesiones públicas
- `readUserHistory()` - Lee sesiones del usuario
- `create(data)` - Crea nueva sesión
- `update(data)` - Actualiza sesión
- `delete(id)` - Elimina sesión

### 3. Jira API
**Endpoint:** `/api/search-jira` (Vercel Serverless Function)

**Request:**
```json
{
    "userEmail": "user@prestamype.com"
}
```

**Response:**
```json
{
    "success": true,
    "tickets": [
        {
            "key": "UX-123",
            "summary": "PGH: Implement new checkout flow",
            "status": { "name": "In Progress", "statusCategory": { "key": "indeterminate" } },
            "statusCategory": { "key": "indeterminate" }
        }
    ]
}
```

**Endpoint:** `/api/get-jira-field` (Vercel Serverless Function)

**Request:**
```json
{
    "ticketKey": "UX-123"
}
```

**Response:**
```json
{
    "figmaLink": "https://www.figma.com/file/..."
}
```

**Extracción:** Busca links de Figma en campos "Solución" o "Descripción" del ticket

### 4. Figma API
**Endpoint:** `/api/figma-proxy` (Vercel Serverless Function)

**Request:**
```json
{
    "url": "https://www.figma.com/file/XXXXX/..."
}
```

**Response:**
```json
{
    "document": {
        "children": [
            {
                "id": "...",
                "name": "HP-Checkout",
                "type": "FRAME"
            }
        ]
    }
}
```

**Hook custom:** `useHappyPaths(figmaLink)`
```javascript
const { happyPaths, loading, error, refresh } = useHappyPaths(figmaLink);
```

Filtra frames que empiezan con "HP-"

---

## 📝 Notas y Mejoras Sugeridas

### Inconsistencias Encontradas

1. **Select nativo vs Select shadcn:**
   - CreateCriticsSession usa `<select>` nativo con estilos custom
   - Sería más consistente usar el componente Select de shadcn/ui
   - Razón probable: Necesidad de estilos específicos o problemas con controlled state

2. **TicketAccordion no usa Accordion shadcn:**
   - Implementa su propio expand/collapse con estado manual
   - Podría beneficiarse del componente Accordion de shadcn para animaciones

3. **Repetición de estilos inline:**
   - Varios componentes tienen clases Tailwind muy largas repetidas
   - Podrían extraerse a clases CSS custom como las del calendario

4. **Validación de formularios:**
   - CreateCriticsSession solo usa validación HTML5 básica (required)
   - Podría mejorarse con React Hook Form + Zod para validación compleja

### Oportunidades de Mejora

1. **Componentes faltantes de shadcn:**
   - Popover - útil para tooltips informativos
   - DropdownMenu - útil para menús de acciones
   - ScrollArea - útil para listas largas de HPs
   - Checkbox - si se necesitan selecciones múltiples en futuro

2. **Accesibilidad:**
   - Agregar aria-labels a botones de iconos
   - Mejorar navegación por teclado en calendario
   - Agregar focus states más visibles

3. **Performance:**
   - Memoizar componentes pesados (TicketAccordion)
   - Virtualización para lista de tickets si crece mucho
   - Lazy loading de imágenes de avatar

4. **UX Enhancements:**
   - Agregar loading skeleton en calendario mientras carga sesiones
   - Drag & drop para mover sesiones entre días
   - Shortcuts de teclado (Esc para cerrar modales, etc.)

5. **Code Organization:**
   - Extraer lógica de negocio a custom hooks
   - Separar componentes de página (DashboardPage, CalendarPage) a archivos propios
   - Crear carpeta de constants para PRODUCTS, TYPES, etc.

---

## 🔍 Anexo: Configuración de shadcn/ui

**Archivo:** `components.json`

```json
{
    "$schema": "https://ui.shadcn.com/schema.json",
    "style": "new-york",
    "rsc": false,
    "tsx": false,
    "tailwind": {
        "config": "",
        "css": "src/index.css",
        "baseColor": "slate",
        "cssVariables": true,
        "prefix": ""
    },
    "aliases": {
        "components": "@/components",
        "utils": "@/lib/utils",
        "ui": "@/components/ui",
        "lib": "@/lib",
        "hooks": "@/hooks"
    },
    "iconLibrary": "lucide"
}
```

**Características:**
- Style: "new-york" (variante de diseño de shadcn)
- Base color: "slate" (paleta de grises)
- CSS Variables: true (usa variables CSS en vez de Tailwind config)
- Icon library: Lucide React

---

## 📚 Referencias

- **shadcn/ui:** https://ui.shadcn.com
- **Radix UI:** https://www.radix-ui.com
- **Tailwind CSS v4:** https://tailwindcss.com
- **Lucide Icons:** https://lucide.dev
- **Sonner:** https://sonner.emilkowal.ski

---

**Documento generado:** 2026-02-03
**Versión:** 1.0
**Mantenedor:** Design Critics Team
