// IPFS client (works with Node CJS via dynamic import)
let ipfsClientPromise;
async function getIpfs() {
  if (!ipfsClientPromise) {
    ipfsClientPromise = (async () => {
      const { create } = await import('ipfs-http-client');
      const url = process.env.IPFS_API || 'http://127.0.0.1:5001';
      return create({ url });
    })();
  }
  return ipfsClientPromise;
}
module.exports = { getIpfs };
