require('dotenv').config();
const path = require('path');

// Import Firebase service account
const serviceAccount = require(path.join(__dirname, './keys/firebase-service-account.json'));

module.exports = {
    port: process.env.PORT || 3000,
    web3: {
        provider: 'http://127.0.0.1:7545',  // Ganache Desktop port
        chainId: '1337',  // Ganache Desktop chain ID
    },
    firebase: serviceAccount,
    pinata: {
        apiKey: process.env.PINATA_API_KEY,
        apiSecret: process.env.PINATA_API_SECRET
    },
    issuerEmail: 'swayam.is21@bmsce.ac.in'
}; 