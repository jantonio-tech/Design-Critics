import React, { useState, useEffect } from 'react';
import { useHappyPaths } from '../hooks/useHappyPaths';
import firebase from '../utils/firebase';

const PRODUCTS = ['PGH', 'Recadia', 'Cambio Seguro', 'Factoring', 'Gestora', 'Transversal', 'Web Pública'];
const TYPES = ['Critic', 'Iteración DS', 'Normal', 'Nuevo scope', 'Cambio de alcance'];
const VALID_DOMAIN = '@prestamype.com';

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
        figmaLink: '' // Nuevo campo para Figma
    });

    // Si estamos editando, usar initialData
    useEffect(() => {
        if (initialData) {
            setFormData({
                product: initialData.product || 'PGH',
                ticket: initialData.ticket || '',
                flow: initialData.flow || '',
                type: initialData.type || 'Critic',
                notes: initialData.notes || '',
                // Si ya existe el link guardado, usarlo, sino intentar extraerlo del ticket si tuviéramos acceso
                figmaLink: initialData.figmaLink || ''
            });
        }
    }, [initialData]);

    // Hook de Figma
    const { happyPaths, loading: loadingHappyPaths, refresh: refreshHappyPaths } = useHappyPaths(formData.figmaLink);

    // Filter tickets logic (similar to original Modal)
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

    const handleTicketChange = (e) => {
        const selectedKey = e.target.value;
        const selectedTicket = activeTickets.find(t => t.key === selectedKey);

        // Auto-detect product logic
        let detectedProduct = '';
        if (selectedTicket) {
            const summaryUpper = (selectedTicket.summary || '').toUpperCase();
            const colonIndex = summaryUpper.indexOf(':');
            const prefix = colonIndex > -1 ? summaryUpper.substring(0, colonIndex) : '';

            if (prefix && /\bPGH\b/.test(prefix)) detectedProduct = 'PGH';
            else if (summaryUpper.includes('RECADIA')) detectedProduct = 'Recadia';
            else if (summaryUpper.includes('CAMBIO SEGURO') || (prefix && /\bCS\b/.test(prefix))) detectedProduct = 'Cambio Seguro';
            else if (prefix && /\bFACTORING\b/.test(prefix)) detectedProduct = 'Factoring';
            else if (summaryUpper.includes('GESTORA')) detectedProduct = 'Gestora';

            if (/^TRANSVERSAL\s*:/i.test(selectedTicket.summary || '')) {
                detectedProduct = 'Transversal';
            } else if (summaryUpper.includes('TRANSVERSAL')) {
                detectedProduct = 'Transversal';
            }
        }

        setFormData(prev => ({
            ...prev,
            ticket: selectedKey,
            product: detectedProduct || prev.product
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Validation handled by HTML5 required attributes + internal checks
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Producto y Ticket */}
            <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                    <label className="form-label required">Producto</label>
                    <select
                        name="product"
                        className="form-select"
                        value={formData.product}
                        onChange={handleChange}
                        required
                    >
                        {PRODUCTS.map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label required">Ticket Jira</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            list="tickets-list"
                            name="ticket"
                            className="form-input"
                            value={formData.ticket}
                            onChange={handleTicketChange}
                            placeholder="UX-123"
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
            </div>

            {/* FIGMA INTEGRATION */}
            <div className="form-group p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <label className="form-label text-primary">🎨 Link de Figma (Detectar Happy Paths)</label>
                <div className="flex gap-2">
                    <input
                        type="url"
                        name="figmaLink"
                        className="form-input flex-1"
                        value={formData.figmaLink}
                        onChange={handleChange}
                        placeholder="https://www.figma.com/file/..."
                    />
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => refreshHappyPaths()}
                        disabled={loadingHappyPaths || !formData.figmaLink}
                        title="Recargar Happy Paths"
                    >
                        {loadingHappyPaths ? '🔄' : '🔍'}
                    </button>
                </div>

                {/* Happy Paths Dropdown */}
                {happyPaths.length > 0 && (
                    <div className="mt-3 search-animation">
                        <label className="form-label text-sm text-green-700">✅ Happy Paths detectados:</label>
                        <select
                            className="form-select border-green-300 bg-green-50"
                            onChange={(e) => setFormData(prev => ({ ...prev, flow: e.target.value }))}
                            value={formData.flow}
                        >
                            <option value="">-- Seleccionar un Happy Path --</option>
                            {happyPaths.map(hp => (
                                <option key={hp.id} value={hp.name}>
                                    {hp.name}
                                </option>
                            ))}
                        </select>
                        <div className="text-xs text-gray-500 mt-1">
                            Selecciona uno para autocompletar el campo Flujo
                        </div>
                    </div>
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
                        placeholder="Ej: Registro de usuario"
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
                    placeholder="Link a documentación, observaciones, etc."
                />
            </div>

            <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                    Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                    {initialData ? 'Guardar Cambios' : 'Agendar Sesión'}
                </button>
            </div>
        </form>
    );
}

export default CreateCriticsSession;
