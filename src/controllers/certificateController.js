const Web3Service = require('../services/web3Service');
const PinataService = require('../services/pinataService');
const crypto = require('crypto');
const admin = require('../config/firebase');

class CertificateController {
    async generateCertificate(req, res) {
        try {
            const { studentName, courseName, validUntil, usn } = req.body;

            // Input validation
            if (!studentName || !courseName || !validUntil || !usn) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: studentName, courseName, validUntil, and USN are required'
                });
            }

            console.log('Generate certificate request received:', { studentName, courseName, validUntil, usn });

            // Ensure Web3Service is initialized
            try {
                await Web3Service.initialize();
            } catch (initError) {
                console.error('Failed to initialize Web3Service:', initError);
                throw new Error('Blockchain service initialization failed');
            }

            // Check if USN is already used
            try {
                const isUSNUsed = await Web3Service.isUSNUsed(usn);
                if (isUSNUsed) {
                    return res.status(400).json({
                        success: false,
                        message: 'Certificate with this USN already exists'
                    });
                }
            } catch (usnError) {
                console.error('Failed to check USN:', usnError);
                throw new Error('Failed to validate USN');
            }

            // Get contract owner address
            const issuerAddress = await Web3Service.getContractOwner();

            // Create certificate metadata
            const metadata = {
                recipientName: studentName,
                courseName: courseName,
                issueDate: Date.now(),
                validUntil: new Date(validUntil).getTime(),
                issuerAddress: issuerAddress,
                issuerEmail: req.user.email,
                usn: usn
            };

            // Upload metadata to IPFS
            let ipfsHash;
            try {
                ipfsHash = await PinataService.uploadJSON(metadata);
                console.log('Metadata uploaded to IPFS:', ipfsHash);
            } catch (ipfsError) {
                console.error('IPFS upload failed:', ipfsError);
                throw new Error(`Failed to upload to IPFS: ${ipfsError.message}`);
            }

            // Compute certificate hash
            const certificateHash = crypto
                .createHash('sha256')
                .update(JSON.stringify(metadata))
                .digest('hex');

            // Issue certificate on blockchain
            let blockchainResult;
            try {
                blockchainResult = await Web3Service.issueCertificate(
                    studentName,
                    courseName,
                    Math.floor(new Date(validUntil).getTime() / 1000),
                    '0x' + certificateHash,
                    usn
                );

                if (!blockchainResult || !blockchainResult.certificateId) {
                    throw new Error('Invalid response from blockchain');
                }

                console.log('Certificate issued on blockchain:', blockchainResult);
            } catch (blockchainError) {
                console.error('Blockchain issuance failed:', blockchainError);
                throw new Error(`Failed to issue certificate on blockchain: ${blockchainError.message}`);
            }

            // Create Firestore document
            const certificateData = {
                certificateId: blockchainResult.certificateId.toString(),
                ipfsHash: ipfsHash,
                studentName: studentName,
                courseName: courseName,
                issueDate: admin.firestore.Timestamp.fromMillis(metadata.issueDate),
                validUntil: admin.firestore.Timestamp.fromMillis(metadata.validUntil),
                issuerEmail: req.user.email,
                issuerAddress: issuerAddress,
                certificateHash: certificateHash,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                status: 'active',
                transactionHash: blockchainResult.transactionHash,
                blockNumber: blockchainResult.blockNumber,
                usn: usn
            };

            try {
                await admin.firestore()
                    .collection('certificates')
                    .doc(blockchainResult.certificateId.toString())
                    .set(certificateData);

                console.log('Certificate stored in Firestore:', blockchainResult.certificateId);
            } catch (firestoreError) {
                console.error('Firestore storage failed:', firestoreError);
                throw new Error(`Failed to store certificate data: ${firestoreError.message}`);
            }

            res.json({
                success: true,
                message: 'Certificate generated successfully',
                data: {
                    certificateId: blockchainResult.certificateId.toString(),
                    ipfsHash: ipfsHash,
                    transactionHash: blockchainResult.transactionHash,
                    blockNumber: blockchainResult.blockNumber,
                    usn: usn
                }
            });
        } catch (error) {
            console.error('Error generating certificate:', error);
            res.status(500).json({
                success: false,
                message: 'Error generating certificate',
                error: error.message
            });
        }
    }

    async validateCertificate(req, res) {
        try {
            let { certificateId } = req.params;
            
            if (!certificateId) {
                console.log('No certificate ID provided');
                return res.status(400).json({
                    success: false,
                    message: 'Certificate ID is required'
                });
            }

            // Clean the certificate ID
            certificateId = decodeURIComponent(certificateId).trim();
            console.log('Attempting to validate certificate:', certificateId);

            try {
                const db = admin.firestore();
                const certificatesRef = db.collection('certificates');
                let certificateDoc = null;

                // First try direct lookup by ID
                console.log('Trying direct lookup by ID:', certificateId);
                certificateDoc = await certificatesRef.doc(certificateId).get();

                // If not found and looks like a transaction hash, try that
                if (!certificateDoc.exists && certificateId.startsWith('0x')) {
                    console.log('Not found by ID, trying transaction hash lookup:', certificateId);
                    const querySnapshot = await certificatesRef
                        .where('transactionHash', '==', certificateId)
                        .limit(1)
                        .get();

                    if (!querySnapshot.empty) {
                        certificateDoc = querySnapshot.docs[0];
                        console.log('Found by transaction hash');
                    }
                }

                // If still not found, try numeric ID
                if (!certificateDoc.exists && !isNaN(certificateId)) {
                    console.log('Trying numeric ID lookup:', certificateId);
                    certificateDoc = await certificatesRef.doc(certificateId.toString()).get();
                }

                if (!certificateDoc.exists) {
                    console.log('Certificate not found after all attempts');
                    return res.status(404).json({
                        success: false,
                        message: 'Certificate not found. Please check the ID and try again.'
                    });
                }

                const data = certificateDoc.data();
                console.log('Found certificate data:', {
                    id: certificateDoc.id,
                    studentName: data.studentName,
                    courseName: data.courseName
                });

                const now = Date.now();
                const validUntil = data.validUntil.toDate();
                const isExpired = now > validUntil.getTime();

                res.json({
                    success: true,
                    certificate: {
                        id: certificateDoc.id,
                        studentName: data.studentName,
                        courseName: data.courseName,
                        issueDate: data.issueDate.toDate(),
                        validUntil: validUntil,
                        issuerEmail: data.issuerEmail,
                        status: isExpired ? 'expired' : 'active',
                        transactionHash: data.transactionHash,
                        blockNumber: data.blockNumber,
                        usn: data.usn
                    }
                });

            } catch (error) {
                console.error('Database error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error accessing certificate database',
                    error: error.message
                });
            }
        } catch (error) {
            console.error('Validation error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error validating certificate',
                error: error.message
            });
        }
    }

    async getRecentCertificates(req, res) {
        try {
            const certificatesRef = admin.firestore().collection('certificates');
            const snapshot = await certificatesRef
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get();

            const certificates = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                certificates.push({
                    id: doc.id,
                    studentName: data.studentName,
                    courseName: data.courseName,
                    issueDate: data.issueDate.toDate().toLocaleString(),
                    validUntil: data.validUntil.toDate().toLocaleString(),
                    status: Date.now() > data.validUntil.toMillis() ? 'Expired' : 'Valid',
                    ipfsHash: data.ipfsHash
                });
            });

            res.json({ certificates });
        } catch (error) {
            console.error('Error fetching recent certificates:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching recent certificates',
                error: error.message
            });
        }
    }

    async getMyCertificates(req, res) {
        try {
            const userEmail = req.user.email;
            const certificatesRef = admin.firestore().collection('certificates');
            const snapshot = await certificatesRef
                .where('issuerEmail', '==', userEmail)
                .orderBy('createdAt', 'desc')
                .get();

            const certificates = [];
            snapshot.forEach(doc => {
                certificates.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            res.json({ certificates });
        } catch (error) {
            console.error('Error fetching user certificates:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching user certificates',
                error: error.message
            });
        }
    }
}

module.exports = new CertificateController(); 