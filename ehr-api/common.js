// Common: Fabric gateway + AES-256-GCM helpers
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const grpc = require('@grpc/grpc-js');
const { connect, signers } = require('@hyperledger/fabric-gateway');
require('dotenv').config();

const MASTER = process.env.EHR_MASTER_KEY || 'demo-master-key';
// Derive 32-byte key from MASTER
const ENC_KEY = crypto.createHash('sha256').update(MASTER, 'utf8').digest(); // 32 bytes

function sealBytes(plainBuf) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const ct = Buffer.concat([c.update(plainBuf), c.final()]);
  const tag = c.getAuthTag();
  return Buffer.concat([iv, tag, ct]); // 12|16|N
}

function openBytes(sealed) {
  const iv = sealed.subarray(0, 12);
  const tag = sealed.subarray(12, 28);
  const ct = sealed.subarray(28);
  const d = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]);
}

function readFirstKeyPem(dir) {
  const f = fs.readdirSync(dir).find(f => f.endsWith('_sk') || f.endsWith('.pem'));
  if (!f) throw new Error(`No key in ${dir}`);
  return fs.readFileSync(path.join(dir, f));
}

async function getGateway() {
  const NETDIR = process.env.NETWORK_DIR || path.resolve(process.env.HOME, 'fabric-samples/test-network');
  const CHANNEL = process.env.CHANNEL || 'ehrchannel';
  const CCNAME  = process.env.CHAINCODE || 'ehrcc2';

  const tlsCertPath = path.join(NETDIR, 'organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt');
  const certPath    = path.join(NETDIR, 'organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/cert.pem');
  const keyDir      = path.join(NETDIR, 'organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore');

  const client = new grpc.Client(
    'localhost:7051',
    grpc.credentials.createSsl(fs.readFileSync(tlsCertPath)),
    { 'grpc.ssl_target_name_override': 'peer0.org1.example.com' }
  );

  const gw = connect({
    client,
    identity: { mspId: 'Org1MSP', credentials: fs.readFileSync(certPath) },
    signer: signers.newPrivateKeySigner(crypto.createPrivateKey(readFirstKeyPem(keyDir))),
    evaluateOptions: () => ({ deadline: Date.now() + 10_000 }),
    endorseOptions:  () => ({ deadline: Date.now() + 20_000 }),
    submitOptions:   () => ({ deadline: Date.now() + 20_000 })
  });

  const network  = gw.getNetwork(CHANNEL);
  const contract = network.getContract(CCNAME);
  return { gw, contract };
}

module.exports = { getGateway, sealBytes, openBytes };
