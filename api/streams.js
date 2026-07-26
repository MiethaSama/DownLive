// Geçici bellek (Serverless warm instance'lar arası canlı yayın listesi tutar)
global.streamsList = global.streamsList || [];

export default function handler(req, res) {
  // Başlıklar (CORS ve Iframe uyumluluğu)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const now = Date.now();
  // 30 saniyeden uzun süredir ping atmayan kopmuş yayınları temizle
  global.streamsList = global.streamsList.filter(s => now - s.lastPing < 30000);

  // 1. GET /api/streams - Yayınları Getir
  if (req.method === 'GET') {
    return res.status(200).json(global.streamsList);
  }

  // 2. POST /api/streams - Yayın Başlat veya Ping At
  if (req.method === 'POST') {
    const { id, title, author, category, isPing } = req.body || {};

    // Canlı Tutma Ping İsteği
    if (isPing) {
      const stream = global.streamsList.find(s => s.id === id);
      if (stream) {
        stream.lastPing = Date.now();
        return res.status(200).json({ success: true });
      }
      return res.status(404).json({ success: false, error: 'Yayın bulunamadı' });
    }

    // Yeni Yayın Oluşturma
    if (!id || !title) {
      return res.status(400).json({ success: false, error: 'Başlık gerekli' });
    }

    global.streamsList = global.streamsList.filter(s => s.id !== id);

    const newStream = {
      id,
      title,
      author: author || 'Yayıncı',
      category: category || 'Genel',
      lastPing: Date.now()
    };

    global.streamsList.push(newStream);
    return res.status(200).json({ success: true, stream: newStream });
  }

  // 3. DELETE /api/streams - Yayın Bitir
  if (req.method === 'DELETE') {
    const streamId = req.query.id;
    if (streamId) {
      global.streamsList = global.streamsList.filter(s => s.id !== streamId);
    }
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}