import React, { useState, useEffect } from 'react';
import firebase from './utils/firebase';
import { AuthStorage, FirestoreDataService } from './services/data';
import CreateCriticsSession from './components/CreateCriticsSession';
import { TicketAccordion } from './components/TicketAccordion';
import { toast, Toaster } from 'sonner';
import { AgendaCard } from './components/AgendaCard';

// Shadcn UI Components
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sun, Moon, LogOut, Sparkles } from 'lucide-react';

import './index.css';

// --- Sub-components ---

function Navbar({ user, onLogout, darkMode, toggleDarkMode }) {
    return (
        <nav className="navbar">
            <div className="navbar-content">
                <div className="logo">
                    <div className="logo-icon">
                        <Sparkles className="w-5 h-5 text-primary-foreground" />
                    </div>
                    Design Critics
                </div>
                <div className="user-info">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={toggleDarkMode}
                        className="theme-toggle-btn rounded-full w-9 h-9 border-input"
                    >
                        {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 overflow-hidden">
                                <Avatar className="h-9 w-9">
                                    {user.picture ? (
                                        <AvatarImage src={user.picture} alt={user.name} />
                                    ) : null}
                                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                                        {user.initials}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{user.name}</p>
                                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={onLogout}
                                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/20 cursor-pointer"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Cerrar sesión</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </nav>
    );
}

function LoginPage({ onLogin, error }) {
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    const handleGoogleLogin = async () => {
        setIsAuthenticating(true);
        try {
            const provider = new firebase.auth.GoogleAuthProvider();

            // Mobile detection for better UX (Popups often blocked/buggy on mobile)
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            if (isMobile) {
                // Redirect flow - page will reload
                await firebase.auth().signInWithRedirect(provider);
                // No code after this point executes until reload
            } else {
                // Desktop - Popup flow
                const result = await firebase.auth().signInWithPopup(provider);
                const firebaseUser = result.user;

                // Domain check specific for Popup (Redirect flow handled in App.useEffect)
                if (!firebaseUser.email.endsWith('@prestamype.com')) {
                    await firebase.auth().signOut();
                    onLogin(null, 'Debes usar un correo @prestamype.com');
                    setIsAuthenticating(false);
                    return;
                }

                // Success - onAuthStateChanged in App.jsx will trigger and set the user
                const user = {
                    name: firebaseUser.displayName,
                    email: firebaseUser.email,
                    picture: firebaseUser.photoURL,
                    initials: firebaseUser.displayName.split(' ').map(n => n[0]).join('').substring(0, 2),
                    uid: firebaseUser.uid
                };

                AuthStorage.setUserConsent(firebaseUser.email);
                AuthStorage.setLastUserEmail(firebaseUser.email);
                AuthStorage.saveSession(user);
            }
        } catch (error) {
            console.error('Auth error:', error);
            setIsAuthenticating(false);
            if (error.code === 'auth/popup-closed-by-user') return;
            onLogin(null, 'Error de autenticación: ' + error.message);
        }
    };

    return (
        <div className="login-container">
            <Card className="login-card border-0">
                <CardContent className="p-8 sm:p-12">
                    <div className="login-icon">
                        <Sparkles className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h1 className="login-title">Design Critics</h1>
                    <p className="login-subtitle">Gestión de sesiones de crítica de diseño</p>
                    {error && <div className="login-error">{error}</div>}
                    <Button
                        className="w-full text-base py-6"
                        onClick={handleGoogleLogin}
                        disabled={isAuthenticating}
                    >
                        {isAuthenticating ? 'Iniciando sesión...' : 'Continuar con Google'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

// --- Page Components ---

const DashboardPage = ({ activeTickets, onQuickAdd, dcs, user, onDelete }) => {
    const today = new Date();
    const day = today.getDay();
    let targetDate = new Date(today);

    if (day === 6) {
        targetDate.setDate(today.getDate() + 2);
    } else if (day === 0) {
        targetDate.setDate(today.getDate() + 1);
    }

    const dateStr = targetDate.toLocaleDateString('en-CA');

    return (
        <div>
            <AgendaCard sessions={dcs} user={user} onDelete={onDelete} />

            <div className="page-header">
                <h1>Dashboard Personal</h1>
                <p>Tus tickets activos en Jira</p>
            </div>

            <div className="dashboard-grid">
                {activeTickets.length === 0 ? (
                    <Card>
                        <CardContent className="p-6">
                            <p className="text-muted-foreground">No tienes tickets activos asignados.</p>
                        </CardContent>
                    </Card>
                ) : activeTickets.map(ticket => (
                    <TicketAccordion
                        key={ticket.key}
                        ticket={ticket}
                        sessions={dcs}
                        onSchedule={(data) => {
                            const getPeruDate = () => {
                                const now = new Date();
                                const options = { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' };
                                const formatter = new Intl.DateTimeFormat('en-CA', options); // en-CA gives YYYY-MM-DD
                                return formatter.format(now);
                            };

                            const todayStr = getPeruDate();
                            // Parse todayStr back to Date object for day-of-week logic if needed, 
                            // but simply using today's date for 'Agendar Hoy' is usually correct unless weekend logic is strict.
                            // The previous logic added days for weekends. Let's keep that but base it on Peru time.

                            const todayParts = todayStr.split('-');
                            const todayDate = new Date(todayParts[0], todayParts[1] - 1, todayParts[2]);
                            const day = todayDate.getDay();

                            let targetDate = new Date(todayDate);

                            if (day === 6) { // Saturday -> Monday
                                targetDate.setDate(todayDate.getDate() + 2);
                            } else if (day === 0) { // Sunday -> Monday
                                targetDate.setDate(todayDate.getDate() + 1);
                            }

                            // Format targetDate back to YYYY-MM-DD
                            const year = targetDate.getFullYear();
                            const month = String(targetDate.getMonth() + 1).padStart(2, '0');
                            const dateNum = String(targetDate.getDate()).padStart(2, '0');
                            const finalDateStr = `${year}-${month}-${dateNum}`;

                            console.log('📅 Date Calculation:', { todayStr, day, finalDateStr, TimeZone: 'America/Lima' });

                            onQuickAdd({
                                ...data,
                                date: finalDateStr,
                                simplifiedMode: true,
                                excludeTypes: ['Iteración DS']
                            });
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

function CalendarPage({ dcs, user, activeTickets, onAddDC, onEditDC, onDeleteDC }) {
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [baseDate, setBaseDate] = useState(new Date());
    const [editingDC, setEditingDC] = useState(null);

    const getWeekDays = () => {
        const days = [];
        const current = new Date(baseDate);
        let currentDay = current.getDay();

        if (currentDay === 0) {
            current.setDate(current.getDate() + 1);
        } else if (currentDay === 6) {
            current.setDate(current.getDate() + 2);
        }

        currentDay = current.getDay();
        const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
        const monday = new Date(current);
        monday.setDate(current.getDate() + mondayOffset);

        for (let i = 0; i < 5; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            days.push(date);
        }
        return days;
    };

    const handlePrevWeek = () => {
        const newDate = new Date(baseDate);
        newDate.setDate(newDate.getDate() - 7);
        setBaseDate(newDate);
    };

    const handleNextWeek = () => {
        const newDate = new Date(baseDate);
        newDate.setDate(newDate.getDate() + 7);
        setBaseDate(newDate);
    };

    const handleToday = () => {
        setBaseDate(new Date());
    };

    const weekDays = getWeekDays();
    const startOfWeek = weekDays[0];
    const monthYear = startOfWeek.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const capitalizedMonthYear = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);

    const handleCellClick = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        setEditingDC({ date: dateStr });
        setSelectedDate(dateStr);
        setModalOpen(true);
    };

    const isToday = (date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    return (
        <div>
            <div className="calendar-header-bar">
                <div className="calendar-nav-group">
                    <h1 className="text-xl font-semibold mr-6">Calendario</h1>
                    <Button variant="outline" size="sm" onClick={handleToday}>Hoy</Button>
                    <div className="nav-arrows">
                        <button onClick={handlePrevWeek} className="nav-arrow">‹</button>
                        <button onClick={handleNextWeek} className="nav-arrow">›</button>
                    </div>
                </div>
                <span className="current-month-label">{capitalizedMonthYear}</span>
            </div>

            <div className="gcal-grid">
                {weekDays.map((date, i) => {
                    // Fix: Use local date components, NOT ISO/UTC, because 'date' preserves current time
                    // and can shift to next day in UTC if late at night in Peru.
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const dayNum = String(date.getDate()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${dayNum}`;

                    const dayDCs = dcs.filter(d => d.date === dateStr);
                    const today = isToday(date);

                    return (
                        <div key={i} className={`day-column ${today ? 'is-today' : ''}`}>
                            <div className="day-header-gcal">
                                <div className="day-name">
                                    {date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase().replace('.', '')}
                                </div>
                                <div className={today ? 'today-circle' : 'day-number'}>
                                    {date.getDate()}
                                </div>
                            </div>
                            <div className="day-body" onClick={() => handleCellClick(date)}>
                                {dayDCs.map(dc => (
                                    <div key={dc.id} className="dc-card-gcal" onClick={(e) => e.stopPropagation()}>
                                        <div
                                            className="dc-card-stripe"
                                            style={{ background: dc.type === 'Design Critic' ? '#0ea5e9' : '#6366f1' }}
                                        />
                                        <div className="dc-card-content">
                                            <div className="dc-gcal-title">{dc.flow || 'Sin título'}</div>
                                            <div className="dc-gcal-time">{dc.ticket}</div>
                                            {dc.createdBy === user.email && (
                                                <div className="dc-gcal-actions">
                                                    <button
                                                        className="tiny-btn"
                                                        onClick={() => { setEditingDC(dc); setModalOpen(true); }}
                                                    >
                                                        ✎
                                                    </button>
                                                    <button
                                                        className="tiny-btn"
                                                        onClick={() => onDeleteDC(dc.id)}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <button
                                    className="btn-add-gcal"
                                    onClick={(e) => { e.stopPropagation(); handleCellClick(date); }}
                                >
                                    + Agendar
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingDC?.id ? 'Editar Sesión' : 'Nueva Sesión'}</DialogTitle>
                    </DialogHeader>
                    <CreateCriticsSession
                        user={user}
                        initialData={editingDC}
                        activeTickets={activeTickets}
                        sessions={dcs}
                        onClose={() => setModalOpen(false)}
                        onSubmit={async (data) => {
                            const finalData = {
                                ...data,
                                date: data.date || editingDC?.date || selectedDate || (() => {
                                    const now = new Date();
                                    const options = { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' };
                                    return new Intl.DateTimeFormat('en-CA', options).format(now);
                                })(),
                                presenter: user.name,
                                createdBy: user.email
                            };

                            if (editingDC?.id) {
                                await onEditDC({ ...finalData, id: editingDC.id });
                                toast.success('Sesión actualizada correctamente');
                            } else {
                                await onAddDC(finalData);
                                toast.success('Sesión agendada correctamente');
                            }
                            setModalOpen(false);
                        }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}

// --- Main App ---

export default function App() {
    const [user, setUser] = useState(null);
    const [loginError, setLoginError] = useState(null);
    const [dataService, setDataService] = useState(null);
    const [dcs, setDcs] = useState([]);
    const [activeTickets, setActiveTickets] = useState([]);
    const [currentTab, setCurrentTab] = useState('dashboard');
    const [isLoading, setIsLoading] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingDC, setEditingDC] = useState(null);

    const handleOpenModal = (data) => {
        setEditingDC(data);
        setModalOpen(true);
    };

    const handleSaveDC = (formData) => {
        const dateToUse = formData.date || editingDC?.date || (() => {
            const now = new Date();
            const options = { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' };
            // en-CA outputs YYYY-MM-DD
            return new Intl.DateTimeFormat('en-CA', options).format(now);
        })();

        console.log('💾 handleSaveDC Executing:', {
            formDataDate: formData.date,
            editingDCDate: editingDC?.date,
            calculatedDateToUse: dateToUse,
            formData,
            editingDC
        });

        const newDC = {
            ...formData,
            createdBy: user.email,
            presenter: user.name,
            id: editingDC?.id || Date.now().toString(),
            date: dateToUse
        };

        if (editingDC && editingDC.id) {
            handleEditDC(newDC);
        } else {
            handleAddDC(newDC);
        }
        setModalOpen(false);
        setEditingDC(null);

    };

    // Dark Mode
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') !== 'false');
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('darkMode', darkMode);
    }, [darkMode]);

    // Auth & Data Load
    useEffect(() => {
        firebase.auth().onAuthStateChanged(async (u) => {
            if (u) {
                if (u.email?.endsWith('@prestamype.com')) {
                    const userData = {
                        name: u.displayName,
                        email: u.email,
                        picture: u.photoURL,
                        initials: (u.displayName || 'U').substring(0, 2),
                        uid: u.uid
                    };
                    const service = new FirestoreDataService(u.email);
                    const [all, history] = await Promise.all([service.readAll(), service.readUserHistory()]);

                    const merged = [...all];
                    const allIds = new Set(all.map(d => d.id));
                    history.forEach(d => { if (!allIds.has(d.id)) merged.push(d); });

                    setUser(userData);
                    setDataService(service);
                    setDcs(merged);
                    setLoginError(null);
                    setIsLoading(false);

                    fetch('/api/search-jira', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userEmail: u.email })
                    })
                        .then(res => res.json())
                        .then(data => {
                            if (data.success) setActiveTickets(data.tickets || []);
                        })
                        .catch(console.error);
                } else {
                    // Invalid domain
                    console.warn('Unauthorized domain:', u.email);
                    await firebase.auth().signOut();
                    setUser(null);
                    setLoginError('Acceso restringido: Debes usar un correo @prestamype.com');
                    setIsLoading(false);
                }
            } else {
                setUser(null);
                setIsLoading(false);
            }
        });
    }, []);

    const handleAddDC = async (data) => {
        const newDc = await dataService.create(data);
        setDcs(prev => [...prev, newDc]);
        toast.success('Sesión agendada correctamente');
    };

    const handleEditDC = async (data) => {
        const updated = await dataService.update(data);
        setDcs(prev => prev.map(d => d.id === data.id ? updated : d));
        toast.success('Sesión actualizada correctamente');
    };

    const [deletingId, setDeletingId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteDC = (id) => {
        setDeletingId(id);
    };

    const confirmDelete = async () => {
        if (!deletingId) return;
        setIsDeleting(true);
        try {
            await dataService.delete(deletingId);
            setDcs(prev => prev.filter(d => d.id !== deletingId));
            setDeletingId(null);
            toast.success('Sesión eliminada correctamente');
        } catch (error) {
            console.error(error);
            toast.error('Error al eliminar la sesión');
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) return (
        <div id="initial-loader">
            <div className="initial-spinner"></div>
            <div className="text-muted-foreground text-sm font-medium">Cargando Design Critics...</div>
        </div>
    );

    if (!user) return <LoginPage onLogin={() => { }} error={loginError} />;

    return (
        <>
            <Toaster position="top-right" richColors />
            <Navbar
                user={user}
                onLogout={() => firebase.auth().signOut()}
                darkMode={darkMode}
                toggleDarkMode={() => setDarkMode(!darkMode)}
            />

            <div className="container">
                <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                    <TabsList variant="line" className="mb-6">
                        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                        <TabsTrigger value="calendar">Calendario</TabsTrigger>
                    </TabsList>

                    <TabsContent value="dashboard" className="mt-0">
                        <DashboardPage
                            activeTickets={activeTickets}
                            dcs={dcs}
                            user={user}
                            onDelete={handleDeleteDC}
                            onQuickAdd={(data) => handleOpenModal(data)}
                        />
                    </TabsContent>

                    <TabsContent value="calendar" className="mt-0">
                        <CalendarPage
                            dcs={dcs}
                            user={user}
                            activeTickets={activeTickets}
                            onAddDC={handleAddDC}
                            onEditDC={handleEditDC}
                            onDeleteDC={handleDeleteDC}
                        />
                    </TabsContent>
                </Tabs>
            </div>

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingDC?.id ? 'Editar Sesión' : 'Agendar design critics'}</DialogTitle>
                        <DialogDescription className="hidden">
                            Formulario para agendar o editar una sesión de Design Critics.
                        </DialogDescription>
                    </DialogHeader>
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
                </DialogContent>
            </Dialog>

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
        </>
    );
}
