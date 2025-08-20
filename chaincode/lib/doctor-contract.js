'use strict';
const { Contract } = require('fabric-contract-api');

class DoctorContract extends Contract {
  constructor() { super('DoctorContract'); }

  _assertClinician(ctx) {
    const msp = ctx.clientIdentity.getMSPID();
    if (!['Org1MSP', 'Org2MSP'].includes(msp)) {
      throw new Error(`Unauthorized MSP: ${msp}`);
    }
  }

  _txIso(ctx) {
    const ts = ctx.stub.getTxTimestamp();
    return new Date(Number(ts.seconds) * 1000 + Math.floor(ts.nanos / 1e6)).toISOString();
    // NOTE: new Date(ts.seconds.low * 1000) also works; above is safer across runtimes
  }

  async updatePatientMedicalDetails(ctx, patientId, cid, docHash, mime, size) {
    this._assertClinician(ctx);

    const key = ctx.stub.createCompositeKey('patientRef', [patientId]);
    const data = await ctx.stub.getState(key);
    if (!data || !data.length) throw new Error(`Patient ${patientId} does not exist`);

    const ref = JSON.parse(data.toString());
    ref.latestCid = cid || null;
    ref.latestDocHash = docHash || null;
    ref.mime = mime || null;
    ref.size = size || null;
    ref.updatedAt = this._txIso(ctx);

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(ref)));
    return ref;
  }

  /**
   * WRITE PRIVATE:
   * - Expect transient map key "pvt_b64" (UTF-8 string) containing Base64(IV|TAG|CT)
   * - Store EXACTLY that Base64 text into collection "ehrpvt"
   */
  async writePrivate(ctx, patientId) {
    this._assertClinician(ctx);

    // Ensure patient exists
    const key = ctx.stub.createCompositeKey('patientRef', [patientId]);
    const pub = await ctx.stub.getState(key);
    if (!pub || !pub.length) throw new Error(`Patient ${patientId} does not exist`);

    const t = ctx.stub.getTransient();
    if (!t || !t.has('pvt_b64')) throw new Error('Missing transient field "pvt_b64"');

    const b64 = t.get('pvt_b64').toString('utf8').trim();
    // Basic Base64 sanity check
    if (!/^[A-Za-z0-9+/=]+$/.test(b64) || b64.length < 24) {
      throw new Error('pvt_b64 is not valid Base64 text');
    }
    // Minimal structural check: decode and ensure plausible AES-GCM length (>= 12+16)
    let decoded;
    try { decoded = Buffer.from(b64, 'base64'); }
    catch { throw new Error('pvt_b64 is not decodable Base64'); }
    if (decoded.length < 28) throw new Error('pvt_b64 too short (need IV(12)+TAG(16)+CT)');

    // Store as UTF-8 text so reads never look like JSON/binary
    await ctx.stub.putPrivateData('ehrpvt', key, Buffer.from(b64, 'utf8'));
    return Buffer.from('OK');
  }

  /**
   * READ PRIVATE:
   * - Return the exact Base64 text previously stored (UTF-8).
   * - Client will Base64-decode and decrypt.
   */
  async readPrivate(ctx, patientId) {
    this._assertClinician(ctx);

    const key = ctx.stub.createCompositeKey('patientRef', [patientId]);
    const buf = await ctx.stub.getPrivateData('ehrpvt', key);

    // Return empty buffer if nothing stored
    if (!buf || !buf.length) return Buffer.from('', 'utf8');

    // Always return what we stored (UTF-8 Base64 text)
    return buf;
  }
}

module.exports = DoctorContract;
