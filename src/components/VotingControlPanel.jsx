import React, { useState, useEffect } from 'react';
import { VotingService } from '../services/voting';
import { LiveVoteResults } from './LiveVoteResults';
import { SessionSummaryModal } from './SessionSummaryModal';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    Users, Play,
    ArrowLeft, Loader2, CircleDot
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Tarjeta de presentación (estática, sin drag & drop)
 */
function PresentationCard({ presentation: p, index, onLaunch, disabled, launching }) {
    return (
        <Card className="hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Info de la presentación */}
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-muted-foreground">
                                    {index + 1}.
                                </span>
                                <h3 className="text-sm font-semibold truncate">
                                    {p.flow || p.flujo || 'Sin título'}
                                </h3>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {p.presenter || p.presentador} · {p.ticket}
                            </p>
                            {p.product || p.producto ? (
                                <Badge variant="secondary" className="text-[10px] mt-1">
                                    {p.product || p.producto}
                                </Badge>
                            ) : null}
                        </div>
                    </div>

                    {/* Botón lanzar */}
                    <Button
                        size="sm"
                        onClick={() => onLaunch(p)}
                        disabled={disabled}
                        className="flex-shrink-0 ml-3"
                    >
                        {launching ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <Play className="w-3.5 h-3.5 mr-1" />
                                Lanzar
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Panel de Control del Facilitador.
 * Muestra presentaciones del día, usuarios conectados,
 * permite lanzar votaciones y ver resultados en tiempo real.
 */
export function VotingControlPanel({ sessionCode, user, onClose }) {
    const [session, setSession] = useState(null);
    const [presentations, setPresentations] = useState([]);
    const [launching, setLaunching] = useState(false);
    const [closing, setClosing] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [summaryData, setSummaryData] = useState(null);
    const [confirmCloseVote, setConfirmCloseVote] = useState(null);
    const [confirmCloseSession, setConfirmCloseSession] = useState(false);

    // Suscribirse a la sesión en tiempo real
    useEffect(() => {
        if (!sessionCode) return;

        const unsubscribe = VotingService.subscribeToSession(sessionCode, (data) => {
            setSession(data);
        });

        return () => unsubscribe();
    }, [sessionCode]);

    // Suscribirse a presentaciones del día
    useEffect(() => {
        const unsubscribe = VotingService.subscribeTodayPresentations((data) => {
            setPresentations(data);
        });

        return () => unsubscribe();
    }, []);

    const connectedUsers = session?.connectedUsers?.filter(u => u.online) || [];
    const votes = session?.votes || [];
    const activeVote = votes.find(v => v.status === 'active');
    const completedVotes = votes.filter(v => v.status === 'completed');
    const votedSessionIds = votes.map(v => v.sessionId);
    const pendingPresentations = presentations.filter(p => !votedSessionIds.includes(p.id));

    // Lanzar votación
    const handleLaunchVote = async (presentation) => {
        if (activeVote) {
            toast.error('Ya hay una votación en curso. Ciérrala primero.');
            return;
        }

        if (connectedUsers.length === 0) {
            toast.error('No hay usuarios conectados para votar');
            return;
        }

        setLaunching(true);
        try {
            await VotingService.launchVote(sessionCode, presentation);
            toast.success(`Votación lanzada: ${presentation.flow || presentation.flujo}`);
        } catch (error) {
            console.error('Error lanzando votación:', error);
            toast.error(error.message || 'Error al lanzar votación');
        } finally {
            setLaunching(false);
        }
    };

    // Cerrar votación anticipadamente
    const handleCloseVoteEarly = async () => {
        if (!confirmCloseVote) return;

        try {
            await VotingService.closeVoteEarly(sessionCode, confirmCloseVote);
            toast.success('Votación cerrada');
        } catch (error) {
            console.error('Error cerrando votación:', error);
            toast.error('Error al cerrar la votación');
        } finally {
            setConfirmCloseVote(null);
        }
    };

    // Cerrar sesión completa
    const handleCloseSession = async () => {
        setClosing(true);
        try {
            const result = await VotingService.closeLiveSession(sessionCode, user.email);
            setSummaryData(result);
            setShowSummary(true);
            setConfirmCloseSession(false);
        } catch (error) {
            console.error('Error cerrando sesión:', error);
            toast.error('Error al cerrar la sesión');
        } finally {
            setClosing(false);
        }
    };

    const handleSummaryClose = () => {
        setShowSummary(false);
        onClose();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-semibold">Panel de Control</h1>
                        <p className="text-sm text-muted-foreground">Código: {sessionCode}</p>
                    </div>
                </div>

                <Button
                    variant="outline"
                    onClick={() => setConfirmCloseSession(true)}
                    disabled={!!activeVote || closing}
                    className="text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                >
                    Cerrar sesión
                </Button>
            </div>

            {/* Usuarios conectados */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                            Conectados: {connectedUsers.length}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {connectedUsers.map(u => (
                            <span
                                key={u.email}
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-700 dark:text-green-400"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                {u.name || u.email.split('@')[0]}
                            </span>
                        ))}
                        {connectedUsers.length === 0 && (
                            <p className="text-xs text-muted-foreground">Esperando conexiones...</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Votación activa */}
            {activeVote && (
                <Card className="border-primary/30 ring-1 ring-primary/20">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <CircleDot className="w-4 h-4 text-primary animate-pulse" />
                                Votación en curso
                            </CardTitle>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setConfirmCloseVote(activeVote.voteId)}
                                className="text-amber-600 border-amber-500/30"
                            >
                                Cerrar anticipadamente
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <h3 className="font-semibold">{activeVote.happyPath}</h3>
                            <p className="text-sm text-muted-foreground">
                                {activeVote.presenterName} · {activeVote.ticket}
                            </p>
                        </div>
                        <LiveVoteResults vote={activeVote} isFacilitator={true} />
                    </CardContent>
                </Card>
            )}

            {/* Presentaciones pendientes */}
            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Presentaciones pendientes ({pendingPresentations.length})
                </h2>

                {pendingPresentations.length === 0 ? (
                    <Card>
                        <CardContent className="p-6 text-center text-muted-foreground">
                            <p className="text-sm">No hay presentaciones pendientes.</p>
                            <p className="text-xs mt-1">Puedes cerrar la sesión de votaciones.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {pendingPresentations.map((p, index) => (
                            <PresentationCard
                                key={p.id}
                                presentation={p}
                                index={index}
                                onLaunch={handleLaunchVote}
                                disabled={!!activeVote || launching}
                                launching={launching}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Historial de votaciones completadas */}
            {completedVotes.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Completadas ({completedVotes.length})
                    </h2>

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
                            <CardContent className="p-4">
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

                                {/* Detalle expandible para facilitador */}
                                <LiveVoteResults vote={vote} isFacilitator={true} />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* AlertDialog: Cerrar votación anticipadamente */}
            <AlertDialog open={!!confirmCloseVote} onOpenChange={(open) => !open && setConfirmCloseVote(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Cerrar votación anticipadamente?</AlertDialogTitle>
                        <AlertDialogDescription>
                            El resultado se calculará con los votos recibidos hasta ahora.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCloseVoteEarly}>
                            Cerrar votación
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* AlertDialog: Cerrar sesión completa */}
            <AlertDialog open={confirmCloseSession} onOpenChange={setConfirmCloseSession}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Cerrar sesión de votaciones?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Se guardarán todos los resultados y las nuevas sesiones se agendarán para el próximo día hábil.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={closing}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCloseSession} disabled={closing}>
                            {closing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Cerrando...
                                </>
                            ) : (
                                'Cerrar sesión'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal de resumen */}
            <SessionSummaryModal
                open={showSummary}
                onClose={handleSummaryClose}
                summary={summaryData}
                votes={completedVotes}
            />
        </div>
    );
}
