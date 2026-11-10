const mongoose = require('mongoose');

async function connectDB(uri) {
  if (!uri || uri.includes('<password>')) {
    console.warn('[db] MONGODB_URI not set - using in-memory store (data resets on restart).');
    return false;
  }
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log('[db] Connected to MongoDB');
    return true;
  } catch (err) {
    console.error('[db] Connection failed, falling back to in-memory store:', err.message);
    return false;
  }
}

module.exports = { connectDB, isConnected: () => mongoose.connection.readyState === 1 };
