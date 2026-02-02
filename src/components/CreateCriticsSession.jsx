import React, { useState, useEffect } from 'react';
import { useHappyPaths } from '../hooks/useHappyPaths';

const PRODUCTS = ['PGH', 'Recadia', 'Cambio Seguro', 'Factoring', 'Gestora', 'Transversal', 'Web Pública'];
const TYPES = ['Design Critic', 'Iteración DS', 'Nuevo scope'];

export function CreateCriticsSession({
    onSubmit,
    onClose,
    initialData,
    user,
    activeTickets = []
}) {
    const [formData, setFormData] = useState({
        product: 'PGH',
        ticket: '',
        flow: '',
        type: 'Design Critic',
        notes: '',
        figmaLink: ''
    });

    const [detectingLink, setDetectingLink] = useState(false);
    const [linkError, setLinkError] = useState(null);

    // Initial Data Load & Auto-Detect Logic
    useEffect(() => {
        if (initialData) {
            const ticketKey = initialData.ticket || '';
            let product = initialData.product || 'PGH';

            // Auto-detect product if ticket is provided but product is default/empty
            // Re-using logic from handleTicketChange for consistency
            if (ticketKey && activeTickets.length > 0) {
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

            setFormData({
                product: product,
                ticket: ticketKey,
                flow: initialData.flow || '',
                type: initialData.type || 'Design Critic',
                notes: initialData.notes || '',
                figmaLink: initialData.figmaLink || ''
            });

            // Trigger link fetch if needed (simulating selection)
            if (ticketKey && ticketKey.includes('-') && !initialData.figmaLink) {
                // We need to fetch the link. 
                // Since this runs on mount/change, we can trigger the async fetch here.
                fetchFigmaLink(ticketKey);
            }
        }
    }, [initialData, activeTickets]);

    // Helper to fetch link (extracted from handleTicketChange)
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


    // Happy Paths Hook
    const { happyPaths, loading: loadingHappyPaths, refresh: refreshHappyPaths } = useHappyPaths(formData.figmaLink);

    // Filter tickets logic
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

        // 1. Detect Product from Ticket Summary locally (fast)
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
            figmaLink: '',   // Reset link
            flow: ''         // Reset flow
        }));

        // 2. Auto-fetch Figma Link from Jira (Async)
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
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Producto y Ticket */}
            {/* Tipo */}
            <div className="form-group">
                <label className="form-label required">Tipo</label>
                <select
                    name="type"
                    className="form-select"
                    value={formData.type}
                    onChange={handleChange}
                    required
                >
                    {TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>
            </div>

            {/* Ticket Jira */}
            <div className="form-group">
                <label className="form-label required">Ticket de Jira</label>
                <div style={{ position: 'relative' }}>
                    <select
                        name="ticket"
                        className="form-select"
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
                </div>
            </div>

            {/* AUTOMATIC HAPPY PATHS SECTION */}
            <div className="form-group p-4 bg-gray-50 border border-gray-200 rounded-lg">
                {/* Status: No ticket selected - Instructions removed as requested */}

                {/* Status: Detecting Link */}
                {detectingLink && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                        <span className="animate-spin">⏳</span>
                        Buscando link de Figma en Jira...
                    </div>
                )}

                {/* Status: Error finding link */}
                {!detectingLink && linkError && formData.ticket && !formData.figmaLink && (
                    <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
                        ⚠️ <strong>No se detectó link de Figma.</strong>
                        <div className="mt-1">
                            Por favor, ingresa el link de Figma en el campo "Solución" o "Descripción" de tu ticket en Jira y vuelve a seleccionarlo.
                        </div>
                    </div>
                )}

                {/* Status: Link Found & Loading Paths */}
                {formData.figmaLink && (
                    <>
                        {/* Hidden URL display as requested */}

                        {loadingHappyPaths ? (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="animate-spin">🔄</span>
                                Cargando Happy Paths desde Figma...
                            </div>
                        ) : happyPaths.length > 0 ? (
                            <div className="search-animation">
                                <label className="form-label text-sm text-green-700">✅ Selecciona un Happy Path:</label>
                                <select
                                    className="form-select border-green-300 bg-green-50"
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
                            </div>
                        ) : (
                            <div className="text-sm text-red-500">
                                ❌ No se encontraron Happy Paths (Frames que empiecen con "HP-").
                                <button type="button" onClick={refreshHappyPaths} className="ml-2 text-blue-500 underline text-xs">Reintentar</button>
                            </div>
                        )}
                    </>
                )}
            </div>





            <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                    Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={detectingLink || !formData.ticket || !formData.flow || !formData.type}>
                    {initialData ? 'Guardar Cambios' : 'Agendar'}
                </button>
            </div>
        </form>
    );
}

export default CreateCriticsSession;
