// Geçici akış listesi (Serverless yapıda sunucu uykuya geçince sıfırlanabilir)
let activeStreams = [];

export default function handler(req, res) {
    // CORS izinleri
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Yayınları listeleme isteği (GET)
    if (req.method === 'GET') {
        return res.status(200).json(activeStreams);
    }

    // Yeni yayın başlatma / kaydetme isteği (POST)
    if (req.method === 'POST') {
        const streamData = req.body;
        activeStreams.push(streamData);
        return res.status(200).json({ success: true, message: 'Yayın başarıyla başlatıldı!', stream: streamData });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}