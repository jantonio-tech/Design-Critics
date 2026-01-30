// Vercel Serverless Function - Jira Search v4
// Updated to use new Jira API endpoint (CHANGE-2846)

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

        const { userEmail } = req.body; // Solo necesitamos saber QUIÉN pide los tickets para filtrar

        // Use server-side environment variables
        const email = process.env.JIRA_EMAIL;
        const token = process.env.JIRA_API_TOKEN;
        const domain = process.env.JIRA_DOMAIN || 'prestamype.atlassian.net';

        // Validate server config
        if (!email || !token) {
            console.error('Missing server-side Jira configuration');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Construct JQL: Filter by the requesting user if provided, otherwise generic
        // If ticketKeys are provided, search for specific tickets (ignoring other filters)
        // If userEmail is provided, search for their assigned tickets
        let searchJql;
        if (req.body.ticketKeys && Array.isArray(req.body.ticketKeys) && req.body.ticketKeys.length > 0) {
            // Batch fetch specific tickets
            const keys = req.body.ticketKeys.map(k => `"${k}"`).join(',');
            searchJql = `key in (${keys}) ORDER BY updated DESC`;
        } else if (userEmail) {
            searchJql = `assignee = "${userEmail}" AND Sprint in openSprints() AND status NOT IN (Done, Closed, Resolved) AND issuetype in standardIssueTypes() ORDER BY updated DESC`;
        } else {
            // Fallback or generic search (e.g. project UX)
            searchJql = `project = UX AND Sprint in openSprints() AND status NOT IN (Done, Closed, Resolved) AND issuetype in standardIssueTypes() ORDER BY updated DESC`;
        }

        // Create Basic Auth header
        const auth = Buffer.from(`${email}:${token}`).toString('base64');

        // NEW Jira API endpoint (POST /rest/api/3/search/jql)
        const url = `https://${domain}/rest/api/3/search/jql`;

        console.log('Fetching from Jira (new API):', url);

        // Call Jira API with POST method and JQL in body
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jql: searchJql,
                maxResults: 50,
                fields: ['key', 'summary', 'status', 'assignee']
            })
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
                message: 'Error al consultar Jira'
            });
        }

        const data = await response.json();

        // Transform issues to simpler format
        const tickets = (data.issues || []).map(issue => ({
            key: issue.key,
            summary: issue.fields?.summary || 'No summary',
            status: issue.fields?.status?.name || 'Unknown',
            statusCategory: issue.fields?.status?.statusCategory?.key || 'new'
        }));

        console.log('Returning', tickets.length, 'tickets');

        return res.status(200).json({
            success: true,
            total: data.total || 0,
            tickets: tickets
        });

    } catch (error) {
        console.error('Server error:', error.message);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Error de conexión con Jira'
        });
    }
};
