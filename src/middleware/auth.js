const admin = require('firebase-admin');
const config = require('../config/config');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(config.firebase)
    });
}

// Authentication middleware
const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('No token provided');
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// Issuer role verification middleware
const verifyIssuer = (req, res, next) => {
    if (!req.user || req.user.email !== config.issuerEmail) {
        return res.status(403).json({ error: 'Unauthorized: Only issuers can perform this action' });
    }
    next();
};

module.exports = {
    authenticateUser,
    verifyIssuer,
    admin // Export admin for use in other parts of the application
}; 