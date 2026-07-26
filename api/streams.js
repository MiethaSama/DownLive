let streamsList = [];

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const now = Date.now();
  streamsList = streamsList.filter(s => now - (s.lastPing || 0) < 30000);

  if (req.method === 'GET') {
    return res.status(200).json(streamsList);
  }

  if (req.method === 'POST') {
    const { id, title, author, category, isPing } = req.body || {};

    if (isPing) {
      const stream = streamsList.find(s => s.id === id);
      if (stream) {
        stream.lastPing = Date.now();
        return res.status(200).json({ success: true });
      }
      return res.status(404).json({ success: false, error: 'Yayın bulunamadı' });
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
    return res.status(200).json({ success: true, stream: newStream });
  }

  if (req.method === 'DELETE') {
    const streamId = req.query.id;
    if (streamId) {
      streamsList = streamsList.filter(s => s.id !== streamId);
    }
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};