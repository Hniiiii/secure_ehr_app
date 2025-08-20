const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { getGateway, sealBytes, openBytes } = require('./common');
const { getIpfs } = require('./ipfs');
const crypto = require('crypto');

const upload = multer({ storage: multer.memoryStorage() });
const app = express();
app.use(cors());
app.use(express.json());

/* helpers */
async function readPatient(contract, pid) {
  const b = await contract.evaluateTransaction('AdminContract:readPatient', pid);
  return JSON.parse(Buffer.from(b).toString('utf8'));
}
async function history(contract, pid) {
  const b = await contract.evaluateTransaction('AdminContract:history', pid);
  return JSON.parse(Buffer.from(b).toString('utf8'));
}
function sha256Hex(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/* routes */
app.post('/api/patients/:pid/register', async (req, res) => {
  const { pid } = req.params;
  const { ownerOrg } = req.body || {};
  try {
    const { gw, contract } = await getGateway();
    const out = await contract.submitTransaction('AdminContract:registerPatient', pid, ownerOrg || 'Org1MSP');
    gw.close();
    res.json(JSON.parse(Buffer.from(out).toString('utf8')));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/patients/:pid', async (req, res) => {
  const { pid } = req.params;
  try {
    const { gw, contract } = await getGateway();
    const meta = await readPatient(contract, pid);
    gw.close();
    res.json(meta);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/patients/:pid/history', async (req, res) => {
  const { pid } = req.params;
  try {
    const { gw, contract } = await getGateway();
    const h = await history(contract, pid);
    gw.close();
    res.json(h);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/patients/:pid/anchor', upload.single('file'), async (req, res) => {
  const { pid } = req.params;
  const mime = req.body?.mime || 'application/octet-stream';
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'file is required' });

  try {
    const plain = file.buffer;
    const docHash = sha256Hex(plain);
    const sealed = sealBytes(plain);

    const ipfs = await getIpfs();
    const added = await ipfs.add(sealed);
    const cid = added.cid.toString();

    const { gw, contract } = await getGateway();
    await contract.submitTransaction('DoctorContract:updatePatientMedicalDetails', pid, cid, docHash, mime, String(plain.length));
    const meta = await readPatient(contract, pid);
    gw.close();

    res.json({ cid, docHash, mime, size: String(plain.length), updatedAt: meta.updatedAt });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/patients/:pid/verify', async (req, res) => {
  const { pid } = req.params;
  const { txId } = req.body || {};
  try {
    const { gw, contract } = await getGateway();
    let cid, expectedHash, updatedAt, mime, size;

    if (txId) {
      const h = await history(contract, pid);
      const rec = h.find(r => r.txId === txId);
      if (!rec || !rec.latestCid) throw new Error('No CID at that txId');
      cid = rec.latestCid; expectedHash = rec.latestDocHash; updatedAt = rec.updatedAt; mime = rec.mime; size = rec.size;
    } else {
      const meta = await readPatient(contract, pid);
      if (!meta.latestCid) throw new Error('No CID stored for this patient');
      cid = meta.latestCid; expectedHash = meta.latestDocHash; updatedAt = meta.updatedAt; mime = meta.mime; size = meta.size;
    }
    gw.close();

    const ipfs = await getIpfs();
    const chunks = [];
    for await (const c of ipfs.cat(cid)) chunks.push(c);
    const sealed = Buffer.concat(chunks);
    const plain  = openBytes(sealed);
    const actual = sha256Hex(plain);

    res.json({ ok: actual === expectedHash, cid, updatedAt, mime, size });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/patients/:pid/fetch', async (req, res) => {
  const { pid } = req.params;
  const { txId } = req.query;
  try {
    const { gw, contract } = await getGateway();
    let cid, expectedHash, mime, size, updatedAt;

    if (txId) {
      const h = await history(contract, pid);
      const rec = h.find(r => r.txId === txId);
      if (!rec || !rec.latestCid) throw new Error('No CID at that txId');
      cid = rec.latestCid; expectedHash = rec.latestDocHash; mime = rec.mime || 'application/octet-stream'; size = rec.size; updatedAt = rec.updatedAt;
    } else {
      const meta = await readPatient(contract, pid);
      if (!meta.latestCid) throw new Error('No CID stored for this patient');
      cid = meta.latestCid; expectedHash = meta.latestDocHash; mime = meta.mime || 'application/octet-stream'; size = meta.size; updatedAt = meta.updatedAt;
    }
    gw.close();

    const ipfs = await getIpfs();
    const chunks = [];
    for await (const c of ipfs.cat(cid)) chunks.push(c);
    const sealed = Buffer.concat(chunks);
    const plain  = openBytes(sealed);
    const actual = sha256Hex(plain);
    if (expectedHash && expectedHash !== actual) throw new Error('Hash mismatch');

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${pid}-${txId ? txId.slice(0,8) : 'current'}"`);
    res.send(plain);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`EHR API listening on http://localhost:${PORT}`);
});
