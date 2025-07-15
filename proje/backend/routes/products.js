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
    console.log('Redis bağlantısı başarısız:', err.message);
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
    const { ad, aciklama, fiyat, stok, yazar, yayinevi, isbn, resimUrl, sayfaSayisi, kategori, cokSatan, yeniCikan } = req.body;
    const product = new Product({ ad, aciklama, fiyat, stok, yazar, yayinevi, isbn, resimUrl, sayfaSayisi, kategori, cokSatan, yeniCikan });
    await product.save();
    res.status(201).json({ message: 'Ürün eklendi.', product });
  } catch {
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Stok gelince haber ver: e-posta bırak
router.post('/:id/stok-bildirim', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'E-posta zorunlu.' });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Ürün bulunamadı.' });
    if (!product.stokBildirimBekleyenler.includes(email)) {
      product.stokBildirimBekleyenler.push(email);
      await product.save();
    }
    res.status(201).json({ message: 'E-posta kaydedildi.' });
  } catch {
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Ürün güncelle (admin) - stok artarsa bildirim gönder
router.put('/:id', auth, admin, async (req, res) => {
  try {
    const { ad, aciklama, fiyat, stok, yazar, yayinevi, isbn, resimUrl, sayfaSayisi, kategori, cokSatan, yeniCikan } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Ürün bulunamadı.' });
    const eskiStok = product.stok;
    // Alanları güncelle
    product.ad = ad;
    product.aciklama = aciklama;
    product.fiyat = fiyat;
    product.stok = stok;
    product.yazar = yazar;
    product.yayinevi = yayinevi;
    product.isbn = isbn;
    product.resimUrl = resimUrl;
    product.sayfaSayisi = sayfaSayisi;
    product.kategori = kategori;
    product.cokSatan = cokSatan;
    product.yeniCikan = yeniCikan;
    await product.save();
    // Stok sıfırdan büyüğe çıktıysa bildirim gönder
    if (eskiStok === 0 && stok > 0 && product.stokBildirimBekleyenler.length > 0) {
      // Burada gerçek e-posta gönderimi yapılabilir
      console.log('Stok bildirimi gönderilecek:', product.stokBildirimBekleyenler);
      // Bildirim gönderildikten sonra listeyi temizle
      product.stokBildirimBekleyenler = [];
      await product.save();
    }
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

// Kitaba yorum ekle (kullanıcı)
router.post('/:id/yorum', auth, async (req, res) => {
  try {
    const { puan, yorum } = req.body;
    if (!puan || !yorum) return res.status(400).json({ message: 'Puan ve yorum zorunlu.' });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Ürün bulunamadı.' });
    // Aynı kullanıcı birden fazla yorum yapmasın (isteğe bağlı)
    // const once = product.yorumlar.find(y => y.kullanici.toString() === req.userId);
    // if (once) return res.status(400).json({ message: 'Bu ürüne zaten yorum yaptınız.' });
    product.yorumlar.push({ kullanici: req.userId, puan, yorum });
    await product.save();
    res.status(201).json({ message: 'Yorum eklendi.' });
  } catch {
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Kitabın yorumlarını getir (herkes)
router.get('/:id/yorumlar', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('yorumlar.kullanici', 'email name surname');
    if (!product) return res.status(404).json({ message: 'Ürün bulunamadı.' });
    res.json(product.yorumlar);
  } catch {
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

module.exports = router; 