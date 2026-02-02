import React, { useState, useEffect } from 'react';
import firebase from './utils/firebase';
import { AuthStorage, FirestoreDataService } from './services/data';
import CreateCriticsSession from './components/CreateCriticsSession';
import { TicketAccordion } from './components/TicketAccordion'; // Import new component
import './index.css';

// --- Sub-components (Toast, Navbar, etc.) ---

function Toast({ message, type = 'error', onClose }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`toast ${type === 'success' ? 'toast-success' : 'toast-error'}`}>
            <span>{type === 'success' ? '✅' : '⚠️'}</span>
            <p>{message}</p>
        </div>
    );
}

function ConfirmModal({ isOpen, onClose, onConfirm, title, description, isSubmitting }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: '400px' }}>
                <div className="modal-body confirm-modal-body">
                    <div className="confirm-modal-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                    </div>
                    <h3 className="confirm-modal-title">{title}</h3>
                    <p className="confirm-modal-desc">{description}</p>
                    <div className="confirm-modal-actions">
                        <button className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
                        <button className="btn btn-danger" onClick={onConfirm} disabled={isSubmitting}>
                            {isSubmitting ? 'Eliminando...' : 'Eliminar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Navbar({ user, onLogout, darkMode, toggleDarkMode }) {
    return (
        <nav className="navbar">
            <div className="navbar-content">
                <div className="logo">
                    <div className="logo-icon">✨</div>
                    Design Critics
                </div>
                <div className="user-info">
                    <button onClick={toggleDarkMode} className="btn btn-secondary theme-toggle-btn">
                        {darkMode ? '☀️' : '🌙'}
                    </button>
                    {user.picture ? (
                        <img src={user.picture} alt={user.name} className="avatar" />
                    ) : (
                        <div className="avatar">{user.initials}</div>
                    )}
                    <div className="user-text">
                        <div className="user-name">{user.name}</div>
                        <button onClick={onLogout} className="logout-btn">
                            Salir
                        </button>
                    </div>
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
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            const provider = new firebase.auth.GoogleAuthProvider();
            // Removed custom parameters to avoid issues on mobile and desktop loops
            // provider.setCustomParameters({ prompt: 'select_account' });

            let firebaseUser;
            // Unify to Popup for all devices to avoid 404 Redirect errors
            const result = await firebase.auth().signInWithPopup(provider);
            firebaseUser = result.user;

            if (!firebaseUser.email.endsWith('@prestamype.com')) {
                await firebase.auth().signOut();
                onLogin(null, 'Debes usar un correo @prestamype.com');
                setIsAuthenticating(false);
                return;
            }

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
            onLogin(user, null);
        } catch (error) {
            console.error('Auth error:', error);
            setIsAuthenticating(false);
            onLogin(null, 'Error de autenticación');
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-icon">✨</div>
                <h1 className="login-title">Design Critics</h1>
                <p className="login-subtitle">Gestión de sesiones de crítica de diseño</p>
                {error && <div className="login-error">{error}</div>}
                <button
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: '16px', padding: '14px', borderRadius: '12px' }}
                    onClick={handleGoogleLogin}
                    disabled={isAuthenticating}
                >
                    {isAuthenticating ? 'Iniciando sesión...' : 'Continuar con Google'}
                </button>
            </div>
        </div>
    );
}

// --- Page Components ---

const DashboardPage = ({ activeTickets, onQuickAdd, dcs }) => {
    // Weekend logic (retained for fallback default date in modal)
    const today = new Date();
    const day = today.getDay();
    let targetDate = new Date(today);

    if (day === 6) {
        targetDate.setDate(today.getDate() + 2);
    } else if (day === 0) {
        targetDate.setDate(today.getDate() + 1);
    }

    const dateStr = targetDate.toISOString().split('T')[0];

    return (
        <div className="container">
            <div className="page-header">
                <h1>Dashboard Personal</h1>
                <p>Tus tickets activos en Jira</p>
            </div>

            <div className="dashboard-grid">
                {activeTickets.length === 0 ? <p>No tienes tickets activos asignados.</p> : activeTickets.map(ticket => (
                    <TicketAccordion
                        key={ticket.key}
                        ticket={ticket}
                        sessions={dcs} // Pass all sessions to calculate progress
                        onSchedule={(data) => {
                            // Quick Add Handler from Accordion
                            // data includes: ticket, product, flow (optional), type, figmaLink (optional)
                            onQuickAdd({
                                ...data,
                                date: dateStr,
                                // Trigger Simplified Mode in Modal
                                simplifiedMode: true,
                                // Exclude 'Iteración DS' and 'Nuevo alcance' when adding from Dashboard
                                excludeTypes: ['Iteración DS', 'Nuevo alcance']
                            });
                        }}
                    />
                ))}
            </div>

            <style jsx>{`
                .dashboard-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 16px;
                    /* max-width removed to fill container (1440px) */
                }
                
                @media (min-width: 1024px) {
                    .dashboard-grid {
                        grid-template-columns: 1fr 1fr;
                    }
                }
            `}</style>
        </div>
    );
};

function CalendarPage({ dcs, user, activeTickets, onAddDC, onEditDC, onDeleteDC, onClearPrefill, prefillData }) {
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [baseDate, setBaseDate] = useState(new Date());
    const [editingDC, setEditingDC] = useState(null);

    useEffect(() => {
        if (prefillData) {
            setEditingDC(prefillData); // Assuming prefill structure matches
            setModalOpen(true);
            onClearPrefill && onClearPrefill();
        }
    }, [prefillData, onClearPrefill]);

    const getWeekDays = () => {
        const days = [];
        const current = new Date(baseDate);
        let currentDay = current.getDay();

        // Smart Weekend Logic: If Sat/Sun, show next week
        if (currentDay === 0) { // Sunday
            current.setDate(current.getDate() + 1);
        } else if (currentDay === 6) { // Saturday
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
        const dateStr = date.toISOString().split('T')[0];
        setEditingDC({ date: dateStr }); // Set date
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
        <div className="container">
            <div className="calendar-header-bar">
                <div className="calendar-nav-group">
                    <h1 style={{ fontSize: '22px', fontWeight: 600, marginRight: '24px' }}>Calendario</h1>
                    <button className="btn btn-secondary nav-today-btn" onClick={handleToday}>Hoy</button>
                    <div className="nav-arrows">
                        <button onClick={handlePrevWeek} className="icon-btn nav-arrow">‹</button>
                        <button onClick={handleNextWeek} className="icon-btn nav-arrow">›</button>
                    </div>
                </div>
                <span className="current-month-label">{capitalizedMonthYear}</span>
            </div>

            <div className="calendar-grid gcal-grid">
                {weekDays.map((date, i) => {
                    const dateStr = date.toISOString().split('T')[0];
                    const dayDCs = dcs.filter(d => d.date === dateStr);
                    const today = isToday(date);

                    return (
                        <div key={i} className={`day-column ${today ? 'is-today' : ''}`}>
                            <div className="day-header-gcal">
                                <div className="day-name">{date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase().replace('.', '')}</div>
                                <div className={`day-number ${today ? 'today-circle' : ''}`}>
                                    {date.getDate()}
                                </div>
                            </div>
                            <div className="day-body" onClick={() => handleCellClick(date)}>
                                {/* Invisible fill to make empty space clickable */}
                                {dayDCs.map(dc => (
                                    <div key={dc.id} className="dc-card-gcal" onClick={(e) => { e.stopPropagation(); /* prevent triggering add */ }}>
                                        <div className="dc-card-stripe" style={{ background: dc.type === 'Design Critic' ? '#0ea5e9' : '#6366f1' }}></div>
                                        <div className="dc-card-content">
                                            <div className="dc-gcal-title">{dc.flow || 'Sin título'}</div>
                                            <div className="dc-gcal-time">{dc.ticket}</div>
                                            {dc.createdBy === user.email && (
                                                <div className="dc-gcal-actions">
                                                    <button className="tiny-btn" onClick={() => { setEditingDC(dc); setModalOpen(true); }}>✎</button>
                                                    <button className="tiny-btn" onClick={() => onDeleteDC(dc.id)}>&times;</button>
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

            {/* INTEGRATED MODAL WITH CREATE CRITICS SESSION */}
            {
                modalOpen && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <div className="modal-header">
                                <h3 className="modal-title">{editingDC?.id ? 'Editar Sesión' : 'Nueva Sesión'}</h3>
                                <button onClick={() => setModalOpen(false)} className="close-btn">×</button>
                            </div>
                            <div className="modal-body">
                                <CreateCriticsSession
                                    user={user}
                                    initialData={editingDC}
                                    activeTickets={activeTickets}
                                    onClose={() => setModalOpen(false)}
                                    onSubmit={async (data) => {
                                        // Merge date if not in data (CreateCriticsSession doesn't have date picker inside form yet? 
                                        // Actually original Modal selects date separately or assumes today?
                                        // The original Modal passed selectedDate to onSubmit logic.
                                        // My CreateCriticsSession does NOT have a Date picker.
                                        // I should inject the selectedDate into the data if missing.

                                        const finalData = {
                                            ...data,
                                            date: data.date || editingDC?.date || selectedDate || new Date().toISOString().split('T')[0],
                                            presenter: user.name, // Ensure presenter is set
                                            createdBy: user.email
                                        };

                                        if (editingDC?.id) {
                                            await onEditDC({ ...finalData, id: editingDC.id });
                                        } else {
                                            await onAddDC(finalData);
                                        }
                                        setModalOpen(false);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
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

    // Modal State lifted from Calendar
    const [modalOpen, setModalOpen] = useState(false);
    const [editingDC, setEditingDC] = useState(null);

    const handleOpenModal = (data) => {
        setEditingDC(data);
        setModalOpen(true);
    };

    // Generic Save Handler for Global Modal
    const handleSaveDC = (formData) => {
        const newDC = {
            ...formData,
            createdBy: user.email,
            presenter: user.name,
            id: editingDC?.id || Date.now().toString(),
            date: formData.date || editingDC?.date || new Date().toISOString().split('T')[0]
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
        document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
        localStorage.setItem('darkMode', darkMode);
    }, [darkMode]);

    // Auth & Data Load
    useEffect(() => {
        firebase.auth().onAuthStateChanged(async (u) => {
            if (u && u.email?.endsWith('@prestamype.com')) {
                const userData = {
                    name: u.displayName,
                    email: u.email,
                    picture: u.photoURL,
                    initials: (u.displayName || 'U').substring(0, 2),
                    uid: u.uid
                };
                // Init Service
                const service = new FirestoreDataService(u.email);
                const [all, history] = await Promise.all([service.readAll(), service.readUserHistory()]);

                // Merge Logic
                const merged = [...all];
                const allIds = new Set(all.map(d => d.id));
                history.forEach(d => { if (!allIds.has(d.id)) merged.push(d); });

                setUser(userData);
                setDataService(service);
                setDcs(merged);

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
                setUser(null);
            }
            setIsLoading(false);
        });
    }, []);

    const handleAddDC = async (data) => {
        const newDc = await dataService.create(data);
        setDcs(prev => [...prev, newDc]);
    };

    const handleEditDC = async (data) => {
        const updated = await dataService.update(data);
        setDcs(prev => prev.map(d => d.id === data.id ? updated : d));
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
        } catch (error) {
            console.error(error);
            // Optionally show toast error
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) return (
        <div id="initial-loader">
            <div className="initial-spinner"></div>
            <div style={{ color: '#6B7280', fontSize: '14px', fontWeight: 500 }}>Cargando Design Critics...</div>
        </div>
    );
    if (!user) return <LoginPage onLogin={() => { }} error={loginError} />;

    return (
        <>
            <Navbar user={user} onLogout={() => firebase.auth().signOut()} darkMode={darkMode} toggleDarkMode={() => setDarkMode(!darkMode)} />

            <div className="container tabs">
                <button className={`tab ${currentTab === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentTab('dashboard')}>Dashboard</button>
                <button className={`tab ${currentTab === 'calendar' ? 'active' : ''}`} onClick={() => setCurrentTab('calendar')}>Calendario</button>
            </div>

            {currentTab === 'dashboard' && (
                <DashboardPage
                    activeTickets={activeTickets}
                    dcs={dcs} // Pass dcs here
                    onQuickAdd={(data) => handleOpenModal(data)}
                />
            )}

            {currentTab === 'calendar' && (
                <CalendarPage
                    dcs={dcs}
                    user={user}
                    activeTickets={activeTickets}
                    onOpenModal={handleOpenModal}
                    onAddDC={handleAddDC}
                    onEditDC={handleEditDC}
                    onDeleteDC={handleDeleteDC}
                />
            )}

            {modalOpen && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>{editingDC?.id ? 'Editar Sesión' : 'Agendar design critics'}</h2>
                            <button className="close-btn" onClick={() => setModalOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <CreateCriticsSession
                                sessions={dcs}
                                onSubmit={handleSaveDC}
                                onClose={() => setModalOpen(false)}
                                initialData={editingDC}
                                user={user}
                                activeTickets={activeTickets}
                                // If editingDC has simplifiedMode flag (passed from onQuickAdd), lock fields
                                readOnlyFields={editingDC?.simplifiedMode ? ['ticket', 'product'] : []}
                                // Pass down excludeTypes (e.g., from Dashboard)
                                excludeTypes={editingDC?.excludeTypes || []}
                            />
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!deletingId}
                onClose={() => setDeletingId(null)}
                onConfirm={confirmDelete}
                title="¿Eliminar sesión?"
                description="Esta acción no se puede deshacer."
                isSubmitting={isDeleting}
            />
        </>
    );
}
