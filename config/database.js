const mongoose = require('mongoose');

class Database {
    constructor() {
        this.connection = null;
        this.isConnected = false;
    }

    async connect() {
        if (this.isConnected) {
            console.log('MongoDB already connected');
            return this.connection;
        }

        try {
            const mongoUri = process.env.MONGO_URI;
            if (!mongoUri) {
                throw new Error('MONGO_URI environment variable is required');
            }

            const options = {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                bufferMaxEntries: 0,
                bufferCommands: false,
            };

            this.connection = await mongoose.connect(mongoUri, options);
            this.isConnected = true;
            
            console.log('✅ MongoDB connected successfully');
            
            mongoose.connection.on('error', (err) => {
                console.error('❌ MongoDB connection error:', err);
                this.isConnected = false;
            });

            mongoose.connection.on('disconnected', () => {
                console.log('⚠️ MongoDB disconnected');
                this.isConnected = false;
            });

            mongoose.connection.on('reconnected', () => {
                console.log('🔄 MongoDB reconnected');
                this.isConnected = true;
            });

            return this.connection;
        } catch (error) {
            console.error('❌ Failed to connect to MongoDB:', error.message);
            this.isConnected = false;
            throw error;
        }
    }

    async disconnect() {
        if (this.connection) {
            await mongoose.disconnect();
            this.connection = null;
            this.isConnected = false;
            console.log('MongoDB disconnected');
        }
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            name: mongoose.connection.name
        };
    }
}

module.exports = new Database();
