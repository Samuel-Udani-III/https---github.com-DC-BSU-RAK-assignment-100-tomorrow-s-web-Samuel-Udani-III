const { MongoClient } = require('mongodb');
const config = require('./config');

let client = null;
let db = null;

async function init() {
	if (!config.useMongo) {
		console.log('Mongo integration disabled (USE_MONGO not true)');
		return;
	}

	try {
		// Remove deprecated options for MongoDB driver >= 4.x
		client = new MongoClient(config.mongoUri);
		await client.connect();
		// If a database name is provided in the URI, client.db() will use it; otherwise use 'prg'
		db = client.db();
		console.log('Connected to MongoDB:', config.mongoUri);
	} catch (err) {
		console.error('Failed to connect to MongoDB:', err);
		throw err;
	}
}

function getDb() {
	if (!db) throw new Error('MongoDB not initialized. Call init() first.');
	return db;
}

async function close() {
	if (client) {
		try {
			await client.close();
			console.log('MongoDB connection closed');
		} catch (err) {
			console.error('Error closing MongoDB connection:', err);
		}
	}
}

module.exports = {
	init,
	getDb,
	close
};
