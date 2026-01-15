// Check games in the database
const mongoWrapper = require('./mongo');

async function checkGames() {
  try {
    await mongoWrapper.init();
    const db = mongoWrapper.getDb();
    const games = await db.collection('games').find({}).toArray();
    console.log(`Found ${games.length} games:`);
    games.forEach(game => {
      console.log(`- ${game.title}: ${game.image_url}`);
    });
    await mongoWrapper.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkGames();