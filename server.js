const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors({ origin: '*' }));

let streams = [];

// Kök dizin (404 hatalarını önlemek için)
app.get('/', (req, res) => {
  res.send('DownLive Sunucusu Aktif ve Çalışıyor!');
});

// Tüm aktif yayınları listele
app.get('/api/streams', (req, res) => {
  res.json(streams);
});

// Yeni yayın başlat veya güncelle
app.post('/api/streams', (req, res) => {
  const { id, title, author, category } = req.body;
  if (!id || !title) return res.status(400).json({ error: 'Eksik bilgi' });

  const existingIndex = streams.findIndex(s => String(s.id) === String(id));
  const streamData = { 
    id, 
    title, 
    author: author || 'Yayıncı', 
    category: category || 'Genel', 
    lastPing: Date.now() 
  };

  if (existingIndex >= 0) {
    streams[existingIndex] = streamData;
  } else {
    streams.push(streamData);
  }
  
  res.status(201).json({ success: true, stream: streamData });
});

// Sinyal (ping) atma
app.post('/api/streams/:id/ping', (req, res) => {
  const stream = streams.find(s => String(s.id) === String(req.params.id));
  if (stream) {
    stream.lastPing = Date.now();
    return res.json({ success: true });
  }
  res.status(404).json({ error: 'Bulunamadı' });
});

// Yayını sonlandır / listeden kaldır
app.delete('/api/streams/:id', (req, res) => {
  streams = streams.filter(s => String(s.id) !== String(req.params.id));
  res.json({ success: true });
});

// 10 saniye ping atmayanları otomatik temizle
setInterval(() => {
  const now = Date.now();
  streams = streams.filter(s => now - s.lastPing < 10000);
}, 5000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Merkezi sunucu http://localhost:${PORT} adresinde çalışıyor.`);
});