// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract CertificateRegistry is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    struct Certificate {
        string recipientName;
        string courseName;
        uint256 issueDate;
        uint256 validUntil;
        address issuerAddress;
        bytes32 certificateHash;  // Hash of the certificate data
        bool isValid;
        bool isRevoked;
        uint256 revocationDate;
        string usn;  // Added USN field
    }

    mapping(bytes32 => Certificate) public certificates;
    mapping(address => bool) public issuers;
    mapping(string => bool) public usedUSNs;  // Track used USNs

    event CertificateIssued(bytes32 indexed certificateId, string recipientName, string courseName, string usn);
    event CertificateRevoked(bytes32 indexed certificateId);
    event IssuerAdded(address indexed issuer);
    event IssuerRemoved(address indexed issuer);

    constructor() Ownable() {
        issuers[msg.sender] = true;
    }

    modifier onlyIssuer() {
        require(issuers[msg.sender], "Only issuers can call this function");
        _;
    }

    function addIssuer(address issuer) public onlyOwner {
        issuers[issuer] = true;
        emit IssuerAdded(issuer);
    }

    function removeIssuer(address issuer) public onlyOwner {
        issuers[issuer] = false;
        emit IssuerRemoved(issuer);
    }

    function issueCertificate(
        string memory recipientName,
        string memory courseName,
        uint256 validUntil,
        bytes32 certificateHash,
        string memory usn  // Added USN parameter
    ) public onlyIssuer returns (bytes32) {
        require(validUntil > block.timestamp, "Valid until date must be in the future");
        require(!usedUSNs[usn], "Certificate with this USN already exists");  // Check for USN duplicate
        
        bytes32 certificateId = keccak256(abi.encodePacked(
            recipientName,
            courseName,
            block.timestamp,
            msg.sender
        ));

        certificates[certificateId] = Certificate({
            recipientName: recipientName,
            courseName: courseName,
            issueDate: block.timestamp,
            validUntil: validUntil,
            issuerAddress: msg.sender,
            certificateHash: certificateHash,
            isValid: true,
            isRevoked: false,
            revocationDate: 0,
            usn: usn  // Store USN
        });

        usedUSNs[usn] = true;  // Mark USN as used
        emit CertificateIssued(certificateId, recipientName, courseName, usn);
        return certificateId;
    }

    function revokeCertificate(bytes32 certificateId) public onlyIssuer {
        require(certificates[certificateId].isValid, "Certificate is not valid");
        require(!certificates[certificateId].isRevoked, "Certificate is already revoked");
        
        certificates[certificateId].isRevoked = true;
        certificates[certificateId].revocationDate = block.timestamp;
        
        emit CertificateRevoked(certificateId);
    }

    function verifyCertificate(bytes32 certificateId) public view returns (bool) {
        Certificate memory cert = certificates[certificateId];
        return cert.isValid && !cert.isRevoked && block.timestamp <= cert.validUntil;
    }

    function getCertificate(bytes32 certificateId) public view returns (
        string memory recipientName,
        string memory courseName,
        uint256 issueDate,
        uint256 validUntil,
        address issuerAddress,
        bytes32 certificateHash,
        bool isValid,
        bool isRevoked,
        uint256 revocationDate,
        string memory usn  // Added USN to return values
    ) {
        Certificate memory cert = certificates[certificateId];
        return (
            cert.recipientName,
            cert.courseName,
            cert.issueDate,
            cert.validUntil,
            cert.issuerAddress,
            cert.certificateHash,
            cert.isValid,
            cert.isRevoked,
            cert.revocationDate,
            cert.usn  // Return USN
        );
    }

    function verifyCertificateHash(bytes32 certificateId, bytes32 providedHash) public view returns (bool) {
        return certificates[certificateId].certificateHash == providedHash;
    }

    function isUSNUsed(string memory usn) public view returns (bool) {
        return usedUSNs[usn];
    }
} 