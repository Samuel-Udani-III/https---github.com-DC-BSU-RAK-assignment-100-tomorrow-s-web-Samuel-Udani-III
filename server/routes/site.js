const express = require('express');
const mongo = require('../mongo');
const { upload, handleUploadError } = require('../middleware/upload');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const config = require('../config');

const router = express.Router();

function getDb() {
  return mongo.getDb();
}

// New: Upload and update site banner (admin only)
router.post('/banner', authenticateToken, requireAdmin, upload.single('banner'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No banner image uploaded' });
    }

    const bannerUrl = `${config.baseUrl}/uploads/${req.file.filename}`;
    const db = getDb();
    await db.collection('site').updateOne(
      { _id: 'settings' },
      { $set: { banner_url: bannerUrl, updated_at: Date.now() } },
      { upsert: true }
    );

    res.json({ message: 'Banner uploaded', bannerUrl });
  } catch (err) {
    console.error('Banner upload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// New: Upload and update left side banner (admin only)
router.post('/banner/left', authenticateToken, requireAdmin, upload.single('banner'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No banner image uploaded' });
    }

    const bannerUrl = `${config.baseUrl}/uploads/${req.file.filename}`;
    const db = getDb();
    await db.collection('site').updateOne(
      { _id: 'settings' },
      { $set: { left_banner_url: bannerUrl, updated_at: Date.now() } },
      { upsert: true }
    );

    res.json({ message: 'Left banner uploaded', bannerUrl });
  } catch (err) {
    console.error('Left banner upload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// New: Upload and update right side banner (admin only)
router.post('/banner/right', authenticateToken, requireAdmin, upload.single('banner'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No banner image uploaded' });
    }

    const bannerUrl = `${config.baseUrl}/uploads/${req.file.filename}`;
    const db = getDb();
    await db.collection('site').updateOne(
      { _id: 'settings' },
      { $set: { right_banner_url: bannerUrl, updated_at: Date.now() } },
      { upsert: true }
    );

    res.json({ message: 'Right banner uploaded', bannerUrl });
  } catch (err) {
    console.error('Right banner upload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload left side GIF (admin only)
router.post('/gif/left', authenticateToken, requireAdmin, upload.single('gif'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No GIF uploaded' });
    }

    const gifUrl = `${config.baseUrl}/uploads/${req.file.filename}`;
    const db = getDb();
    await db.collection('site').updateOne(
      { _id: 'settings' },
      { $set: { left_gif_url: gifUrl, updated_at: Date.now() } },
      { upsert: true }
    );

    res.json({ message: 'Left GIF uploaded', gifUrl });
  } catch (err) {
    console.error('Left GIF upload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload right side GIF (admin only)
router.post('/gif/right', authenticateToken, requireAdmin, upload.single('gif'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No GIF uploaded' });
    }

    const gifUrl = `${config.baseUrl}/uploads/${req.file.filename}`;
    const db = getDb();
    await db.collection('site').updateOne(
      { _id: 'settings' },
      { $set: { right_gif_url: gifUrl, updated_at: Date.now() } },
      { upsert: true }
    );

    res.json({ message: 'Right GIF uploaded', gifUrl });
  } catch (err) {
    console.error('Right GIF upload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get site settings (public)
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('site').findOne({ _id: 'settings' });
    const bannerUrl = doc && doc.banner_url ? doc.banner_url : null;
    const leftBannerUrl = doc && doc.left_banner_url ? doc.left_banner_url : null;
    const rightBannerUrl = doc && doc.right_banner_url ? doc.right_banner_url : null;
    const leftGifUrl = doc && doc.left_gif_url ? doc.left_gif_url : null;
    const rightGifUrl = doc && doc.right_gif_url ? doc.right_gif_url : null;
    res.json({ bannerUrl, leftBannerUrl, rightBannerUrl, leftGifUrl, rightGifUrl });
  } catch (err) {
    console.error('Get site error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;
