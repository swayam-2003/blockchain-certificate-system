const express = require('express');
const router = express.Router();
const { authenticateUser, verifyIssuer } = require('../middleware/auth');
const certificateController = require('../controllers/certificateController');

// Generate Certificate (Issuer only)
router.post(
    '/generate',
    authenticateUser,
    verifyIssuer,
    certificateController.generateCertificate.bind(certificateController)
);

// Validate Certificate (Public)
router.get(
    '/validate/:certificateId',
    certificateController.validateCertificate.bind(certificateController)
);

// Get Recent Certificates (Issuer only)
router.get(
    '/recent',
    authenticateUser,
    verifyIssuer,
    certificateController.getRecentCertificates.bind(certificateController)
);

// Get My Certificates (Authenticated users)
router.get(
    '/my-certificates',
    authenticateUser,
    certificateController.getMyCertificates.bind(certificateController)
);

module.exports = router; 