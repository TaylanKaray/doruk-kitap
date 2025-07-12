const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const redis = require('redis');
let redisClient = null;

// Redis bağlantısını güvenli şekilde başlat
(async () => {
  try {
    if (process.env.REDIS_URL) {
      redisClient = redis.createClient({ url: process.env.REDIS_URL });
      redisClient.on('error', (err) => {
        console.log('Redis Client Error:', err.message);
        redisClient = null; // Hata durumunda null yap
      });
      await redisClient.connect();
      console.log('Redis bağlantısı başarılı');
    } else {
      console.log('REDIS_URL bulunamadı, cache devre dışı');
    }
  } catch (err) {
    console.log('Redis bağlantısı başarısız, cache devre dışı:', err.message);
    redisClient = null;
  }
})();

// Kimlik doğrulama middleware
function auth(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ message: 'Token gerekli.' });
  try {
    const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ message: 'Geçersiz token.' });
  }
}

// Admin kontrolü middleware
async function admin(req, res, next) {
  const user = await User.findById(req.userId);
  if (!user || !user.isAdmin) return res.status(403).json({ message: 'Yönetici yetkisi gerekli.' });
  next();
}

// Ürün ekle (admin)
router.post('/', auth, admin, async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;
    const product = new Product({ name, description, price, stock });
    await product.save();
    res.status(201).json({ message: 'Ürün eklendi.', product });
  } catch {
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Ürün güncelle (admin)
router.put('/:id', auth, admin, async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, description, price, stock },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Ürün bulunamadı.' });
    res.json({ message: 'Ürün güncellendi.', product });
  } catch {
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Ürün sil (admin)
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Ürün bulunamadı.' });
    res.json({ message: 'Ürün silindi.' });
  } catch {
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Ürünleri listele (herkes)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch {
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Ürün detayını getir (herkes) + Redis cache
router.get('/:id', async (req, res) => {
  const productId = req.params.id;
  try {
    // Önce Redis'ten dene
    if (redisClient) {
      const cached = await redisClient.get(`product:${productId}`);
      if (cached) {
        console.log('REDIS\'TEN GELDİ:', productId);
        return res.json(JSON.parse(cached));
      }
    }
    // DB'den çek
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Ürün bulunamadı.' });
    // Redis'e kaydet
    if (redisClient) {
      await redisClient.set(`product:${productId}`, JSON.stringify(product), { EX: 60 * 5 }); // 5 dk cache
    }
    console.log('DB\'DEN GELDİ:', productId);
    res.json(product);
  } catch (err) {
    console.error('Ürün detayında hata:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

module.exports = router; 