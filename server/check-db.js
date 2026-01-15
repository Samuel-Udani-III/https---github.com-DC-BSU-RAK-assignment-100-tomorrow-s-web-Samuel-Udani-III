const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gamerate';

(async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    console.log('Connected to MongoDB database:', db.databaseName);

    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));

    const names = collections.map(c => c.name);
    for (const name of ['users','games','reviews','replies']) {
      if (names.includes(name)) {
        const col = db.collection(name);
        const cnt = await col.countDocuments();
        console.log(`${name}: ${cnt} documents`);
        const sample = await col.find().limit(3).toArray();
        console.log(`${name} sample:`, sample);
      } else {
        console.log(`${name}: (collection not found)`);
      }
    }
  } catch (err) {
    console.error('Error connecting to MongoDB:', err.message);
    process.exitCode = 2;
  } finally {
    try { await client.close(); } catch(e){}
  }
})();
