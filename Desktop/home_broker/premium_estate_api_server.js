const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Import database initialization
const { initDatabase } = require('./database/init');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const propertyRoutes = require('./routes/properties');
const projectRoutes = require('./routes/projects');
const messageRoutes = require('./routes/messages');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.mkdirSync(path.join(uploadsDir, 'properties', 'images'), { recursive: true });
    fs.mkdirSync(path.join(uploadsDir, 'users', 'avatars'), { recursive: true });
    fs.mkdirSync(path.join(uploadsDir, 'documents'), { recursive: true });
}

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/messages', messageRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Premium Estate API is running' });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// Initialize database and start server
initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`🏠 Premium Estate API Server running on port ${PORT}`);
        console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
        console.log(`📁 Static files: http://localhost:${PORT}/uploads`);
    });
}).catch(error => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
});