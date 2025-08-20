'use strict';
const { Contract } = require('fabric-contract-api');

function txISO(ctx){
  const ts = ctx.stub.getTxTimestamp();
  const ms = Number(ts.seconds) * 1000 + Math.floor(ts.nanos/1e6);
  return new Date(ms).toISOString();
}

class AdminContract extends Contract {
  constructor(){ super('AdminContract'); }

  _assert(ctx){
    const m = ctx.clientIdentity.getMSPID();
    if(!['Org1MSP','Org2MSP'].includes(m)) throw new Error(`unauthorized: ${m}`);
  }

  async registerPatient(ctx, patientId, ownerOrg){
    this._assert(ctx);
    const key = ctx.stub.createCompositeKey('patientRef',[patientId]);
    const ex = await ctx.stub.getState(key);
    if(ex && ex.length) throw new Error(`Patient ${patientId} already registered`);
    const now = txISO(ctx);
    const ref = {type:'patientRef', patientId, ownerOrg, latestCid:null, latestDocHash:null, mime:null, size:null, createdAt:now, updatedAt:now};
    await ctx.stub.putState(key, Buffer.from(JSON.stringify(ref)));
    return ref;
  }

  async readPatient(ctx, patientId){
    this._assert(ctx);
    const key = ctx.stub.createCompositeKey('patientRef',[patientId]);
    const data = await ctx.stub.getState(key);
    if(!data || !data.length) throw new Error(`Patient ${patientId} does not exist`);
    return JSON.parse(data.toString());
  }

 async history(ctx, patientId) {
  const key = ctx.stub.createCompositeKey('patientRef', [patientId]);
  const iter = await ctx.stub.getHistoryForKey(key);
  const out = [];
  try {
    // iterator style (NOT for-await-of)
    while (true) {
      const res = await iter.next();
      if (res.done) break;
      const r = res.value; // { txId, timestamp, isDelete, value }
      const ts = r.timestamp;
      const tsIso = new Date(
        Number(ts.seconds) * 1000 + Math.floor(ts.nanos / 1e6)
      ).toISOString();

      let valueObj = {};
      if (r.value && r.value.length) {
        try { valueObj = JSON.parse(r.value.toString()); } catch { /* ignore */ }
      }

      out.push({
        txId: r.txId,
        isDelete: r.isDelete === true,
        timestamp: tsIso,
        latestCid: valueObj.latestCid ?? null,
        latestDocHash: valueObj.latestDocHash ?? null,
        mime: valueObj.mime ?? null,
        size: valueObj.size ?? null,
        updatedAt: valueObj.updatedAt ?? null,
      });
    }
  } finally {
    await iter.close();
  }
  return JSON.stringify(out);
}

}
module.exports = AdminContract;
