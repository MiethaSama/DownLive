let memoryStreams = [];
let memoryFrames = {};
const KV_BASE = "https://kvdb.io/8xK8d4M3vK9x2L1q5Z7wP/";

async function fetchWithTimeout(url, options = {}, timeout = 1500) {
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

async function getKV(key, fallback) {
  try {
    const res = await fetchWithTimeout(KV_BASE + key, { headers: { 'Cache-Control': 'no-cache' } }, 1500);
    if (res && res.ok) {
      const text = await res.text();
      if (text) return JSON.parse(text);
    }
  } catch (e) {}
  return fallback;
}

async function setKV(key, data) {
  try {
    await fetchWithTimeout(KV_BASE + key, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }, 1500);
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
    let framesMap = await getKV('downlive_frames', memoryFrames);

    if (req.method === 'GET' && req.query.frameId) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      const frameData = framesMap[req.query.frameId] || null;
      return res.status(200).json({ frame: frameData });
    }

    let streamsList = await getKV('downlive_streams', memoryStreams);
    const now = Date.now();
    
    const activeStreams = streamsList.filter(s => now - (s.lastPing || 0) < 45000);
    if (activeStreams.length !== streamsList.length) {
      streamsList = activeStreams;
      await setKV('downlive_streams', streamsList);
    }

    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
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
        framesMap[id] = frame;
        memoryFrames = framesMap;
        await setKV('downlive_frames', framesMap);
        return res.status(200).json({ success: true });
      }

      if (isPing) {
        const stream = streamsList.find(s => s.id === id);
        if (stream) {
          stream.lastPing = Date.now();
          await setKV('downlive_streams', streamsList);
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
      await setKV('downlive_streams', streamsList);

      return res.status(200).json({ success: true, stream: newStream });
    }

    if (req.method === 'DELETE') {
      const streamId = req.query.id;
      if (streamId) {
        streamsList = streamsList.filter(s => s.id !== streamId);
        delete framesMap[streamId];
        memoryFrames = framesMap;
        await setKV('downlive_streams', streamsList);
        await setKV('downlive_frames', framesMap);
      }
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(200).json({ success: false, error: err.message });
  }
};