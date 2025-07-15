const express = require('express');
const router = express.Router();
const ContactMessage = require('../models/ContactMessage');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

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

// İletişim mesajı kaydet (herkes)
router.post('/', auth, async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ message: 'Tüm alanlar zorunlu.' });
    // E-posta adresinde Türkçe karakter kontrolü
    const turkceKarakterRegex = /[çğıöşüÇĞİÖŞÜ]/;
    if (turkceKarakterRegex.test(email)) {
      return res.status(400).json({ message: 'E-posta adresinde Türkçe karakter bulunamaz.' });
    }
    // E-posta formatı kontrolü
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Geçerli bir e-posta adresi giriniz.' });
    }
    const contactMessage = new ContactMessage({
      name,
      email,
      message,
      user: req.userId || null
    });
    await contactMessage.save();
    res.status(201).json({ message: 'Mesajınız iletildi.' });
  } catch (err) {
    res.status(500).json({ message: 'Sunucu hatası.', error: err.message });
  }
});

// Admin: Tüm iletişim mesajlarını getir
router.get('/all', auth, admin, async (req, res) => {
  try {
    const messages = await ContactMessage.find().populate('user', 'email name surname').sort({ createdAt: -1 });
    res.json(messages);
  } catch {
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

module.exports = router; 