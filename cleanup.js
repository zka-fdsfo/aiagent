const mongoose = require('mongoose');
require('dotenv').config();

async function cleanupAll() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Drop all collections to start fresh
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    for (let collection of collections) {
      await db.collection(collection.name).drop();
      console.log(`✅ Dropped ${collection.name} collection`);
    }
    
    console.log('✅ All collections dropped! Starting fresh...');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Cleanup error:', error);
  } finally {
    process.exit(0);
  }
}

cleanupAll();