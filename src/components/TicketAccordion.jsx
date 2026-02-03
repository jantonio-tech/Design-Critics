import React, { useState, useEffect } from 'react';
import { useHappyPaths } from '../hooks/useHappyPaths';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TicketSkeleton } from './skeletons/TicketSkeleton';

export function TicketAccordion({
    ticket,
    sessions = [],
    onSchedule
}) {
    const [expanded, setExpanded] = useState(false);
    const [figmaLink, setFigmaLink] = useState(null);

    const { happyPaths, loading: loadingHPs, error: errorHPs, hasLoaded } = useHappyPaths(figmaLink);

    // Calculate progress with "Nuevo alcance" reset logic
    const { validFlowCounts, totalCriticsDone } = React.useMemo(() => {
        const ticketSessions = sessions.filter(s => s.ticket === ticket.key);
        const flowMap = {};

        ticketSessions.forEach(s => {
            if (!s.flow) return;
            if (!flowMap[s.flow]) flowMap[s.flow] = [];
            flowMap[s.flow].push(s);
        });

        const counts = {};
        let total = 0;

        Object.keys(flowMap).forEach(flow => {
            const sList = flowMap[flow].sort((a, b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0));
            let sliceIndex = 0;
            for (let i = sList.length - 1; i >= 0; i--) {
                if (sList[i].type === 'Nuevo alcance') {
                    sliceIndex = i;
                    break;
                }
            }

            const validSessions = sList.slice(sliceIndex);
            const count = validSessions.filter(s => s.type === 'Design Critic' || s.type === 'Nuevo alcance').length;
            counts[flow] = count;
            total += count;
        });

        return { validFlowCounts: counts, totalCriticsDone: total };
    }, [sessions, ticket.key]);

    const maxCritics = happyPaths.length > 0 ? happyPaths.length * 2 : 0;
    const progressPercent = maxCritics > 0 ? Math.min((totalCriticsDone / maxCritics) * 100, 100) : 0;

    const getProductBadge = (ticket) => {
        const summaryUpper = (ticket.fields?.summary || ticket.summary || '').toUpperCase();
        if (summaryUpper.includes('PGH')) return 'PGH';
        if (summaryUpper.includes('RECADIA')) return 'Recadia';
        if (summaryUpper.includes('CAMBIO SEGURO')) return 'Cambio Seguro';
        if (summaryUpper.includes('FACTORING')) return 'Factoring';
        if (summaryUpper.includes('GESTORA')) return 'Gestora';
        if (summaryUpper.includes('TRANSVERSAL')) return 'Transversal';
        return 'Producto';
    };
    const product = getProductBadge(ticket);

    useEffect(() => {
        const fetchFigmaLink = async () => {
            try {
                if (figmaLink) return;

                const resLink = await fetch('/api/get-jira-field', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ticketKey: ticket.key })
                });

                if (!resLink.ok) throw new Error('Failed to check Jira');
                const dataLink = await resLink.json();

                if (dataLink.figmaLink) {
                    setFigmaLink(dataLink.figmaLink);
                }
            } catch (err) {
                console.error("Error loading Figma Link for ticket", ticket.key, err);
            }
        };

        fetchFigmaLink();
    }, [ticket.key]);

    const getHpStatus = (hpName) => {
        const count = validFlowCounts[hpName] || 0;

        if (count >= 3) return { status: 'danger', count, label: `${count}/2 Critics (Excedido)`, action: 'Agendar Hoy' };
        if (count === 2) return { status: 'warning', count, label: `${count}/2 Critics (Límite)`, action: 'Agendar Hoy' };
        return { status: 'good', count, label: `${count}/2 Critics`, action: 'Agendar Hoy' };
    };

    // Show skeleton until EVERYTHING (including progress) is ready
    if (loadingHPs || !hasLoaded) {
        return <TicketSkeleton />;
    }

    return (
        <Card className={cn("transition-all", expanded && "ring-1 ring-primary/20")}>
            {/* Header */}
            <CardHeader
                className="cursor-pointer p-4 pb-3"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">{ticket.key}</span>
                        <Badge variant="secondary" className="text-xs">
                            {product}
                        </Badge>
                    </div>
                    <div className="text-muted-foreground">
                        {expanded ? (
                            <ChevronUp className="h-5 w-5" />
                        ) : (
                            <ChevronDown className="h-5 w-5" />
                        )}
                    </div>
                </div>

                <h3 className="text-sm font-semibold leading-tight mt-2 pr-6">
                    {ticket.fields?.summary || ticket.summary}
                </h3>

                {/* Progress Section */}
                {happyPaths.length > 0 && (
                    <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span className="font-medium">
                                {loadingHPs ? 'Calculando...' : maxCritics > 0 ? `${totalCriticsDone}/${maxCritics} Critics` : `${totalCriticsDone} Critics`}
                            </span>
                            <span>({happyPaths.length} HPs)</span>
                        </div>
                        {maxCritics > 0 && (
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all duration-500",
                                        progressPercent >= 100 ? "bg-green-500" : "bg-primary"
                                    )}
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Quick Schedule CTA (Collapsed only) */}
                {!expanded && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3 bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSchedule({
                                ticket: ticket.key,
                                product: product,
                                type: 'Design Critic',
                                figmaLink: figmaLink
                            });
                        }}
                    >
                        Agendar Hoy
                    </Button>
                )}
            </CardHeader>

            {/* Expanded Body */}
            {expanded && (
                <CardContent className="border-t bg-muted/30 p-4 pt-4">
                    <h4 className="text-xs uppercase text-muted-foreground font-semibold mb-3">
                        Detalle de Happy Paths
                    </h4>

                    {loadingHPs && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Cargando flujos desde Figma...
                        </div>
                    )}

                    {!loadingHPs && happyPaths.length === 0 && (
                        <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground mb-3">
                                No se detectaron frames "HP-" en el archivo de Figma asociado.
                            </p>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => onSchedule({ ticket: ticket.key, product, type: 'Design Critic' })}
                            >
                                Agendar Manualmente
                            </Button>
                        </div>
                    )}

                    <div className="space-y-0">
                        {happyPaths.map(hp => {
                            const status = getHpStatus(hp.name);
                            return (
                                <div
                                    key={hp.id}
                                    className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
                                >
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-sm font-medium">{hp.name}</span>
                                        <span className={cn(
                                            "text-xs font-semibold",
                                            status.status === 'good' && "text-green-600 dark:text-green-400",
                                            status.status === 'warning' && "text-yellow-600 dark:text-yellow-400",
                                            status.status === 'danger' && "text-red-600 dark:text-red-400"
                                        )}>
                                            {status.label}
                                        </span>
                                    </div>
                                    {status.action && (
                                        <Button
                                            size="sm"
                                            onClick={() => onSchedule({
                                                ticket: ticket.key,
                                                product: product,
                                                flow: hp.name,
                                                type: 'Design Critic',
                                                lockFlow: true,
                                                figmaLink: figmaLink
                                            })}
                                        >
                                            {status.action}
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            )}
        </Card>
    );
}

function activeHPsCount(hps) {
    return hps ? hps.length : 0;
}
