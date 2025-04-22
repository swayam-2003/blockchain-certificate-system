const pinataSDK = require('@pinata/sdk');
const fetch = require('node-fetch');
const https = require('https');

class PinataService {
    constructor() {
        this.pinata = null;
        this.maxRetries = 3;
        this.retryDelay = 2000; // 2 seconds
        this.initialize();
    }

    async initialize() {
        try {
            // Check if environment variables are set
            if (!process.env.PINATA_API_KEY || !process.env.PINATA_SECRET_API_KEY) {
                throw new Error('Pinata API credentials are not configured');
            }

            // Initialize with API key and secret from environment variables
            this.pinata = new pinataSDK({
                pinataApiKey: process.env.PINATA_API_KEY,
                pinataSecretApiKey: process.env.PINATA_SECRET_API_KEY
            });

            // Test the connection with retries
            await this.testConnectionWithRetry();
            
            console.log('Pinata service initialized successfully');
        } catch (error) {
            console.error('Error initializing Pinata service:', error.message);
            // Don't throw here, allow the service to continue with degraded functionality
            this.pinata = null;
        }
    }

    async testConnectionWithRetry() {
        let lastError;
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                console.log(`Attempting to connect to Pinata (attempt ${attempt}/${this.maxRetries})`);
                const result = await this.pinata.testAuthentication();
                console.log('Pinata authentication successful:', result);
                return true;
            } catch (error) {
                lastError = error;
                console.warn(`Pinata authentication attempt ${attempt} failed:`, error.message);
                if (attempt < this.maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                }
            }
        }
        console.error('All Pinata connection attempts failed');
        return false;
    }

    async uploadJSON(metadata) {
        try {
            if (!this.pinata) {
                await this.initialize(); // Try to reinitialize
                if (!this.pinata) {
                    throw new Error('Pinata service not available');
                }
            }

            if (!metadata) {
                throw new Error('No metadata provided for upload');
            }

            console.log('Uploading metadata to IPFS:', metadata);
            
            // Add timestamp to metadata
            const metadataWithTimestamp = {
                ...metadata,
                timestamp: Date.now()
            };

            const result = await this.pinata.pinJSONToIPFS(metadataWithTimestamp, {
                pinataMetadata: {
                    name: `Certificate-${Date.now()}`
                }
            });

            if (!result || !result.IpfsHash) {
                throw new Error('Failed to get IPFS hash from Pinata');
            }

            console.log('Successfully uploaded to IPFS:', result);
            return result.IpfsHash;
        } catch (error) {
            console.error('Error uploading to IPFS:', error.message);
            // Return a fallback hash or handle the error appropriately
            throw new Error(`Failed to upload to IPFS: ${error.message}`);
        }
    }

    async getJSON(hash) {
        if (!hash) {
            throw new Error('No IPFS hash provided');
        }

        console.log('Fetching data from IPFS for hash:', hash);

        // Try multiple IPFS gateways
        const gateways = [
            { url: 'https://gateway.pinata.cloud/ipfs/', auth: true },
            { url: 'https://ipfs.io/ipfs/', auth: false },
            { url: 'https://cloudflare-ipfs.com/ipfs/', auth: false },
            { url: 'https://gateway.ipfs.io/ipfs/', auth: false }
        ];

        for (const gateway of gateways) {
            try {
                const data = await this.fetchFromGateway(hash, gateway);
                if (data) {
                    return data;
                }
            } catch (error) {
                console.warn(`Failed to fetch from ${gateway.url}:`, error.message);
                continue;
            }
        }

        throw new Error('Failed to fetch data from all IPFS gateways');
    }

    async fetchFromGateway(hash, gateway) {
        const headers = {};
        if (gateway.auth) {
            headers['pinata_api_key'] = process.env.PINATA_API_KEY;
            headers['pinata_secret_api_key'] = process.env.PINATA_SECRET_API_KEY;
        }

        const agent = new https.Agent({
            rejectUnauthorized: false,
            timeout: 5000
        });

        const response = await fetch(`${gateway.url}${hash}`, {
            headers,
            agent,
            timeout: 5000
        });

        if (!response.ok) {
            throw new Error(`Gateway error: ${response.status}`);
        }

        return response.json();
    }
}

module.exports = new PinataService(); 