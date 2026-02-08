/**
 * Batch endpoint para obtener Figma links de múltiples tickets en una sola llamada.
 * Elimina el problema N+1 donde cada TicketAccordion hacía su propio fetch.
 *
 * POST /api/batch-jira-fields
 * Body: { ticketKeys: ["UX-123", "UX-456", ...] }
 * Response: { success: true, results: { "UX-123": "https://figma.com/...", "UX-456": "" } }
 */
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { ticketKeys } = req.body;

        if (!Array.isArray(ticketKeys) || ticketKeys.length === 0) {
            return res.status(400).json({ error: 'ticketKeys must be a non-empty array' });
        }

        // Limitar a 20 tickets por request para evitar abuso
        const keys = ticketKeys.slice(0, 20);

        const email = process.env.JIRA_EMAIL || process.env.VITE_JIRA_EMAIL;
        const token = process.env.JIRA_API_TOKEN || process.env.VITE_JIRA_API_TOKEN;
        const domain = process.env.JIRA_DOMAIN || process.env.VITE_JIRA_DOMAIN || 'prestamype.atlassian.net';

        if (!email || !token) {
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const auth = Buffer.from(`${email}:${token}`).toString('base64');

        // Fetch todos los tickets en paralelo (máx 5 concurrentes)
        const results = {};
        const batchSize = 5;

        for (let i = 0; i < keys.length; i += batchSize) {
            const batch = keys.slice(i, i + batchSize);
            const promises = batch.map(ticketKey => fetchFigmaLink(ticketKey, domain, auth));
            const batchResults = await Promise.all(promises);

            batch.forEach((key, idx) => {
                results[key] = batchResults[idx];
            });
        }

        return res.status(200).json({ success: true, results });

    } catch (e) {
        console.error('batch-jira-fields error:', e);
        return res.status(500).json({ error: e.message });
    }
}

async function fetchFigmaLink(ticketKey, domain, auth) {
    try {
        const url = `https://${domain}/rest/api/3/issue/${ticketKey}?expand=names`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) return '';

        const data = await response.json();

        if (!data.fields.description) return '';

        const raw = JSON.stringify(data.fields.description);

        // Buscar link de Figma después de "✅ Solución:"
        const patterns = [
            /✅\s*Soluci[oó]n[:\s]*.*?(https?:\/\/(www\.)?figma\.com\/[^"\s<>]*)/i,
            /✅\s*Soluci[oó]n.*?"url":"(https?:\/\/[^"]*figma\.com[^"]*)"/i
        ];

        for (const pattern of patterns) {
            const match = raw.match(pattern);
            if (match) return match[1];
        }

        return '';
    } catch (error) {
        console.error(`Error fetching ${ticketKey}:`, error.message);
        return '';
    }
}
