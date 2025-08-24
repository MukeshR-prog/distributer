const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Create indexes for better performance
    await createIndexes();
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    // Create compound indexes for better query performance
    const db = mongoose.connection.db;
    
    // Users collection indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ createdAt: -1 });
    
    // Distributions collection indexes
    await db.collection('distributions').createIndex({ createdAt: -1 });
    await db.collection('distributions').createIndex({ 'agents.agentId': 1 });
    await db.collection('distributions').createIndex({ fileName: 1 });
    
    console.log('📊 Database indexes created successfully');
  } catch (error) {
    console.log('⚠️  Index creation warning:', error.message);
  }
};

module.exports = connectDB;
