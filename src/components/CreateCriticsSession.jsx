import React, { useState, useEffect } from 'react';
import { useHappyPaths } from '../hooks/useHappyPaths';

const PRODUCTS = ['PGH', 'Recadia', 'Cambio Seguro', 'Factoring', 'Gestora', 'Transversal', 'Web Pública'];
const TYPES = ['Critic', 'Iteración DS', 'Normal', 'Nuevo scope', 'Cambio de alcance'];

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
        type: 'Critic',
        notes: '',
        figmaLink: ''
    });

    const [detectingLink, setDetectingLink] = useState(false);
    const [linkError, setLinkError] = useState(null);

    // Initial Data Load
    useEffect(() => {
        if (initialData) {
            setFormData({
                product: initialData.product || 'PGH',
                ticket: initialData.ticket || '',
                flow: initialData.flow || '',
                type: initialData.type || 'Critic',
                notes: initialData.notes || '',
                figmaLink: initialData.figmaLink || ''
            });
        }
    }, [initialData]);

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
            {/* Ticket Jira */}
            <div className="form-group">
                <label className="form-label required">Ticket Jira</label>
                <div style={{ position: 'relative' }}>
                    <input
                        list="tickets-list"
                        name="ticket"
                        className="form-input"
                        value={formData.ticket}
                        onChange={handleTicketChange}
                        placeholder="Buscar ticket (ej: UX-123)..."
                        required
                        autoComplete="off"
                    />
                    <datalist id="tickets-list">
                        {filteredTickets.map(t => (
                            <option key={t.key} value={t.key}>
                                {t.key} - {t.summary}
                            </option>
                        ))}
                    </datalist>
                </div>
            </div>

            {/* AUTOMATIC HAPPY PATHS SECTION */}
            <div className="form-group p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <label className="form-label text-primary mb-2">
                    🎨 Happy Paths del Ticket
                </label>

                {/* Status: No ticket selected */}
                {!formData.ticket && (
                    <div className="text-sm text-gray-400 italic">
                        Selecciona un ticket arriba para buscar automáticamente el link de Figma.
                    </div>
                )}

                {/* Status: Detecting Link */}
                {detectingLink && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                        <span className="animate-spin">⏳</span>
                        Buscando link de Figma en Jira...
                    </div>
                )}

                {/* Status: Error finding link */}
                {!detectingLink && linkError && formData.ticket && !formData.figmaLink && (
                    <div className="text-sm text-orange-600">
                        ⚠️ {linkError}
                        <div className="mt-1 text-xs text-gray-500">
                            Asegúrate que el ticket tenga el link en el campo "Solución".
                        </div>
                    </div>
                )}

                {/* Status: Link Found & Loading Paths */}
                {formData.figmaLink && (
                    <>
                        <div className="text-xs text-gray-400 mb-2 truncate">
                            🔗 Link detectado: {formData.figmaLink}
                        </div>

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

            {/* Flujo y Tipo */}
            <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                    <label className="form-label required">Flujo / Nombre</label>
                    <input
                        type="text"
                        name="flow"
                        className="form-input"
                        value={formData.flow}
                        onChange={handleChange}
                        placeholder="Se autocompleta con el Happy Path"
                        required
                    />
                </div>

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
            </div>

            <div className="form-group">
                <label className="form-label">Notas adicionales</label>
                <textarea
                    name="notes"
                    className="form-textarea"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Observaciones..."
                />
            </div>

            <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                    Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={detectingLink}>
                    {initialData ? 'Guardar Cambios' : 'Agendar Sesión'}
                </button>
            </div>
        </form>
    );
}

export default CreateCriticsSession;
