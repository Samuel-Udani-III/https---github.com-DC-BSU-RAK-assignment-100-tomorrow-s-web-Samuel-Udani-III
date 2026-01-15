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

// Get site settings (public)
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('site').findOne({ _id: 'settings' });
    const bannerUrl = doc && doc.banner_url ? doc.banner_url : null;
    res.json({ bannerUrl });
  } catch (err) {
    console.error('Get site error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;
