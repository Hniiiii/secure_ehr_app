import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import PatientSummary from '../components/PatientSummary.jsx';
import { getInfo, anchor, verify, getHistory, fetchFile } from '../api';

export default function Patient() {
  const { pid } = useParams();
  const [meta, setMeta] = useState(null);
  const [hist, setHist] = useState([]);
  const [file, setFile] = useState(null);
  const [mime, setMime] = useState('text/plain');
  const [busy, setBusy] = useState(false);
  const [vmsg, setVmsg] = useState('');

  async function refresh() {
    const m = await getInfo(pid);
    setMeta(m);
    const h = await getHistory(pid);
    setHist(h);
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [pid]);

  async function doAnchor() {
    if (!file) return;
    setBusy(true);
    try {
      await anchor(pid, file, mime);
      await refresh();
      setFile(null);
      alert('Anchored ✔');
    } catch (e) { alert(e?.response?.data?.error || e.message); }
    finally { setBusy(false); }
  }

  async function doVerify(txId) {
    setVmsg(''); setBusy(true);
    try {
      const r = await verify(pid, txId);
      setVmsg(r.ok ? `Verified OK (CID=${r.cid})` : 'Mismatch!');
    } catch (e) { setVmsg(e?.response?.data?.error || e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid gap-6">
      <PatientSummary meta={meta} />

      <div className="card">
        <h3 className="font-semibold mb-2">Anchor new document</h3>
        <div className="grid gap-2">
          <input type="file" onChange={e=>setFile(e.target.files?.[0] || null)} />
          <input className="input" value={mime} onChange={e=>setMime(e.target.value)} placeholder="text/plain" />
          <div className="flex gap-2">
            <button className="btn" disabled={!file || busy} onClick={doAnchor}>Encrypt & Upload</button>
            <button className="btn" disabled={!meta?.latestCid || busy} onClick={()=>fetchFile(pid)}>Fetch current</button>
            <button className="btn" disabled={busy} onClick={()=>doVerify()}>Verify current</button>
          </div>
          {vmsg && <div className="text-sm text-gray-700">{vmsg}</div>}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-3">History</h3>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left">
              <th className="py-2">Time</th><th>txId</th><th>CID</th><th>Size</th><th>MIME</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {hist.map(r=>(
                <tr key={r.txId} className="border-t">
                  <td className="py-2">{r.timestamp}</td>
                  <td className="pr-2 break-all">{r.txId}</td>
                  <td className="pr-2 break-all">{r.latestCid || '-'}</td>
                  <td className="pr-2">{r.size || '-'}</td>
                  <td className="pr-2">{r.mime || '-'}</td>
                  <td className="pr-2 flex gap-2">
                    <button className="btn" disabled={!r.latestCid || busy} onClick={()=>fetchFile(pid, r.txId)}>Fetch@tx</button>
                    <button className="btn" disabled={!r.latestCid || busy} onClick={()=>doVerify(r.txId)}>Verify@tx</button>
                  </td>
                </tr>
              ))}
              {!hist.length && <tr><td className="py-2 text-gray-500" colSpan={6}>No history yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
