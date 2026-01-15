// Quick test for Mongo initialization
process.env.USE_MONGO = 'true';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gamerate';

const config = require('./config');
console.log('config.useMongo=', config.useMongo, 'mongoUri=', config.mongoUri);

(async function(){
  try {
    const db = require('./database');
    await db.init();
    console.log('Database.init() succeeded (Mongo)');
    // Close if using mongo
    await db.close();
    console.log('Database closed');
    process.exit(0);
  } catch (err) {
    console.error('Database.init() failed:', err);
    process.exit(1);
  }
})();
