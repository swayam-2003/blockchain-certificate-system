# Blockchain Certificate System

A decentralized certificate generation and validation system built on Ethereum blockchain. This system allows educational institutions to issue tamper-proof certificates to students, with each certificate being uniquely identified by a USN (University Serial Number).

## Author
- **Name**: Swayam Vasudev Nayak
- **GitHub**: [swayam-2003](https://github.com/swayam-2003)
- **Email**: swayamvasudevnayak@gmail.com

## Features

- 🔒 Blockchain-verified certificates
- 📝 Unique USN-based certificate generation
- 🔍 Certificate validation and verification
- 🌐 IPFS integration for metadata storage
- 🔐 Role-based access control (Issuer/Student)
- 📱 Responsive web interface

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript, Bootstrap
- **Backend**: Node.js, Express.js
- **Blockchain**: Ethereum, Web3.js, Truffle
- **Storage**: IPFS (via Pinata)
- **Authentication**: Firebase Authentication
- **Database**: Firebase Firestore

## Prerequisites

- Node.js (v14 or higher)
- Ganache Desktop (for local blockchain)
- MetaMask browser extension
- Truffle Suite
- Firebase account
- Pinata account (for IPFS)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/swayam-2003/blockchain-certificate-system.git
cd blockchain-certificate-system
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
# Server Configuration
PORT=3000

# Firebase Configuration
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email

# Pinata Configuration
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_key

# Web3 Configuration
WEB3_PROVIDER=http://127.0.0.1:7545
WEB3_CHAIN_ID=1337

# Issuer Configuration
ISSUER_EMAIL=your_issuer_email
```

4. Configure Firebase:
   - Create a Firebase project
   - Download the service account key
   - Place it in `src/config/keys/firebase-service-account.json`
   - Add the file to `.gitignore`

## Smart Contract Deployment

1. Start Ganache Desktop:
   - Open Ganache Desktop
   - Create a new workspace
   - Ensure it's running on port 7545

2. Deploy the smart contract:
```bash
truffle migrate --reset
```

### Gas Usage During Deployment

The deployment process involves several gas-consuming operations:

1. **Contract Deployment**:
   - Initial deployment of `CertificateRegistry.sol`
   - Gas cost: ~3,000,000 gas
   - Includes contract creation and constructor execution

2. **Contract Initialization**:
   - Setting up initial state variables
   - Gas cost: ~100,000 gas
   - Includes mapping initializations

## Running the Application

1. Start the development server:
```bash
npm run dev
```

2. Access the application:
   - Open `http://localhost:3000` in your browser
   - Connect MetaMask to Ganache network
   - Import a Ganache account into MetaMask

## Gas Usage in Operations

### Certificate Generation
- **Gas Cost**: ~200,000 - 300,000 gas
- **Operations**:
  - USN validation check
  - Certificate data storage
  - Event emission
  - State updates

### Certificate Validation
- **Gas Cost**: ~21,000 gas (view function)
- **Operations**:
  - Certificate existence check
  - Validity verification
  - Status check

### Certificate Revocation
- **Gas Cost**: ~50,000 gas
- **Operations**:
  - Status update
  - Revocation timestamp
  - Event emission

## Project Structure

```
blockchain-certificate-system/
├── contracts/
│   └── CertificateRegistry.sol    # Smart contract
├── src/
│   ├── config/                    # Configuration files
│   ├── controllers/              # Request handlers
│   ├── middleware/               # Express middleware
│   ├── routes/                   # API routes
│   ├── services/                 # Business logic
│   └── index.js                  # Application entry
├── public/
│   └── pages/                    # Frontend pages
└── build/                        # Compiled contracts
```

## API Endpoints

### Certificate Generation
- **POST** `/api/certificates/generate`
  - Requires issuer authentication
  - Body: `{ studentName, courseName, validUntil, usn }`

### Certificate Validation
- **GET** `/api/certificates/validate/:certificateId`
  - Public endpoint
  - Returns certificate details and validity

### Recent Certificates
- **GET** `/api/certificates/recent`
  - Returns 10 most recent certificates

### My Certificates
- **GET** `/api/certificates/my-certificates`
  - Returns certificates issued by the authenticated user

## Security Features

1. **USN Uniqueness**:
   - Each USN can only be used once
   - Prevents duplicate certificates

2. **Role-Based Access**:
   - Only authorized issuers can generate certificates
   - Email domain verification (@bmsce.ac.in)

3. **Blockchain Security**:
   - Immutable certificate records
   - Cryptographic verification
   - Timestamp validation

## IPFS Integration

- Certificate metadata is stored on IPFS
- Provides decentralized storage
- Ensures data availability
- Hash-based content addressing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the development team. 