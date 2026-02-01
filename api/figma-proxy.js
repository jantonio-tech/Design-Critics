export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { endpoint } = req.query;

        if (!endpoint) {
            return res.status(400).json({ error: 'Missing endpoint parameter' });
        }

        // Use server-side environment variables
        // Support both VITE_ prefixed (for shared generic use) and standard name
        const token = process.env.FIGMA_TOKEN || process.env.VITE_FIGMA_TOKEN;

        if (!token) {
            console.error('Missing server-side Figma configuration');
            return res.status(500).json({ error: 'Server configuration error: Token not found' });
        }

        const url = `https://api.figma.com/v1/${endpoint}`;

        console.log(`Proxying to Figma: ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-Figma-Token': token
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Figma API error:', response.status, errorText);
            return res.status(response.status).json({ error: 'Figma API Error', details: errorText });
        }

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error('Proxy server error:', error);
        return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}
