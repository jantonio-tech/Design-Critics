export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, token, domain } = req.body;

        // Validate inputs
        if (!email || !token || !domain) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Create Basic Auth header
        const auth = Buffer.from(`${email}:${token}`).toString('base64');

        // Call Jira API
        const response = await fetch(`https://${domain}/rest/api/3/myself`, {
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

            return res.status(response.status).json({
                error: 'Jira API error',
                message: 'Error al conectar con Jira'
            });
        }

        const userData = await response.json();

        return res.status(200).json({
            success: true,
            displayName: userData.displayName,
            accountId: userData.accountId,
            emailAddress: userData.emailAddress
        });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Error de conexión con Jira'
        });
    }
}
