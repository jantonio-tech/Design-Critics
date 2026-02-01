export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { ticketKey, fieldId = 'customfield_10034' } = req.body; // Default ID for "Solution" or similar custom field?
        // Wait, "Solución" field ID varies by Jira instance.
        // I should probably fetch "names" first or ask user?
        // Ideally, we fetch "description" or specific custom field.
        // Let's assume the user knows or we fetch "all" and find by name? NO, expensive.
        // Let's try to find field by name first if needed, or stick to a config.
        // FOR NOW: Let's fetch the issue and look for a field named "Solución" in server logic?
        // Or better: Just fetch the issue and return the field "customfield_XXXX" if we knew it.
        // Since I don't know the field ID, I'll fetch the issue and search the schema? Or just "names".

        // BETTER APPROACH for "Solución":
        // It's likely a custom field. 
        // I will implement a "get issue details" endpoint that returns specific fields.
        // I'll try to find the "Solución" field dynamically or use a known one if configured.

        // Use server-side environment variables
        const email = process.env.JIRA_EMAIL || process.env.VITE_JIRA_EMAIL;
        const token = process.env.JIRA_API_TOKEN || process.env.VITE_JIRA_API_TOKEN;
        const domain = process.env.JIRA_DOMAIN || process.env.VITE_JIRA_DOMAIN || 'prestamype.atlassian.net';

        if (!email || !token) {
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const auth = Buffer.from(`${email}:${token}`).toString('base64');

        // 1. Fetch Issue
        const url = `https://${domain}/rest/api/3/issue/${ticketKey}?expand=names`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Jira API Error' });
        }

        const data = await response.json();

        // 2. Find "Solución" field
        // "names" property contains map of ID -> Name
        const names = data.names || {};
        let solutionFieldId = null;

        for (const [id, name] of Object.entries(names)) {
            if (name.toLowerCase() === 'solución' || name.toLowerCase() === 'solucion' || name.toLowerCase() === 'solution') {
                solutionFieldId = id;
                break;
            }
        }

        let figmaLink = '';
        if (solutionFieldId && data.fields[solutionFieldId]) {
            // It could be a string or rich text?
            // Usually custom text field.
            const fieldValue = data.fields[solutionFieldId];

            // If it's ADF (Atlassian Document Format), we need to extract text.
            // Simplified extraction: assume string or simple object structure for now
            if (typeof fieldValue === 'string') {
                figmaLink = fieldValue;
            } else if (fieldValue?.content) {
                // Try to extract URL from ADF
                // This is complex, but let's try a simple JSON stringify and regex search for figma.com
                const raw = JSON.stringify(fieldValue);
                const match = raw.match(/https?:\/\/(www\.)?figma\.com\/[^"\s]*/);
                if (match) figmaLink = match[0];
            }
        }

        // Fallback: Check Description
        if (!figmaLink && data.fields.description) {
            const raw = JSON.stringify(data.fields.description);
            const match = raw.match(/https?:\/\/(www\.)?figma\.com\/[^"\s]*/);
            if (match) figmaLink = match[0];
        }

        return res.status(200).json({
            success: true,
            ticket: ticketKey,
            figmaLink: figmaLink
        });

    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message });
    }
}
