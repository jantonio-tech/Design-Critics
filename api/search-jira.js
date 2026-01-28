// Vercel Serverless Function - Jira Search v3
// Simplified version for debugging

module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, token, domain, jql } = req.body;

        // Validate inputs
        if (!email || !token || !domain) {
            return res.status(400).json({ error: 'Missing required fields', received: { email: !!email, token: !!token, domain: !!domain } });
        }

        // Default JQL if not provided
        const searchJql = jql || 'assignee = currentUser() AND status NOT IN (Done, Closed, Resolved) ORDER BY updated DESC';

        // Create Basic Auth header
        const auth = Buffer.from(`${email}:${token}`).toString('base64');

        // Build URL with query parameters
        const url = `https://${domain}/rest/api/3/search?jql=${encodeURIComponent(searchJql)}&maxResults=50&fields=key,summary,status,assignee`;

        console.log('Fetching from Jira:', url.substring(0, 100) + '...');

        // Call Jira API
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        console.log('Jira response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Jira API error:', response.status, errorText);

            if (response.status === 401) {
                return res.status(401).json({
                    error: 'Invalid credentials',
                    message: 'Token inválido o dominio incorrecto'
                });
            }

            if (response.status === 404) {
                return res.status(404).json({
                    error: 'Not found',
                    message: 'Dominio de Jira incorrecto'
                });
            }

            return res.status(response.status).json({
                error: 'Jira API error',
                message: 'Error al consultar Jira',
                details: errorText.substring(0, 200)
            });
        }

        const data = await response.json();

        // Transform issues to simpler format
        const tickets = (data.issues || []).map(issue => ({
            key: issue.key,
            summary: issue.fields?.summary || 'No summary',
            status: issue.fields?.status?.name || 'Unknown'
        }));

        console.log('Returning', tickets.length, 'tickets');

        return res.status(200).json({
            success: true,
            total: data.total || 0,
            tickets: tickets
        });

    } catch (error) {
        console.error('Server error:', error.message, error.stack);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Error de conexión con Jira',
            debug: error.message
        });
    }
};
