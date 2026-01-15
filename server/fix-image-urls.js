// Script to fix existing image URLs in the database
const db = require('./database');
const config = require('./config');

async function fixImageUrls() {
  try {
    await db.init();
    
    // Get all games with relative URLs
    const games = await db.all('SELECT * FROM games WHERE image_url LIKE "/uploads/%"');
    
    console.log(`Found ${games.length} games with relative image URLs`);
    
    for (const game of games) {
      const newUrl = `${config.baseUrl}${game.image_url}`;
      await db.run('UPDATE games SET image_url = ? WHERE id = ?', [newUrl, game.id]);
      console.log(`Updated game "${game.title}": ${game.image_url} -> ${newUrl}`);
    }
    
    console.log('Image URL fix completed!');
    await db.close();
  } catch (error) {
    console.error('Error fixing image URLs:', error);
  }
}

fixImageUrls();
