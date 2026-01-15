const express = require('express');
const { v4: uuidv4 } = require('uuid');
const mongo = require('../mongo');
const { validateReview, validateReply } = require('../middleware/validation');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

function getDb() {
  try {
    return mongo.getDb();
  } catch (err) {
    // Propagate a clearer error
    throw new Error('MongoDB not initialized');
  }
}

// Get reviews for a game (public)
router.get('/game/:gameId', optionalAuth, async (req, res) => {
  try {
    const gameId = req.params.gameId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const db = getDb();

    // Check if game exists
    const game = await db.collection('games').findOne({ id: gameId });
    if (!game) return res.status(404).json({ error: 'Game not found' });

    // Aggregation: reviews with replies
    const pipeline = [
      { $match: { game_id: gameId } },
      { $sort: { created_at: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $lookup: { from: 'replies', localField: 'id', foreignField: 'review_id', as: 'replies' } }
    ];

    const reviewsCursor = db.collection('reviews').aggregate(pipeline);
    const reviews = await reviewsCursor.toArray();

    const total = await db.collection('reviews').countDocuments({ game_id: gameId });

    const formattedReviews = reviews.map(r => ({
      id: r.id,
      gameId: r.game_id,
      userId: r.user_id,
      userEmail: r.user_email,
      rating: r.rating,
      text: r.text,
      createdAt: r.created_at,
      replies: (r.replies || []).map(rep => ({
        id: rep.id,
        userId: rep.user_id,
        userEmail: rep.user_email,
        text: rep.text,
        createdAt: rep.created_at
      }))
    }));

    res.json({
      reviews: formattedReviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's reviews
router.get('/user/:userId', optionalAuth, async (req, res) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const db = getDb();

    const reviews = await db.collection('reviews')
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db.collection('reviews').countDocuments({ user_id: userId });

    // fetch games map
    const gameIds = Array.from(new Set(reviews.map(r => r.game_id)));
    const games = await db.collection('games').find({ id: { $in: gameIds } }).toArray();
    const gamesById = Object.fromEntries(games.map(g => [g.id, g]));

    const formattedReviews = reviews.map(r => ({
      id: r.id,
      gameId: r.game_id,
      gameTitle: gamesById[r.game_id] ? gamesById[r.game_id].title : null,
      gameImage: gamesById[r.game_id] ? gamesById[r.game_id].image_url : null,
      userId: r.user_id,
      userEmail: r.user_email,
      rating: r.rating,
      text: r.text,
      createdAt: r.created_at
    }));

    res.json({
      reviews: formattedReviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add review
router.post('/game/:gameId', authenticateToken, validateReview, async (req, res) => {
  const db = getDb();
  try {
    const gameId = req.params.gameId;
    const { rating, text } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Check if game exists
    const game = await db.collection('games').findOne({ id: gameId });
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Check if user already reviewed this game
    const existingReview = await db.collection('reviews').findOne({ game_id: gameId, user_id: userId });
    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this game' });
    }

    const reviewId = uuidv4();

    // Insert review
    const doc = { id: reviewId, game_id: gameId, user_id: userId, user_email: userEmail, rating: Number(rating), text: text || '', created_at: Date.now() };
    await db.collection('reviews').insertOne(doc);

    const newReview = {
      id: reviewId,
      gameId,
      userId,
      userEmail,
      rating,
      text: text || '',
      createdAt: Date.now(),
      replies: []
    };

    res.status(201).json({
      message: 'Review added successfully',
      review: newReview
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update review
router.put('/:reviewId', authenticateToken, validateReview, async (req, res) => {
  try {
    const reviewId = req.params.reviewId;
    const { rating, text } = req.body;
    const userId = req.user.id;

    const db = getDb();
    const review = await db.collection('reviews').findOne({ id: reviewId });
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to edit this review' });
    }

    await db.collection('reviews').updateOne({ id: reviewId }, { $set: { rating: Number(rating), text: text || '' } });

    const updatedReview = {
      id: review.id,
      gameId: review.game_id,
      userId: review.user_id,
      userEmail: review.user_email,
      rating,
      text: text || '',
      createdAt: review.created_at
    };

    res.json({
      message: 'Review updated successfully',
      review: updatedReview
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete review
router.delete('/:reviewId', authenticateToken, async (req, res) => {
  try {
    const reviewId = req.params.reviewId;
    const userId = req.user && req.user.id;

    console.log('DELETE /api/reviews/' + reviewId + ' requested by:', req.user ? { id: req.user.id, email: req.user.email, role: req.user.role } : null);
    console.log('Authorization header:', req.headers['authorization']);

    const db = getDb();

    const review = await db.collection('reviews').findOne({ id: reviewId });
    if (!review) return res.status(404).json({ error: 'Review not found' });

    if (review.user_id !== userId && (!req.user || req.user.role !== 'admin')) return res.status(403).json({ error: 'Not authorized to delete this review' });

    // Delete replies first, then review
    await db.collection('replies').deleteMany({ review_id: reviewId });
    const delRes = await db.collection('reviews').deleteOne({ id: reviewId });
    console.log('Delete result for review', reviewId, delRes);

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add reply to review
router.post('/:reviewId/replies', authenticateToken, validateReply, async (req, res) => {
  try {
    const reviewId = req.params.reviewId;
    const { text } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Check if review exists
      const db = getDb();
      const review = await db.collection('reviews').findOne({ id: reviewId });
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const replyId = uuidv4();

    // Insert reply
      const doc = { id: replyId, review_id: reviewId, user_id: userId, user_email: userEmail, text, created_at: Date.now() };
      await db.collection('replies').insertOne(doc);

    const newReply = {
      id: replyId,
      reviewId,
      userId,
      userEmail,
      text,
      createdAt: Date.now()
    };

    res.status(201).json({
      message: 'Reply added successfully',
      reply: newReply
    });
  } catch (error) {
    console.error('Add reply error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update reply
router.put('/replies/:replyId', authenticateToken, validateReply, async (req, res) => {
  try {
    const replyId = req.params.replyId;
    const { text } = req.body;
    const userId = req.user.id;

    const db = getDb();

    // Check if reply exists and belongs to user
    const reply = await db.collection('replies').findOne({ id: replyId });
    if (!reply) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    if (reply.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to edit this reply' });
    }

    // Update reply
    await db.collection('replies').updateOne({ id: replyId }, { $set: { text } });

    const updatedReply = {
      id: reply.id,
      reviewId: reply.review_id,
      userId: reply.user_id,
      userEmail: reply.user_email,
      text,
      createdAt: reply.created_at
    };

    res.json({
      message: 'Reply updated successfully',
      reply: updatedReply
    });
  } catch (error) {
    console.error('Update reply error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete reply
router.delete('/replies/:replyId', authenticateToken, async (req, res) => {
  try {
    const replyId = req.params.replyId;
    const userId = req.user.id;

    // Check if reply exists and belongs to user
    const reply = await db.collection('replies').findOne({ id: replyId });
    if (!reply) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    if (reply.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this reply' });
    }

    // Delete reply
    await db.collection('replies').deleteOne({ id: replyId });

    res.json({ message: 'Reply deleted successfully' });
  } catch (error) {
    console.error('Delete reply error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

