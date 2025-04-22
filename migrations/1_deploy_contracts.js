const CertificateRegistry = artifacts.require("CertificateRegistry");

module.exports = function (deployer) {
  deployer.deploy(CertificateRegistry);
}; 