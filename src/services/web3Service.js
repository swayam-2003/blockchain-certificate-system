const Web3 = require('web3');
const config = require('../config/config');
const CertificateContract = require('../../build/contracts/CertificateRegistry.json');

class Web3Service {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.contractOwner = null;
        this.contractAddress = null;
        this.maxRetries = 5;
        this.retryDelay = 2000; // 2 seconds
    }

    getContractAddress() {
        return this.contractAddress;
    }

    async initialize() {
        let retries = 0;
        while (retries < this.maxRetries) {
            try {
                console.log(`Attempt ${retries + 1} to initialize Web3 service...`);
                
                // Initialize Web3
                this.web3 = new Web3(new Web3.providers.HttpProvider(config.web3.provider));

                // Check Web3 connection
                const isConnected = await this.web3.eth.net.isListening();
                if (!isConnected) {
                    throw new Error('Not connected to Ethereum network');
                }
                console.log('Connected to Ethereum network');

                // Get network ID
                const networkId = await this.web3.eth.net.getId();
                console.log('Connected to network ID:', networkId);

                // Initialize contract owner
                const accounts = await this.web3.eth.getAccounts();
                console.log('Available accounts:', accounts);

                if (!accounts || accounts.length === 0) {
                    throw new Error('No accounts found in Ganache');
                }

                // Always use the first Ganache account for development
                this.contractOwner = { address: accounts[0] };
                console.log('Using contract owner account:', this.contractOwner.address);

                // Check contract deployment
                const deployedNetwork = CertificateContract.networks[networkId];
                if (!deployedNetwork) {
                    throw new Error(`Contract not deployed on network ${networkId}. Please run: truffle migrate --reset`);
                }
                this.contractAddress = deployedNetwork.address;
                console.log('Contract address:', this.contractAddress);

                // Initialize contract
                this.contract = new this.web3.eth.Contract(
                    CertificateContract.abi,
                    this.contractAddress
                );

                // Verify contract deployment
                const code = await this.web3.eth.getCode(this.contractAddress);
                if (code === '0x') {
                    throw new Error('Contract not deployed properly');
                }

                // Check balance
                const balance = await this.web3.eth.getBalance(this.contractOwner.address);
                console.log('Contract owner balance:', this.web3.utils.fromWei(balance, 'ether'), 'ETH');

                console.log('Web3 service initialized successfully!');
                return true;
            } catch (error) {
                console.error(`Attempt ${retries + 1} failed:`, error.message);
                retries++;
                if (retries < this.maxRetries) {
                    console.log(`Retrying in ${this.retryDelay/1000} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                } else {
                    console.error('Max retries reached. Could not initialize Web3 service.');
                    throw error;
                }
            }
        }
    }

    async issueCertificate(recipientName, courseName, validUntil, certificateHash, usn) {
        try {
            if (!this.contract || !this.contractOwner) {
                throw new Error('Web3 service not properly initialized');
            }

            console.log('Issuing certificate with params:', {
                recipientName,
                courseName,
                validUntil,
                certificateHash,
                usn,
                from: this.contractOwner.address
            });

            // Send transaction
            const result = await this.contract.methods.issueCertificate(
                recipientName,
                courseName,
                validUntil,
                certificateHash,
                usn
            ).send({
                from: this.contractOwner.address,
                gas: 500000
            });

            console.log('Transaction result:', result);

            // Get the certificate ID from the event
            const certificateId = result.events.CertificateIssued.returnValues.certificateId;

            return {
                success: true,
                certificateId,
                transactionHash: result.transactionHash,
                blockNumber: result.blockNumber
            };
        } catch (error) {
            console.error('Error issuing certificate:', error);
            throw error;
        }
    }

    async validateCertificate(certificateId) {
        try {
            if (!this.contract) {
                throw new Error('Web3 service not properly initialized');
            }

            console.log('Validating certificate ID:', certificateId);

            // First check if the certificate exists
            const certificateData = await this.contract.methods.getCertificate(certificateId).call();
            console.log('Certificate data from blockchain:', certificateData);

            if (!certificateData || !certificateData.isValid) {
                return { valid: false };
            }

            // Get the certificate details
            const {
                recipientName,
                courseName,
                issueDate,
                validUntil,
                issuerAddress,
                certificateHash,
                isValid,
                isRevoked,
                revocationDate
            } = certificateData;

            return {
                valid: true,
                data: {
                    recipientName,
                    courseName,
                    issueDate,
                    validUntil,
                    issuerAddress,
                    certificateHash,
                    isValid,
                    isRevoked,
                    revocationDate
                }
            };
        } catch (error) {
            console.error('Error validating certificate:', error);
            throw new Error(`Failed to validate certificate: ${error.message}`);
        }
    }

    async getCertificate(certificateId) {
        try {
            if (!this.contract) {
                await this.initialize();
                if (!this.contract) {
                    throw new Error('Web3 service not properly initialized');
                }
            }

            console.log('Getting certificate data for ID:', certificateId);
            const certificateData = await this.contract.methods.getCertificate(certificateId).call();
            
            if (!certificateData) {
                throw new Error('No certificate data found');
            }

            // Convert timestamps from blockchain format (seconds) to JavaScript format (milliseconds)
            const issueDate = new Date(parseInt(certificateData.issueDate) * 1000);
            const validUntil = new Date(parseInt(certificateData.validUntil) * 1000);
            const now = new Date();

            // Check if certificate is expired
            const isExpired = now > validUntil;

            return {
                isValid: certificateData.isValid && !isExpired && !certificateData.isRevoked,
                recipientName: certificateData.recipientName,
                courseName: certificateData.courseName,
                issueDate: issueDate.toISOString(),
                validUntil: validUntil.toISOString(),
                issuerAddress: certificateData.issuerAddress,
                certificateHash: certificateData.certificateHash,
                isRevoked: certificateData.isRevoked,
                revocationDate: certificateData.revocationDate ? 
                    new Date(parseInt(certificateData.revocationDate) * 1000).toISOString() : null
            };
        } catch (error) {
            console.error('Error getting certificate:', error);
            throw new Error(`Failed to get certificate: ${error.message}`);
        }
    }

    async verifyCertificateHash(certificateId, providedHash) {
        try {
            if (!this.contract) {
                await this.initialize();
                if (!this.contract) {
                    throw new Error('Web3 service not properly initialized');
                }
            }

            if (!certificateId || !providedHash) {
                throw new Error('Certificate ID and hash are required');
            }

            console.log('Verifying certificate hash:', { certificateId, providedHash });
            const isValid = await this.contract.methods.verifyCertificateHash(certificateId, providedHash).call();
            console.log('Hash verification result:', isValid);
            return isValid;
        } catch (error) {
            console.error('Error verifying certificate hash:', error);
            throw new Error(`Failed to verify certificate hash: ${error.message}`);
        }
    }

    async getContractOwner() {
        if (!this.contractOwner) {
            throw new Error('Web3 service not properly initialized');
        }
        return this.contractOwner.address;
    }

    async isUSNUsed(usn) {
        try {
            if (!this.contract) {
                throw new Error('Web3 service not properly initialized');
            }

            return await this.contract.methods.isUSNUsed(usn).call();
        } catch (error) {
            console.error('Error checking USN:', error);
            throw error;
        }
    }
}

module.exports = new Web3Service(); 