const mongoWrapper = require('./mongo');
const config = require('./config');

class MongoDatabase {
  constructor() {
    this.db = null;
  }

  async init() {
    // initialize mongo wrapper
    await mongoWrapper.init();
    this.db = mongoWrapper.getDb();

    // Ensure indexes
    await this.db.collection('users').createIndex({ email: 1 }, { unique: true });
    await this.db.collection('games').createIndex({ id: 1 }, { unique: true });
    await this.db.collection('reviews').createIndex({ id: 1 }, { unique: true });
    await this.db.collection('replies').createIndex({ id: 1 }, { unique: true });

    // Create default admin if missing
    await this.createDefaultAdmin();
    console.log('MongoDatabase initialized');
  }

  async createDefaultAdmin() {
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    const users = this.db.collection('users');
    const admin = await users.findOne({ role: 'admin' });
    if (!admin) {
      const adminId = uuidv4();
      const passwordHash = await bcrypt.hash('admin123', 10);
      await users.insertOne({ id: adminId, email: 'admin@example.com', password_hash: passwordHash, role: 'admin', created_at: Date.now() });
      console.log('Default admin user created in MongoDB: admin@example.com / admin123');
    }
  }

  // Minimal compatibility methods used by remaining code
  async run(sql, params = []) {
    // Provide a small set of mapped operations for backward compatibility
    const s = sql.trim().toUpperCase();

    if (/^INSERT INTO USERS/i.test(sql)) {
      const [id, email, password_hash, role, created_at] = params;
      await this.db.collection('users').insertOne({ id, email, password_hash, role, created_at });
      return { id, changes: 1 };
    }

    if (/^INSERT INTO GAMES/i.test(sql)) {
      const [id, title, genre, image_url, description, created_at] = params;
      await this.db.collection('games').insertOne({ id, title, genre, image_url, description, created_at });
      return { id, changes: 1 };
    }

    if (/^DELETE FROM GAMES/i.test(sql)) {
      const id = params[0];
      const reviewDocs = await this.db.collection('reviews').find({ game_id: id }).project({ id: 1 }).toArray();
      const reviewIds = reviewDocs.map(r => r.id);
      if (reviewIds.length) await this.db.collection('replies').deleteMany({ review_id: { $in: reviewIds } });
      await this.db.collection('reviews').deleteMany({ game_id: id });
      await this.db.collection('games').deleteOne({ id });
      return { changes: 1 };
    }

    if (/^DELETE FROM REVIEWS/i.test(sql)) {
      const id = params[0];
      await this.db.collection('replies').deleteMany({ review_id: id });
      await this.db.collection('reviews').deleteOne({ id });
      return { changes: 1 };
    }

    // For other operations, throw so callers are encouraged to use native Mongo driver paths
    throw new Error('MongoDatabase.run: Unsupported SQL: ' + sql);
  }

  async get(sql, params = []) {
    if (/FROM\s+users\s+WHERE\s+email/i.test(sql)) {
      const email = params[0];
      return await this.db.collection('users').findOne({ email });
    }

    if (/FROM\s+users\s+WHERE\s+id/i.test(sql)) {
      const id = params[0];
      return await this.db.collection('users').findOne({ id });
    }

    if (/SELECT id FROM games WHERE id/i.test(sql) || /SELECT \* FROM games WHERE id/i.test(sql)) {
      const id = params[0];
      return await this.db.collection('games').findOne({ id });
    }

    if (/SELECT \* FROM reviews WHERE id/i.test(sql)) {
      const id = params[0];
      return await this.db.collection('reviews').findOne({ id });
    }

    if (/SELECT COUNT\(\*\) as total FROM reviews WHERE game_id/i.test(sql)) {
      const gameId = params[0];
      const total = await this.db.collection('reviews').countDocuments({ game_id: gameId });
      return { total };
    }

    throw new Error('MongoDatabase.get: Unsupported SQL: ' + sql);
  }

  async all(sql, params = []) {
    if (/FROM games g\s+LEFT JOIN reviews r/i.test(sql)) {
      const pipeline = [
        { $lookup: { from: 'reviews', localField: 'id', foreignField: 'game_id', as: 'reviews' } },
        { $addFields: { avg_rating: { $avg: '$reviews.rating' }, review_count: { $size: '$reviews' } } },
        { $sort: { created_at: -1 } }
      ];
      const games = await this.db.collection('games').aggregate(pipeline).toArray();
      return games;
    }

    throw new Error('MongoDatabase.all: Unsupported SQL: ' + sql);
  }

  async close() {
    await mongoWrapper.close();
  }
}

const instance = new MongoDatabase();
module.exports = instance;

