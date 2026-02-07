import React, { useState, useEffect, useRef } from 'react';
import firebase from '../utils/firebase';
import { VotingService } from '../services/voting';
import { playNotificationSound } from '../utils/votingHelpers';
import { toast, Toaster } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
    Vote, Loader2, CheckCircle2, Clock, Wifi, WifiOff,
    Sparkles, CircleDot, Send, LogIn
} from 'lucide-react';
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
                    // Esperando votación
                    <Card>
                        <CardContent className="p-8 text-center space-y-4">
                            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto">
                                <Clock className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div>
                                <h2 className="font-semibold">Esperando votación...</h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    La siguiente votación aparecerá aquí automáticamente
                                </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                No cierres esta ventana
                            </p>
                        </CardContent>
                    </Card>
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
                                    "text-sm font-semibold py-2 rounded-lg",
                                    lastVote.result?.decision === 'approved'
                                        ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                )}>
                                    {lastVote.result?.decision === 'approved'
                                        ? '✅ APROBADO'
                                        : '🔄 REQUIERE NUEVO CRITICS'
                                    }
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
                                        <span className={cn(
                                            "text-[10px] font-semibold px-2 py-0.5 rounded-full",
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
                )}
            </div>
        </div>
    );
}
