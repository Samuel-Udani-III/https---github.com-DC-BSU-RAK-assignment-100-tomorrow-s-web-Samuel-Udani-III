const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const mongo = require('../mongo');
const config = require('../config');
const { validateSignup, validateLogin, validateAccountUpdate } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Sign up
router.post('/signup', validateSignup, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user already exists
    const dbMongo = mongo.getDb();
    const existingUser = await dbMongo.collection('users').findOne({ email }, { projection: { id: 1 } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    // Create user in MongoDB
    await dbMongo.collection('users').insertOne({ id: userId, email, password_hash: passwordHash, role: 'user', created_at: Date.now() });

    // Generate JWT token
    const token = jwt.sign(
      { userId: userId, email: email },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      user: { id: userId, email, role: 'user' },
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Log in
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user in MongoDB
    const dbMongo = mongo.getDb();
    const user = await dbMongo.collection('users').findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, role: user.role },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update account
router.put('/account', authenticateToken, validateAccountUpdate, async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get current user data from MongoDB
    const dbMongo = mongo.getDb();
    const user = await dbMongo.collection('users').findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check current password if changing password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }
      
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    // Check if email is already in use (if changing email)
    if (email && email !== user.email) {
      const existingUser = await dbMongo.collection('users').findOne({ email }, { projection: { id: 1 } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    // Update user
    const updates = [];
    const params = [];

    if (email && email !== user.email) {
      updates.push('email = ?');
      params.push(email);
    }

    if (newPassword) {
      const passwordHash = await bcrypt.hash(newPassword, 10);
      updates.push('password_hash = ?');
      params.push(passwordHash);
    }

    if (updates.length > 0) {
      // Build update object
      const updateObj = {};
      if (email && email !== user.email) updateObj.email = email;
      if (newPassword) updateObj.password_hash = updates.includes('password_hash = ?') ? await require('bcryptjs').hash(newPassword, 10) : undefined;
      // Remove undefined keys
      Object.keys(updateObj).forEach(k => updateObj[k] === undefined && delete updateObj[k]);

      if (Object.keys(updateObj).length > 0) {
        await dbMongo.collection('users').updateOne({ id: userId }, { $set: updateObj });

        // Update email in reviews and replies if email changed
        if (email && email !== user.email) {
          await dbMongo.collection('reviews').updateMany({ user_id: userId }, { $set: { user_email: email } });
          await dbMongo.collection('replies').updateMany({ user_id: userId }, { $set: { user_email: email } });
        }
      }
    }

    // Get updated user
    const updatedUser = await dbMongo.collection('users').findOne({ id: userId }, { projection: { id: 1, email: 1, role: 1 } });

    res.json({
      message: 'Account updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout (client-side token removal, but we can track sessions if needed)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // In a more sophisticated setup, you might want to blacklist the token
    // For now, we'll just return success and let the client remove the token
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

