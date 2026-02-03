import React, { useState, useEffect } from 'react';
import { useHappyPaths } from '../hooks/useHappyPaths';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRODUCTS = ['PGH', 'Recadia', 'Cambio Seguro', 'Factoring', 'Gestora', 'Transversal', 'Web Pública'];
const TYPES = ['Design Critic', 'Iteración DS', 'Nuevo scope'];

function CreateCriticsSession({
    onSubmit,
    onClose,
    initialData,
    user,
    activeTickets = [],
    sessions = [],
    readOnlyFields = [],
    excludeTypes = []
}) {
    const props = { readOnlyFields };
    const [formData, setFormData] = useState({
        product: '',
        ticket: '',
        flow: '',
        type: 'Design Critic',
        notes: '',
        figmaLink: ''
    });

    const isReadOnly = (field) => {
        return props.readOnlyFields && props.readOnlyFields.includes(field);
    };

    const [detectingLink, setDetectingLink] = useState(false);
    const [linkError, setLinkError] = useState(null);

    useEffect(() => {
        if (initialData) {
            const ticketKey = initialData.ticket || '';
            let product = initialData.product || '';

            if (!product && ticketKey && activeTickets.length > 0) {
                const selectedTicket = activeTickets.find(t => t.key === ticketKey);
                if (selectedTicket) {
                    const summaryUpper = (selectedTicket.summary || '').toUpperCase();
                    const colonIndex = summaryUpper.indexOf(':');
                    const prefix = colonIndex > -1 ? summaryUpper.substring(0, colonIndex) : '';

                    if (prefix && /\bPGH\b/.test(prefix)) product = 'PGH';
                    else if (summaryUpper.includes('RECADIA')) product = 'Recadia';
                    else if (summaryUpper.includes('CAMBIO SEGURO') || (prefix && /\bCS\b/.test(prefix))) product = 'Cambio Seguro';
                    else if (prefix && /\bFACTORING\b/.test(prefix)) product = 'Factoring';
                    else if (summaryUpper.includes('GESTORA')) product = 'Gestora';
                    if (/^TRANSVERSAL\s*:/i.test(selectedTicket.summary || '') || summaryUpper.includes('TRANSVERSAL')) {
                        product = 'Transversal';
                    }
                }
            }

            if (!product) product = 'PGH';

            setFormData({
                product: product,
                ticket: ticketKey,
                flow: initialData.flow || '',
                type: initialData.type || 'Design Critic',
                notes: initialData.notes || '',
                figmaLink: initialData.figmaLink || ''
            });

            if (!initialData.figmaLink && ticketKey && ticketKey.includes('-')) {
                fetchFigmaLink(ticketKey);
            }
        }
    }, [initialData, activeTickets]);

    const fetchFigmaLink = async (key) => {
        setDetectingLink(true);
        setLinkError(null);
        try {
            const res = await fetch('/api/get-jira-field', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketKey: key })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.figmaLink) {
                    setFormData(prev => ({ ...prev, figmaLink: data.figmaLink }));
                } else {
                    setLinkError('No se encontró link de Figma en el ticket (campo Solución o Descripción).');
                }
            } else {
                setLinkError('Error consultando Jira.');
            }
        } catch (err) {
            console.error(err);
            setLinkError('Error de conexión.');
        } finally {
            setDetectingLink(false);
        }
    };

    const { happyPaths, loading: loadingHappyPaths, refresh: refreshHappyPaths, hasLoaded } = useHappyPaths(formData.figmaLink);

    const canDoNewScope = React.useMemo(() => {
        if (!formData.ticket || !formData.flow) return false;
        return sessions.some(s =>
            s.ticket === formData.ticket &&
            s.flow === formData.flow &&
            s.type === 'Design Critic'
        );
    }, [sessions, formData.ticket, formData.flow]);

    useEffect(() => {
        if (formData.type === 'Nuevo alcance' && !canDoNewScope) {
            setFormData(prev => ({ ...prev, type: 'Design Critic' }));
        }
    }, [canDoNewScope, formData.type]);

    const filteredTickets = activeTickets.filter(ticket => {
        if (ticket.key === formData.ticket) return true;
        const statusCat = ticket.statusCategory?.key || ticket.status?.statusCategory?.key;
        const statusName = (ticket.status?.name || ticket.status || '').toString().toLowerCase();
        if (statusCat === 'done') return false;
        if (statusName === 'listo' || statusName === 'finalizado' || statusName === 'done') return false;
        return true;
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTicketChange = async (e) => {
        const selectedKey = e.target.value;
        const selectedTicket = activeTickets.find(t => t.key === selectedKey);
        let detectedProduct = formData.product;

        if (selectedTicket) {
            const summaryUpper = (selectedTicket.summary || '').toUpperCase();
            const colonIndex = summaryUpper.indexOf(':');
            const prefix = colonIndex > -1 ? summaryUpper.substring(0, colonIndex) : '';

            if (prefix && /\bPGH\b/.test(prefix)) detectedProduct = 'PGH';
            else if (summaryUpper.includes('RECADIA')) detectedProduct = 'Recadia';
            else if (summaryUpper.includes('CAMBIO SEGURO') || (prefix && /\bCS\b/.test(prefix))) detectedProduct = 'Cambio Seguro';
            else if (prefix && /\bFACTORING\b/.test(prefix)) detectedProduct = 'Factoring';
            else if (summaryUpper.includes('GESTORA')) detectedProduct = 'Gestora';
            if (/^TRANSVERSAL\s*:/i.test(selectedTicket.summary || '') || summaryUpper.includes('TRANSVERSAL')) {
                detectedProduct = 'Transversal';
            }
        }

        setFormData(prev => ({
            ...prev,
            ticket: selectedKey,
            product: detectedProduct,
            figmaLink: '',
            flow: ''
        }));

        if (selectedKey && selectedKey.includes('-')) {
            setDetectingLink(true);
            setLinkError(null);
            try {
                const res = await fetch('/api/get-jira-field', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ticketKey: selectedKey })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.figmaLink) {
                        setFormData(prev => ({ ...prev, figmaLink: data.figmaLink }));
                    } else {
                        setLinkError('No se encontró link de Figma en el ticket (campo Solución o Descripción).');
                    }
                } else {
                    setLinkError('Error consultando Jira.');
                }
            } catch (err) {
                console.error(err);
                setLinkError('Error de conexión.');
            } finally {
                setDetectingLink(false);
            }
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-full min-w-0">
            {/* Ticket Jira */}
            <div className="space-y-2">
                <Label className="text-sm font-medium">
                    Ticket de Jira <span className="text-destructive">*</span>
                </Label>

                {isReadOnly('ticket') && formData.ticket ? (
                    <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                        <span className="truncate">
                            {formData.ticket} - {activeTickets.find(t => t.key === formData.ticket)?.summary}
                        </span>
                    </div>
                ) : (
                    <select
                        name="ticket"
                        className="flex h-9 w-full max-w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
                        value={formData.ticket}
                        onChange={handleTicketChange}
                        required
                    >
                        <option value="">-- Seleccionar ticket --</option>
                        {filteredTickets.map(t => (
                            <option key={t.key} value={t.key}>
                                {t.summary}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* Automatic Happy Paths Section */}
            <div className="space-y-2">
                {detectingLink && (
                    <div className="flex items-center gap-2 text-sm text-primary">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Buscando link de Figma en Jira...
                    </div>
                )}

                {!detectingLink && linkError && formData.ticket && !formData.figmaLink && (
                    <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 space-y-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-yellow-600 dark:text-yellow-500">
                            <AlertTriangle className="h-4 w-4" />
                            Falta el link de Figma
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Agrégalo en el campo "Solución" o "Descripción" del ticket en Jira y vuelve a seleccionarlo.
                        </p>
                    </div>
                )}

                {formData.figmaLink && (
                    <>
                        {loadingHappyPaths || !hasLoaded ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Cargando Happy Paths desde Figma...
                            </div>
                        ) : happyPaths.length > 0 ? (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <Label className="text-sm font-medium">
                                    Happy Path <span className="text-destructive">*</span>
                                </Label>
                                {isReadOnly('flow') && formData.flow ? (
                                    <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                                        {formData.flow}
                                    </div>
                                ) : (
                                    <select
                                        className="flex h-9 w-full max-w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
                                        onChange={(e) => setFormData(prev => ({ ...prev, flow: e.target.value }))}
                                        value={formData.flow}
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {happyPaths.map(hp => (
                                            <option key={hp.id} value={hp.name}>
                                                {hp.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-destructive">
                                ❌ No se encontraron Happy Paths (Frames que empiecen con "HP-").
                                <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    onClick={refreshHappyPaths}
                                    className="h-auto p-0 text-xs"
                                >
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Reintentar
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Session Type - Radio Cards */}
            {formData.flow && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Label className="text-sm font-medium">
                        Tipo de sesión <span className="text-destructive">*</span>
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <label
                            className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                formData.type === 'Design Critic'
                                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                                    : "border-input hover:bg-muted"
                            )}
                        >
                            <input
                                type="radio"
                                name="type"
                                value="Design Critic"
                                checked={formData.type === 'Design Critic'}
                                onChange={handleChange}
                                className="h-4 w-4 text-primary accent-primary"
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">Design Critic</span>
                                <span className="text-xs text-muted-foreground">Primera revisión del flujo</span>
                            </div>
                        </label>

                        {!excludeTypes.includes('Iteración DS') && (
                            <label
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                    formData.type === 'Iteración DS'
                                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                                        : "border-input hover:bg-muted"
                                )}
                            >
                                <input
                                    type="radio"
                                    name="type"
                                    value="Iteración DS"
                                    checked={formData.type === 'Iteración DS'}
                                    onChange={handleChange}
                                    className="h-4 w-4 text-primary accent-primary"
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">Iteración DS</span>
                                    <span className="text-xs text-muted-foreground">Revisión de cambios</span>
                                </div>
                            </label>
                        )}

                        {!excludeTypes.includes('Nuevo alcance') && canDoNewScope && (
                            <label
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                    formData.type === 'Nuevo alcance'
                                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                                        : "border-input hover:bg-muted"
                                )}
                            >
                                <input
                                    type="radio"
                                    name="type"
                                    value="Nuevo alcance"
                                    checked={formData.type === 'Nuevo alcance'}
                                    onChange={handleChange}
                                    className="h-4 w-4 text-primary accent-primary"
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">Nuevo alcance</span>
                                    <span className="text-xs text-muted-foreground">Reemplaza a "Nuevo scope"</span>
                                </div>
                            </label>
                        )}
                    </div>
                </div>
            )}

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose}>
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={detectingLink || !formData.ticket || !formData.flow || !formData.type}
                >
                    {initialData?.id ? 'Guardar Cambios' : 'Agendar'}
                </Button>
            </div>
        </form>
    );
}

export default CreateCriticsSession;
