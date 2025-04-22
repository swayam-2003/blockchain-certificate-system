const pinataSDK = require('@pinata/sdk');
const config = require('../config/config');

class IPFSService {
    constructor() {
        this.pinata = pinataSDK(config.pinata.apiKey, config.pinata.apiSecret);
    }

    async uploadMetadata(metadata) {
        try {
            const result = await this.pinata.pinJSONToIPFS(metadata);
            return {
                success: true,
                ipfsHash: result.IpfsHash
            };
        } catch (error) {
            console.error('Error uploading to IPFS:', error);
            throw error;
        }
    }

    async getMetadata(ipfsHash) {
        try {
            const result = await this.pinata.getJSONFromHash(ipfsHash);
            return result;
        } catch (error) {
            console.error('Error fetching from IPFS:', error);
            throw error;
        }
    }
}

module.exports = new IPFSService(); 