// Vercel Serverless Function v2 - Search Jira Tickets
module.exports = async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, token, domain, jql } = req.body;

        // Validate inputs
        if (!email || !token || !domain) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Default JQL if not provided
        const searchJql = jql || 'assignee = currentUser() AND status NOT IN (Done, Closed, Resolved) ORDER BY updated DESC';

        // Create Basic Auth header
        const auth = Buffer.from(`${email}:${token}`).toString('base64');

        // Build URL with query parameters
        const url = `https://${domain}/rest/api/3/search?jql=${encodeURIComponent(searchJql)}&maxResults=50&fields=key,summary,status,assignee`;

        // Call Jira API
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

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
                message: 'Error al consultar Jira'
            });
        }

        const data = await response.json();

        // Transform issues to simpler format
        const tickets = data.issues.map(issue => ({
            key: issue.key,
            summary: issue.fields.summary,
            status: issue.fields.status.name
        }));

        return res.status(200).json({
            success: true,
            total: data.total,
            tickets: tickets
        });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Error de conexión con Jira'
        });
    }
}
