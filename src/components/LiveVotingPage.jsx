import React, { useState, useEffect, useRef } from 'react';
import firebase from '../utils/firebase';
import { VotingService } from '../services/voting';
import { playNotificationSound } from '../utils/votingHelpers';
import { toast, Toaster } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
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
import {
    Vote, Loader2, CheckCircle2, Clock, Wifi, WifiOff,
    Sparkles, CircleDot, Send, LogIn, Users, FileText,
    Play, X, CalendarArrowDown, Ban
} from 'lucide-react';
import { FirestoreDataService } from '../services/data';
import { cn } from '@/lib/utils';

/**
 * Página de votación en vivo para asistentes.
 * Se accede vía /live/:sessionCode
 * Los asistentes abren este link al inicio y lo mantienen abierto.
 * 
 * IMPORTANTE: Requiere autenticación con Firebase (Google @prestamype.com)
 */
export function LiveVotingPage({ sessionCode }) {
    // Estado de autenticación
    const [authUser, setAuthUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [authError, setAuthError] = useState(null);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Estado de conexión a la sesión
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);

    // Estado de la sesión
    const [session, setSession] = useState(null);
    const [error, setError] = useState(null);

    // Estado de votación
    const [selectedDecision, setSelectedDecision] = useState(null);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [votedVoteIds, setVotedVoteIds] = useState(new Set());

    // Presentaciones del día (agenda)
    const [presentations, setPresentations] = useState([]);

    // Acciones del presentador
    const [startingVote, setStartingVote] = useState(false);
    const [confirmCancel, setConfirmCancel] = useState(null); // sessionId para confirmar cancelar presentación
    const [confirmMove, setConfirmMove] = useState(null); // sessionId para confirmar mover a mañana
    const [confirmCancelVote, setConfirmCancelVote] = useState(null); // voteId para confirmar cancelar votación (facilitador)

    // Heartbeat
    const heartbeatRef = useRef(null);
    const previousActiveVoteRef = useRef(null);

    // Derived values from auth
    const email = authUser?.email || '';
    const userName = authUser?.displayName || '';

    // Escuchar estado de autenticación de Firebase
    useEffect(() => {
        const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                // Validar dominio
                if (user.email?.endsWith('@prestamype.com')) {
                    setAuthUser(user);
                    setAuthError(null);
                } else {
                    // Dominio inválido - cerrar sesión
                    firebase.auth().signOut();
                    setAuthUser(null);
                    setAuthError('Debes usar un correo @prestamype.com');
                }
            } else {
                setAuthUser(null);
            }
            setAuthLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Auto-conectar cuando el usuario está autenticado
    useEffect(() => {
        if (authUser && sessionCode && !connected && !connecting) {
            handleConnect();
        }
    }, [authUser, sessionCode]);

    // Suscribirse a la sesión en tiempo real
    useEffect(() => {
        if (!sessionCode) return;

        const unsubscribe = VotingService.subscribeToSession(sessionCode, (data) => {
            if (!data) {
                setError('Sesión no encontrada o expirada');
                return;
            }

            setSession(data);

            // Detectar nueva votación activa
            const activeVote = (data.votes || []).find(v => v.status === 'active');
            if (activeVote && activeVote.voteId !== previousActiveVoteRef.current) {
                previousActiveVoteRef.current = activeVote.voteId;

                // Solo notificar si ya está conectado
                if (connected) {
                    playNotificationSound();
                    setSelectedDecision(null);
                    setComment('');
                }
            }

            // Si sesión cerrada
            if (data.status === 'closed') {
                stopHeartbeat();
            }
        });

        return () => unsubscribe();
    }, [sessionCode, connected]);

    // Suscribirse a las presentaciones del día (agenda)
    useEffect(() => {
        const unsubscribe = VotingService.subscribeTodayPresentations((data) => {
            setPresentations(data);
        });

        return () => unsubscribe();
    }, []);

    // Iniciar heartbeat
    const startHeartbeat = (code, userEmail) => {
        stopHeartbeat();
        heartbeatRef.current = setInterval(() => {
            VotingService.updateHeartbeat(code, userEmail).catch(() => { });
        }, 30000);
    };

    const stopHeartbeat = () => {
        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }
    };

    // Desconectar al cerrar la pestaña
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (connected && sessionCode && email) {
                VotingService.disconnectUser(sessionCode, email).catch(() => { });
            }
            stopHeartbeat();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            stopHeartbeat();
        };
    }, [connected, sessionCode, email]);

    // Login con Google
    const handleGoogleLogin = async () => {
        setIsLoggingIn(true);
        setAuthError(null);
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await firebase.auth().signInWithPopup(provider);
            // onAuthStateChanged se encargará del resto
        } catch (error) {
            console.error('Auth error:', error);
            if (error.code === 'auth/popup-closed-by-user') {
                // Usuario cerró el popup, no mostrar error
            } else if (error.code === 'auth/popup-blocked') {
                setAuthError('Popup bloqueado. Por favor permite ventanas emergentes.');
            } else {
                setAuthError('Error de autenticación: ' + error.message);
            }
        } finally {
            setIsLoggingIn(false);
        }
    };

    // Conectar a la sesión de votación
    const handleConnect = async () => {
        if (!authUser) return;

        setConnecting(true);
        setError(null);

        try {
            await VotingService.connectUser(sessionCode, authUser.email, authUser.displayName);
            setConnected(true);
            startHeartbeat(sessionCode, authUser.email);
            toast.success('Conectado a la sesión');
        } catch (error) {
            console.error('Error conectando:', error);
            setError(error.message);
            toast.error(error.message || 'Error al conectar');
        } finally {
            setConnecting(false);
        }
    };

    // Votar
    const handleVote = async (activeVote) => {
        if (!selectedDecision) {
            toast.error('Selecciona tu voto');
            return;
        }

        setSubmitting(true);
        try {
            await VotingService.submitVote(
                sessionCode,
                activeVote.voteId,
                email,
                userName,
                selectedDecision,
                comment
            );

            setVotedVoteIds(prev => new Set([...prev, activeVote.voteId]));
            setSelectedDecision(null);
            setComment('');
            toast.success('Voto registrado');
        } catch (error) {
            console.error('Error votando:', error);
            toast.error(error.message || 'Error al registrar el voto');
        } finally {
            setSubmitting(false);
        }
    };

    // Presentador: Iniciar votación
    const handleStartVote = async (presentation) => {
        setStartingVote(true);
        try {
            await VotingService.startVoteForSession(sessionCode, presentation.id, email);
            toast.success(`Votación iniciada: ${presentation.flow || presentation.flujo}`);
        } catch (error) {
            console.error('Error iniciando votación:', error);
            toast.error(error.message || 'Error al iniciar votación');
        } finally {
            setStartingVote(false);
        }
    };

    // Presentador: Cancelar presentación
    const handleCancelPresentation = async () => {
        if (!confirmCancel) return;
        try {
            const dataService = new FirestoreDataService(email);
            await dataService.cancelPresentation(confirmCancel);
            toast.success('Presentación cancelada');
        } catch (error) {
            console.error('Error cancelando:', error);
            toast.error(error.message || 'Error al cancelar');
        } finally {
            setConfirmCancel(null);
        }
    };

    // Presentador: Mover a mañana
    const handleMoveToNextDay = async () => {
        if (!confirmMove) return;
        try {
            const dataService = new FirestoreDataService(email);
            const result = await dataService.rescheduleToNextDay(confirmMove);
            toast.success(`Presentación movida a ${result.newDate}`);
        } catch (error) {
            console.error('Error moviendo:', error);
            toast.error(error.message || 'Error al mover la presentación');
        } finally {
            setConfirmMove(null);
        }
    };

    // Facilitador: Cancelar votación en curso
    const handleCancelVote = async () => {
        if (!confirmCancelVote) return;
        try {
            await VotingService.cancelVote(sessionCode, confirmCancelVote);
            toast.success('Votación cancelada. El presentador puede reiniciar.');
        } catch (error) {
            console.error('Error cancelando votación:', error);
            toast.error(error.message || 'Error al cancelar votación');
        } finally {
            setConfirmCancelVote(null);
        }
    };

    // Renderizar
    if (error && !session) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Toaster position="top-center" richColors />
                <Card className="w-full max-w-md">
                    <CardContent className="p-8 text-center space-y-4">
                        <WifiOff className="w-12 h-12 mx-auto text-muted-foreground" />
                        <h1 className="text-xl font-semibold">Sesión no disponible</h1>
                        <p className="text-sm text-muted-foreground">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (session?.status === 'closed') {
        const completedVotes = (session.votes || []).filter(v => v.status === 'completed' && v.result);

        return (
            <div className="min-h-screen bg-background p-4">
                <Toaster position="top-center" richColors />
                <div className="max-w-md mx-auto space-y-6 pt-8">
                    <div className="text-center space-y-2">
                        <CheckCircle2 className="w-12 h-12 mx-auto text-green-500" />
                        <h1 className="text-xl font-semibold">Sesión finalizada</h1>
                        <p className="text-sm text-muted-foreground">Gracias por participar</p>
                    </div>

                    {/* Resumen */}
                    <div className="space-y-2">
                        {completedVotes.map(vote => (
                            <Card
                                key={vote.voteId}
                                className={cn(
                                    "border-l-4",
                                    vote.result?.decision === 'approved'
                                        ? "border-l-green-500"
                                        : "border-l-amber-500"
                                )}
                            >
                                <CardContent className="p-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-semibold">{vote.happyPath}</h3>
                                            <p className="text-xs text-muted-foreground">
                                                {vote.presenterName} · {vote.ticket}
                                            </p>
                                        </div>
                                        <span className={cn(
                                            "text-xs font-semibold px-2 py-0.5 rounded-full",
                                            vote.result?.decision === 'approved'
                                                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                                : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                        )}>
                                            {vote.result?.decision === 'approved' ? 'Aprobado' : 'Requiere nuevo'}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Pantalla de conexión / autenticación
    if (!connected) {
        // Loading inicial de auth
        if (authLoading) {
            return (
                <div className="min-h-screen bg-background flex items-center justify-center p-4">
                    <Toaster position="top-center" richColors />
                    <div className="text-center space-y-4">
                        <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Cargando...</p>
                    </div>
                </div>
            );
        }

        // No autenticado - mostrar login
        if (!authUser) {
            return (
                <div className="min-h-screen bg-background flex items-center justify-center p-4">
                    <Toaster position="top-center" richColors />
                    <Card className="w-full max-w-md">
                        <CardContent className="p-8 space-y-6">
                            <div className="text-center space-y-2">
                                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                                    <Sparkles className="w-7 h-7 text-primary" />
                                </div>
                                <h1 className="text-xl font-semibold">Design Critics</h1>
                                <p className="text-sm text-muted-foreground">Votación en Vivo</p>
                            </div>

                            <div className="space-y-4">
                                <p className="text-sm text-center text-muted-foreground">
                                    Inicia sesión con tu cuenta @prestamype.com para votar
                                </p>

                                <Button
                                    onClick={handleGoogleLogin}
                                    disabled={isLoggingIn}
                                    className="w-full"
                                    size="lg"
                                >
                                    {isLoggingIn ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Iniciando sesión...
                                        </>
                                    ) : (
                                        <>
                                            <LogIn className="w-4 h-4 mr-2" />
                                            Continuar con Google
                                        </>
                                    )}
                                </Button>
                            </div>

                            {authError && (
                                <p className="text-sm text-center text-destructive">{authError}</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            );
        }

        // Autenticado pero conectando a la sesión
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Toaster position="top-center" richColors />
                <Card className="w-full max-w-md">
                    <CardContent className="p-8 space-y-6">
                        <div className="text-center space-y-2">
                            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                                <Sparkles className="w-7 h-7 text-primary" />
                            </div>
                            <h1 className="text-xl font-semibold">Design Critics</h1>
                            <p className="text-sm text-muted-foreground">Votación en Vivo</p>
                        </div>

                        <div className="text-center space-y-3">
                            <p className="text-sm">
                                Hola, <span className="font-medium">{userName}</span>
                            </p>
                            {connecting ? (
                                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Conectando a la sesión...
                                </div>
                            ) : error ? (
                                <div className="space-y-3">
                                    <p className="text-sm text-destructive">{error}</p>
                                    <Button onClick={handleConnect} size="sm">
                                        Reintentar
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Conectando...
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Pantalla principal: conectado
    const votes = session?.votes || [];
    const activeVote = votes.find(v => v.status === 'active');
    const completedVotes = votes.filter(v => v.status === 'completed' && v.result);
    const hasVotedInActive = activeVote && votedVoteIds.has(activeVote.voteId);
    const isEligibleForActive = activeVote && activeVote.eligibleVoters?.includes(email);
    const alreadyVotedServer = activeVote && activeVote.votes?.some(v => v.email === email);
    const isFacilitator = email === session?.facilitator;
    const hasActiveLock = !!session?.currentVotingCriticId;

    return (
        <div className="min-h-screen bg-background p-4">
            <Toaster position="top-center" richColors />
            <div className="max-w-md mx-auto space-y-4 pt-4">

                {/* Header de conexión */}
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                        Conectado como <span className="font-medium text-foreground">{userName}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        En línea
                    </span>
                </div>

                {/* Votación activa */}
                {activeVote && isEligibleForActive && !(hasVotedInActive || alreadyVotedServer) ? (
                    <Card className="border-primary/30 ring-1 ring-primary/20">
                        <CardContent className="p-6 space-y-5">
                            <div className="text-center space-y-1">
                                <div className="flex items-center justify-center gap-2 text-primary">
                                    <Vote className="w-5 h-5" />
                                    <span className="text-sm font-semibold uppercase tracking-wide">
                                        Nueva Votación
                                    </span>
                                </div>
                            </div>

                            {/* Info del critics */}
                            <div className="text-center space-y-1">
                                <p className="text-xs text-muted-foreground">
                                    {activeVote.ticket}
                                </p>
                                <h2 className="text-lg font-semibold">
                                    {activeVote.happyPath}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Presentador: {activeVote.presenterName}
                                </p>
                            </div>

                            {/* Pregunta */}
                            <p className="text-center text-sm font-medium">
                                ¿El diseño está listo para pasar a desarrollo?
                            </p>

                            {/* Opciones de voto */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setSelectedDecision('approved')}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                                        selectedDecision === 'approved'
                                            ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
                                            : "border-border hover:border-green-500/50 hover:bg-green-500/5"
                                    )}
                                >
                                    <CheckCircle2 className="w-8 h-8" />
                                    <span className="text-sm font-semibold">Aprobado</span>
                                    <span className="text-[10px] text-muted-foreground">Puede desarrollarse</span>
                                </button>

                                <button
                                    onClick={() => setSelectedDecision('needs_critic')}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                                        selectedDecision === 'needs_critic'
                                            ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                            : "border-border hover:border-amber-500/50 hover:bg-amber-500/5"
                                    )}
                                >
                                    <CircleDot className="w-8 h-8" />
                                    <span className="text-sm font-semibold">Requiere nuevo</span>
                                    <span className="text-[10px] text-muted-foreground">Necesita iteración</span>
                                </button>
                            </div>

                            {/* Comentario */}
                            <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">Comentario (opcional)</label>
                                <Textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Agregar comentario..."
                                    rows={2}
                                    className="resize-none"
                                />
                            </div>

                            {/* Botón enviar */}
                            <Button
                                onClick={() => handleVote(activeVote)}
                                disabled={!selectedDecision || submitting}
                                className="w-full"
                                size="lg"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        Enviar voto
                                    </>
                                )}
                            </Button>

                            {/* Progreso */}
                            <div className="text-center text-xs text-muted-foreground">
                                Votaron: {activeVote.votes?.length || 0}/{activeVote.expectedVotes || 0}
                            </div>
                        </CardContent>
                    </Card>
                ) : activeVote && (hasVotedInActive || alreadyVotedServer) ? (
                    // Ya votó en esta
                    <Card className="border-green-500/30">
                        <CardContent className="p-6 text-center space-y-3">
                            <CheckCircle2 className="w-10 h-10 mx-auto text-green-500" />
                            <h2 className="font-semibold">Voto registrado</h2>
                            <p className="text-sm text-muted-foreground">
                                {activeVote.happyPath} · {activeVote.presenterName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Esperando resultado... ({activeVote.votes?.length || 0}/{activeVote.expectedVotes || 0} votos)
                            </p>
                        </CardContent>
                    </Card>
                ) : activeVote && !isEligibleForActive ? (
                    // No elegible (llegó tarde)
                    <Card>
                        <CardContent className="p-6 text-center space-y-3">
                            <Clock className="w-10 h-10 mx-auto text-muted-foreground" />
                            <h2 className="font-semibold text-muted-foreground">No puedes votar</h2>
                            <p className="text-sm text-muted-foreground">
                                No estuviste presente al inicio de esta votación
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {activeVote.happyPath} · {activeVote.presenterName}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    // Sala de espera con agenda del día
                    <div className="space-y-4">
                        <Card>
                            <CardContent className="p-6 text-center space-y-3">
                                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto">
                                    <Clock className="w-6 h-6 text-muted-foreground" />
                                </div>
                                <div>
                                    <h2 className="font-semibold">Esperando votación...</h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        La siguiente votación aparecerá aquí automáticamente
                                    </p>
                                </div>
                                {session?.connectedUsers && (
                                    <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                                        <Users className="w-3.5 h-3.5" />
                                        {session.connectedUsers.filter(u => u.online).length} conectados
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Agenda del día */}
                        {presentations.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 px-1">
                                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Agenda del día ({presentations.length})
                                    </p>
                                </div>
                                {presentations.map(p => {
                                    const vote = completedVotes.find(v => v.sessionId === p.id);
                                    const isVoting = session?.currentVotingCriticId === p.id;
                                    const isOwner = email === (p.presenterEmail || p.presentador_email);
                                    const isPending = !vote?.result && !isVoting && p.votingStatus !== 'cancelled';
                                    let statusLabel, statusClass;

                                    if (vote?.result) {
                                        statusLabel = vote.result.decision === 'approved' ? 'Aprobado' : 'Requiere nuevo';
                                        statusClass = vote.result.decision === 'approved'
                                            ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
                                    } else if (isVoting) {
                                        statusLabel = 'En votación';
                                        statusClass = 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
                                    } else if (p.votingStatus === 'cancelled') {
                                        statusLabel = 'Cancelada';
                                        statusClass = 'bg-red-500/10 text-red-700 dark:text-red-400';
                                    } else {
                                        statusLabel = 'Pendiente';
                                        statusClass = 'bg-muted text-muted-foreground';
                                    }

                                    return (
                                        <Card key={p.id} className={cn(
                                            isVoting && "border-blue-500/30 ring-1 ring-blue-500/20"
                                        )}>
                                            <CardContent className="p-3 space-y-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium truncate">
                                                            {p.flow || p.flujo || 'Sin título'}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {p.presenter || p.presentador} · {p.ticket}
                                                        </p>
                                                    </div>
                                                    <span className={cn(
                                                        "text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0",
                                                        statusClass
                                                    )}>
                                                        {statusLabel}
                                                    </span>
                                                </div>

                                                {/* Acciones del presentador (solo su propia sesión, solo si pendiente) */}
                                                {isOwner && isPending && (
                                                    <div className="flex items-center gap-1.5 pt-1">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleStartVote(p)}
                                                            disabled={hasActiveLock || startingVote}
                                                            className="h-7 text-xs"
                                                        >
                                                            {startingVote ? (
                                                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                                            ) : (
                                                                <Play className="w-3 h-3 mr-1" />
                                                            )}
                                                            Iniciar Votación
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setConfirmMove(p.id)}
                                                            className="h-7 text-xs text-muted-foreground"
                                                        >
                                                            <CalendarArrowDown className="w-3 h-3 mr-1" />
                                                            Mañana
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setConfirmCancel(p.id)}
                                                            className="h-7 text-xs text-destructive hover:text-destructive"
                                                        >
                                                            <X className="w-3 h-3 mr-1" />
                                                            Cancelar
                                                        </Button>
                                                    </div>
                                                )}

                                                {/* Lock visual: otro presentador tiene votación activa */}
                                                {isOwner && isPending && hasActiveLock && (
                                                    <p className="text-[10px] text-amber-600 dark:text-amber-400">
                                                        Hay una votación en curso. Espera a que termine.
                                                    </p>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}

                        {/* Facilitador: Cancelar votación en curso */}
                        {isFacilitator && activeVote && (
                            <Card className="border-amber-500/20">
                                <CardContent className="p-3 flex items-center justify-between">
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                            Votación activa (Facilitador)
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {activeVote.happyPath}
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setConfirmCancelVote(activeVote.voteId)}
                                        className="h-7 text-xs text-amber-600 border-amber-500/30 hover:bg-amber-500/10 shrink-0"
                                    >
                                        <Ban className="w-3 h-3 mr-1" />
                                        Cancelar votación
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* Resultado de la última votación completada (si acaba de terminar) */}
                {!activeVote && completedVotes.length > 0 && (() => {
                    const lastVote = completedVotes[completedVotes.length - 1];
                    return (
                        <Card className={cn(
                            "border-l-4",
                            lastVote.result?.decision === 'approved'
                                ? "border-l-green-500"
                                : "border-l-amber-500"
                        )}>
                            <CardContent className="p-4 text-center space-y-2">
                                <p className="text-xs text-muted-foreground">Último resultado</p>
                                <h3 className="font-semibold">{lastVote.happyPath}</h3>
                                <div className={cn(
                                    "text-sm font-semibold py-2 rounded-lg flex flex-col items-center gap-1",
                                    lastVote.result?.decision === 'approved'
                                        ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                )}>
                                    <span>
                                        {lastVote.result?.decision === 'approved'
                                            ? '✅ APROBADO'
                                            : '🔄 REQUIERE NUEVO CRITICS'
                                        }
                                    </span>
                                    <span className="text-xs font-normal opacity-90">
                                        {lastVote.result?.decision === 'approved'
                                            ? 'Listo para Handoff / Desarrollo'
                                            : 'Se requiere agendar una nueva sesión'
                                        }
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })()}

                {/* Historial de votaciones */}
                {completedVotes.length > 1 && (
                    <div className="space-y-2 pt-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Historial
                        </p>
                        {completedVotes.slice(0, -1).reverse().map(vote => (
                            <Card key={vote.voteId}>
                                <CardContent className="p-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-medium">{vote.happyPath}</h4>
                                            <p className="text-xs text-muted-foreground">
                                                {vote.presenterName} · {vote.ticket}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className={cn(
                                                "text-[10px] font-semibold px-2 py-0.5 rounded-full block w-fit ml-auto mb-1",
                                                vote.result?.decision === 'approved'
                                                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                            )}>
                                                {vote.result?.decision === 'approved' ? 'Aprobado' : 'Requiere nuevo'}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {vote.result?.decision === 'approved'
                                                    ? 'Listo para Handoff'
                                                    : 'Reprogramar'}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* AlertDialog: Confirmar cancelar presentación */}
            <AlertDialog open={!!confirmCancel} onOpenChange={(open) => !open && setConfirmCancel(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Cancelar presentación?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tu sesión será archivada y no se presentará hoy. Puedes volver a agendarla después.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Volver</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancelPresentation}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Cancelar presentación
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* AlertDialog: Confirmar mover a mañana */}
            <AlertDialog open={!!confirmMove} onOpenChange={(open) => !open && setConfirmMove(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Mover presentación al siguiente día hábil?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tu sesión se reprogramará para el siguiente día hábil (Lunes a Viernes).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Volver</AlertDialogCancel>
                        <AlertDialogAction onClick={handleMoveToNextDay}>
                            Mover a mañana
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* AlertDialog: Confirmar cancelar votación (facilitador) */}
            <AlertDialog open={!!confirmCancelVote} onOpenChange={(open) => !open && setConfirmCancelVote(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Cancelar votación en curso?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Los votos parciales se descartarán. La sesión volverá a estado &quot;Pendiente&quot; y el presentador podrá reiniciar la votación.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Volver</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancelVote}
                            className="bg-amber-600 text-white hover:bg-amber-700"
                        >
                            Cancelar votación
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
