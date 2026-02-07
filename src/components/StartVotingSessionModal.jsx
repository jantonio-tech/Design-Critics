import React, { useState, useEffect } from 'react';
import { VotingService } from '../services/voting';
import { getPeruDateStr } from '../utils/votingHelpers';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Vote, Copy, Users, Loader2, CheckCircle2 } from 'lucide-react';

/**
 * Modal para iniciar una nueva sesión de votaciones del día.
 * Genera código, muestra link y QR, y monitorea conexiones.
 */
export function StartVotingSessionModal({ open, onClose, user, onSessionCreated }) {
    const [loading, setLoading] = useState(false);
    const [sessionCode, setSessionCode] = useState(null);
    const [session, setSession] = useState(null);
    const [copied, setCopied] = useState(false);

    const todayStr = getPeruDateStr();
    const baseUrl = window.location.origin;
    const voteLink = sessionCode ? `${baseUrl}/live/${sessionCode}` : '';

    // Verificar si ya existe sesión activa de hoy
    useEffect(() => {
        if (!open) return;

        let unsubscribe;

        const checkExisting = async () => {
            const existing = await VotingService.getTodayActiveSession();
            if (existing && existing.status === 'active') {
                setSessionCode(existing.code);

                // Suscribirse a cambios
                unsubscribe = VotingService.subscribeToSession(existing.code, (data) => {
                    setSession(data);
                });
            }
        };

        checkExisting();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [open]);

    const handleCreate = async () => {
        setLoading(true);
        try {
            const code = await VotingService.createLiveSession(todayStr, user.email);
            setSessionCode(code);

            // Suscribirse a la sesión
            const unsubscribe = VotingService.subscribeToSession(code, (data) => {
                setSession(data);
            });

            toast.success('Sesión de votaciones creada');

            // Limpiar al desmontar
            return () => unsubscribe();
        } catch (error) {
            console.error('Error creando sesión:', error);
            toast.error('Error al crear la sesión de votaciones');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        const message = `🗳️ Votación de Design Critics\n${voteLink}\nCódigo: ${sessionCode}`;

        try {
            await navigator.clipboard.writeText(message);
            setCopied(true);
            toast.success('Mensaje copiado al portapapeles');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback para navegadores sin clipboard API
            const textarea = document.createElement('textarea');
            textarea.value = message;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleContinue = () => {
        if (sessionCode) {
            onSessionCreated(sessionCode);
        }
        onClose();
    };

    const connectedUsers = session?.connectedUsers?.filter(u => u.online) || [];

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Vote className="w-5 h-5 text-primary" />
                        Sesión de Votaciones
                    </DialogTitle>
                    <DialogDescription>
                        {sessionCode
                            ? 'Comparte el link en el chat de Google Meet'
                            : 'Crea una sesión para votar las presentaciones de hoy'
                        }
                    </DialogDescription>
                </DialogHeader>

                {!sessionCode ? (
                    // Botón para crear sesión
                    <div className="space-y-4 py-4">
                        <div className="text-center text-sm text-muted-foreground">
                            <p>Se generará un link único para la sesión de hoy.</p>
                            <p className="mt-1">Los asistentes podrán votar desde el link.</p>
                        </div>
                        <Button
                            onClick={handleCreate}
                            disabled={loading}
                            className="w-full"
                            size="lg"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creando...
                                </>
                            ) : (
                                'Crear sesión de votaciones'
                            )}
                        </Button>
                    </div>
                ) : (
                    // Sesión creada - Mostrar link y conectados
                    <div className="space-y-4 py-2">
                        {/* Link para compartir */}
                        <Card className="bg-muted/50">
                            <CardContent className="p-4 space-y-3">
                                <p className="text-xs font-medium text-muted-foreground">Comparte en el chat de Meet:</p>

                                <div className="bg-background rounded-md p-3 border text-sm font-mono break-all">
                                    <p>🗳️ Votación de Design Critics</p>
                                    <p className="text-primary font-semibold">{voteLink}</p>
                                    <p className="text-muted-foreground">Código: {sessionCode}</p>
                                </div>

                                <Button
                                    variant="outline"
                                    onClick={handleCopy}
                                    className="w-full"
                                    size="sm"
                                >
                                    {copied ? (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                                            Copiado
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4 mr-2" />
                                            Copiar mensaje
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Usuarios conectados */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                Conectados: {connectedUsers.length}
                            </div>

                            {connectedUsers.length > 0 ? (
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
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    Esperando que los asistentes se conecten...
                                </p>
                            )}
                        </div>

                        {/* Botón continuar */}
                        <Button onClick={handleContinue} className="w-full" size="lg">
                            Continuar al panel de control
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
