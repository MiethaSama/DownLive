export default function handler(req, res) {
    // CORS izinleri (Tarayıcı ve oyun içi istekler için)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'GET') {
        return res.status(200).json({
            status: 'online',
            message: 'Downlive Vercel Serverless API başarıyla çalışıyor!'
        });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}