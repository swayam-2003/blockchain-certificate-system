require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const config = require('./config/config');
const certificateRoutes = require('./routes/certificateRoutes');
const web3Service = require('./services/web3Service');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(cors());

// API Routes
app.use('/api/certificates', certificateRoutes);

// Serve static files for all other routes (SPA support)
app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, '../public', 'index.html'));
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: err.message || 'Internal Server Error'
    });
});

// Initialize Web3 service and start server
async function startServer() {
    try {
        const initialized = await web3Service.initialize();
        if (!initialized) {
            throw new Error('Failed to initialize Web3 service');
        }

        app.listen(config.port, () => {
            console.log(`Server running at http://localhost:${config.port}`);
            console.log('API endpoints available at:');
            console.log('  POST /api/certificates/generate');
            console.log('  GET  /api/certificates/validate/:id');
            console.log('  GET  /api/certificates/recent');
            console.log('  GET  /api/certificates/my-certificates');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer(); 