let memoryStreams = [];
let latestFrames = {}; 
const KV_URL = "https://kvdb.io/8xK8d4M3vK9x2L1q5Z7wP/downlive_streams";

async function fetchWithTimeout(url, options = {}, timeout = 4000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (e) {
    clearTimeout(id);
    return null;
  }
}

async function getStreams() {
  try {
    const res = await fetchWithTimeout(KV_URL, { headers: { 'Cache-Control': 'no-cache' } }, 4000);
    if (res && res.ok) {
      const text = await res.text();
      if (text) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          memoryStreams = parsed; // Belleği de güncelle
          return parsed;
        }
      }
    }
  } catch (e) {}
  return memoryStreams;
}

async function saveStreams(list) {
  memoryStreams = list;
  try {
    await fetchWithTimeout(KV_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(list)
    }, 4000);
  } catch (e) {}
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET' && req.query.frameId) {
      const frameData = latestFrames[req.query.frameId] || null;
      return res.status(200).json({ frame: frameData });
    }

    let streamsList = await getStreams();
    const now = Date.now();
    
    // Süresi geçenleri temizle (Ping süresi 45 saniyeye çıkarıldı)
    const activeStreams = streamsList.filter(s => now - (s.lastPing || 0) < 45000);
    if (activeStreams.length !== streamsList.length) {
      streamsList = activeStreams;
      await saveStreams(streamsList);
    }

    if (req.method === 'GET') {
      return res.status(200).json(streamsList);
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = {}; }
      }
      body = body || {};

      const { id, title, author, category, frame, isPing } = body;

      if (id && frame) {
        latestFrames[id] = frame;
        return res.status(200).json({ success: true });
      }

      if (isPing) {
        const stream = streamsList.find(s => s.id === id);
        if (stream) {
          stream.lastPing = Date.now();
          await saveStreams(streamsList);
          return res.status(200).json({ success: true });
        }
        return res.status(200).json({ success: true, note: 're-registered' });
      }

      if (!id || !title) {
        return res.status(400).json({ success: false, error: 'Eksik başlık veya ID' });
      }

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
        delete latestFrames[streamId];
        await saveStreams(streamsList);
      }
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(200).json({ success: false, error: err.message });
  }
};