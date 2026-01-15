const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const db = require('../database');
const mongo = require('../mongo');
const config = require('../config');
const { validateGame } = require('../middleware/validation');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// Get all games (public)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const dbMongo = mongo.getDb();
    const pipeline = [
      { $lookup: { from: 'reviews', localField: 'id', foreignField: 'game_id', as: 'reviews' } },
      { $addFields: { avg_rating: { $avg: '$reviews.rating' }, review_count: { $size: '$reviews' } } },
      { $sort: { created_at: -1 } }
    ];
    const games = await dbMongo.collection('games').aggregate(pipeline).toArray();

    const formattedGames = games.map(game => ({
      id: game.id,
      title: game.title,
      genre: game.genre,
      imageDataUrl: game.image_url,
      description: game.description,
      avgRating: game.avg_rating ? parseFloat((game.avg_rating).toFixed(1)) : 0,
      reviewCount: game.review_count || 0,
      createdAt: game.created_at
    }));

    res.json({ games: formattedGames });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single game (public)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const gameId = req.params.id;
    const dbMongo = mongo.getDb();
    const game = await dbMongo.collection('games').findOne({ id: gameId });
    if (!game) return res.status(404).json({ error: 'Game not found' });

    const statsAgg = await dbMongo.collection('reviews').aggregate([
      { $match: { game_id: gameId } },
      { $group: { _id: null, avg_rating: { $avg: '$rating' }, review_count: { $sum: 1 } } }
    ]).toArray();
    const stats = statsAgg[0] || { avg_rating: 0, review_count: 0 };

    const formattedGame = {
      id: game.id,
      title: game.title,
      genre: game.genre,
      imageDataUrl: game.image_url,
      description: game.description,
      avgRating: stats.avg_rating ? parseFloat((stats.avg_rating).toFixed(1)) : 0,
      reviewCount: stats.review_count || 0,
      createdAt: game.created_at
    };

    res.json({ game: formattedGame });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new game (admin only)
router.post('/', authenticateToken, requireAdmin, upload.single('image'), handleUploadError, validateGame, async (req, res) => {
  try {
    const { title, genre, description } = req.body;
    const gameId = uuidv4();
    
    let imageUrl = '';
    
    // Handle uploaded image
    if (req.file) {
      imageUrl = `${config.baseUrl}/uploads/${req.file.filename}`;
    } else {
      // Use placeholder image if no file uploaded
      imageUrl = `https://picsum.photos/seed/${encodeURIComponent(title || 'game')}/640/360`;
    }

    // Insert game into MongoDB
    const dbMongo = mongo.getDb();
    await dbMongo.collection('games').insertOne({ id: gameId, title, genre, image_url: imageUrl, description: description || '', created_at: Date.now() });

    const newGame = {
      id: gameId,
      title,
      genre,
      imageDataUrl: imageUrl,
      description: description || '',
      avgRating: 0,
      reviewCount: 0,
      createdAt: Date.now()
    };

    res.status(201).json({
      message: 'Game added successfully',
      game: newGame
    });
  } catch (error) {
    console.error('Add game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update game (admin only)
router.put('/:id', authenticateToken, requireAdmin, upload.single('image'), handleUploadError, validateGame, async (req, res) => {
  try {
    const gameId = req.params.id;
    const { title, genre, description } = req.body;

    // Check if game exists
    const dbMongo = mongo.getDb();
    const existingGame = await dbMongo.collection('games').findOne({ id: gameId });
    if (!existingGame) return res.status(404).json({ error: 'Game not found' });

    let imageUrl = existingGame.image_url;
    
    // Handle uploaded image
    if (req.file) {
      imageUrl = `${config.baseUrl}/uploads/${req.file.filename}`;
    }

    // Update game in MongoDB
    await dbMongo.collection('games').updateOne({ id: gameId }, { $set: { title, genre, image_url: imageUrl, description: description || '', } });

    // Get updated game with stats
    const updatedGame = await dbMongo.collection('games').findOne({ id: gameId });
    const statsAgg = await dbMongo.collection('reviews').aggregate([
      { $match: { game_id: gameId } },
      { $group: { _id: null, avg_rating: { $avg: '$rating' }, review_count: { $sum: 1 } } }
    ]).toArray();
    const stats = statsAgg[0] || { avg_rating: 0, review_count: 0 };

    const formattedGame = {
      id: updatedGame.id,
      title: updatedGame.title,
      genre: updatedGame.genre,
      imageDataUrl: updatedGame.image_url,
      description: updatedGame.description,
      avgRating: stats.avg_rating ? parseFloat(stats.avg_rating.toFixed(1)) : 0,
      reviewCount: stats.review_count || 0,
      createdAt: updatedGame.created_at
    };

    res.json({
      message: 'Game updated successfully',
      game: formattedGame
    });
  } catch (error) {
    console.error('Update game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete game (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const gameId = req.params.id;

    // Check if game exists
    const dbMongo = mongo.getDb();
    const game = await dbMongo.collection('games').findOne({ id: gameId });
    if (!game) return res.status(404).json({ error: 'Game not found' });

    // Delete replies for reviews of this game, delete reviews, then delete the game
    const reviewDocs = await dbMongo.collection('reviews').find({ game_id: gameId }).project({ id: 1 }).toArray();
    const reviewIds = reviewDocs.map(r => r.id);
    if (reviewIds.length > 0) {
      await dbMongo.collection('replies').deleteMany({ review_id: { $in: reviewIds } });
      await dbMongo.collection('reviews').deleteMany({ game_id: gameId });
    }
    await dbMongo.collection('games').deleteOne({ id: gameId });

    res.json({ message: 'Game deleted successfully' });
  } catch (error) {
    console.error('Delete game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search games (public)
router.get('/search/:query', optionalAuth, async (req, res) => {
  try {
    const query = req.params.query;
    const searchTerm = `%${query}%`;
    const dbMongo = mongo.getDb();
    const regex = new RegExp(query, 'i');
    const pipeline = [
      { $match: { $or: [{ title: regex }, { genre: regex }, { description: regex }] } },
      { $lookup: { from: 'reviews', localField: 'id', foreignField: 'game_id', as: 'reviews' } },
      { $addFields: { avg_rating: { $avg: '$reviews.rating' }, review_count: { $size: '$reviews' } } },
      { $sort: { created_at: -1 } }
    ];
    const games = await dbMongo.collection('games').aggregate(pipeline).toArray();

    const formattedGames = games.map(game => ({
      id: game.id,
      title: game.title,
      genre: game.genre,
      imageDataUrl: game.image_url,
      description: game.description,
      avgRating: game.avg_rating ? parseFloat((game.avg_rating).toFixed(1)) : 0,
      reviewCount: game.review_count || 0,
      createdAt: game.created_at
    }));

    res.json({ games: formattedGames });
  } catch (error) {
    console.error('Search games error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

