let activeStreams = [];

export default function handler(req, res) {
    // Genişletilmiş CORS İzinleri
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Ön uç (Preflight) istekleri için hızlı yanıt
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Yayınları listele (GET) - Her zaman bir dizi döner (map hatasını önler)
    if (req.method === 'GET') {
        return res.status(200).json(activeStreams);
    }

    // Yeni yayın ekle (POST)
    if (req.method === 'POST') {
        try {
            const streamData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            activeStreams.push(streamData);
            return res.status(200).json({ success: true, stream: streamData });
        } catch (error) {
            return res.status(400).json({ success: false, error: 'Geçersiz veri formatı' });
        }
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
}