const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
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

// Profil bilgilerini getir
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Profil bilgilerini güncelle
router.put('/me', auth, async (req, res) => {
  try {
    const { name, address, email } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { name, address, email },
      { new: true }
    ).select('-password');
    res.json({ message: 'Profil güncellendi.', user });
  } catch {
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Şifre değiştir
router.put('/me/password', auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.userId);
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Eski şifre yanlış.' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Şifre değiştirildi.' });
  } catch {
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Tüm kullanıcıları getir (admin)
router.get('/all', auth, admin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch {
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Kullanıcıyı sil (admin)
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Kullanıcı silindi.' });
  } catch {
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Kullanıcıya admin yetkisi ver/al (admin)
router.put('/:id/admin', auth, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    user.isAdmin = req.body.isAdmin;
    await user.save();
    res.json({ message: 'Kullanıcı admin yetkisi güncellendi.', user });
  } catch {
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

module.exports = router; 