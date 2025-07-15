const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB bağlantısı
console.log('MongoDB bağlantısı başlatılıyor...');
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB bağlantısı başarılı'))
  .catch(err => console.error('MongoDB bağlantı hatası:', err));
console.log('MongoDB bağlantısı kodu geçildi.');

// Routers
app.use('/api/products', require('./routes/products'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/users', require('./routes/users'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/contact', require('./routes/contact'));

// Test endpoint
app.get('/', (req, res) => {
  res.send('API Çalışıyor!');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
}); 