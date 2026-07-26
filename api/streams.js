const KV_URL = "https://kvdb.io/8xK8d4M3vK9x2L1q5Z7wP/downlive_streams";

async function getStreams() {
  try {
    const res = await fetch(KV_URL);
    if (!res.ok) return [];
    const text = await res.text();
    return text ? JSON.parse(text) : [];
  } catch (e) {
    return [];
  }
}

async function saveStreams(list) {
  try {
    await fetch(KV_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(list)
    });
  } catch (e) {
    console.error("KV Kayıt Hatası:", e);
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let streamsList = await getStreams();
    const now = Date.now();
    
    // 30 saniyedir ping atmayan yayınları temizle
    const initialLength = streamsList.length;
    streamsList = streamsList.filter(s => now - (s.lastPing || 0) < 30000);

    if (req.method === 'GET') {
      if (streamsList.length !== initialLength) {
        await saveStreams(streamsList);
      }
      return res.status(200).json(streamsList);
    }

    if (req.method === 'POST') {
      let body = req.body;

      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {
          body = {};
        }
      }
      body = body || {};

      const { id, title, author, category, isPing } = body;

      if (isPing) {
        const stream = streamsList.find(s => s.id === id);
        if (stream) {
          stream.lastPing = Date.now();
          await saveStreams(streamsList);
          return res.status(200).json({ success: true });
        }
        return res.status(200).json({ success: true, note: 'not_found' });
      }

      if (!id || !title) {
        return res.status(400).json({ success: false, error: 'Eksik başlık veya ID' });
      }

      // Aynı ID'li eski yayını kaldır ve yenisini ekle
      streamsList = streamsList.filter(s => s.id !== id);

      const newStream = {
        id,
        title,
        author: author || 'Yayıncı',
        category: category || 'Genel',
        lastPing: Date.now()
      };

      streamsList.push(newStream);
      await saveStreams(streamsList);

      return res.status(200).json({ success: true, stream: newStream });
    }

    if (req.method === 'DELETE') {
      const streamId = req.query.id;
      if (streamId) {
        streamsList = streamsList.filter(s => s.id !== streamId);
        await saveStreams(streamsList);
      }
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};