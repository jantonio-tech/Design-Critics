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

        // Extract Figma link ONLY from description field, after "✅ Solución:" prefix
        if (data.fields.description) {
            // Convert ADF (Atlassian Document Format) to plain text for easier parsing
            const extractTextFromADF = (node) => {
                if (!node) return '';
                if (typeof node === 'string') return node;
                if (node.text) return node.text;
                if (node.content) {
                    return node.content.map(extractTextFromADF).join('\n');
                }
                return '';
            };

            const descriptionText = extractTextFromADF(data.fields.description);

            // Look for links ONLY after "✅ Solución:"
            // Split by lines and find the "✅ Solución:" line
            const lines = descriptionText.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                // Check if this line contains "✅ Solución:" (with or without emoji variations)
                if (line.includes('✅ Solución:') || line.includes('✅Solución:') ||
                    line.toLowerCase().includes('✅ solucion:') || line.toLowerCase().includes('✅solucion:')) {

                    // Extract URL from this line or the raw JSON (for ADF inline links)
                    const raw = JSON.stringify(data.fields.description);

                    // Find the "Solución" section in the ADF and extract its link
                    // Look for pattern where ✅ Solución: is followed by a link
                    const solucionPattern = /✅\s*Soluci[oó]n[:\s]*.*?(https?:\/\/(www\.)?figma\.com\/[^"\s<>]*)/i;
                    const match = raw.match(solucionPattern);

                    if (match) {
                        figmaLink = match[1];
                        console.log(`✅ Figma link found after "✅ Solución:" for ${ticketKey}`);
                    }
                    break;
                }
            }

            // Alternative: search for "Solución" section in raw JSON structure
            if (!figmaLink) {
                const raw = JSON.stringify(data.fields.description);

                // Pattern to find ✅ Solución: followed by a figma link (handles ADF structure)
                const patterns = [
                    /✅\s*Soluci[oó]n[:\s]*[^"]*"text":"([^"]*figma\.com[^"]*)"/i,
                    /"text":"✅\s*Soluci[oó]n[:\s]*"[^}]*"url":"(https?:\/\/[^"]*figma\.com[^"]*)"/i,
                    /✅\s*Soluci[oó]n.*?"url":"(https?:\/\/[^"]*figma\.com[^"]*)"/i
                ];

                for (const pattern of patterns) {
                    const match = raw.match(pattern);
                    if (match) {
                        figmaLink = match[1];
                        console.log(`✅ Figma link found in ADF structure after "✅ Solución:" for ${ticketKey}`);
                        break;
                    }
                }
            }
        }

        // Debug logging
        if (figmaLink) {
            console.log(`✅ Figma link for ${ticketKey}:`, figmaLink);
        } else {
            console.log(`⚠️ No Figma link found after "✅ Solución:" for ${ticketKey}`);
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
