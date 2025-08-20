import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../api';

export default function Dashboard() {
  const nav = useNavigate();
  const [pid, setPid] = useState('');
  const [owner, setOwner] = useState('Org1MSP');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function doRegister() {
    setBusy(true); setMsg('');
    try {
      await register(pid.trim(), owner.trim());
      setMsg('Registered ✔');
    } catch (e) { setMsg(e?.response?.data?.error || e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid gap-6">
      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Go to Patient</h2>
        <div className="flex gap-2">
          <input className="input" placeholder="Patient ID" value={pid} onChange={e=>setPid(e.target.value)}/>
          <button className="btn" onClick={()=>pid && nav(`/p/${pid.trim()}`)}>Open</button>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Register Patient</h2>
        <div className="grid gap-2">
          <label className="label">Patient ID</label>
          <input className="input" value={pid} onChange={e=>setPid(e.target.value)} placeholder="PID101"/>
          <label className="label">Owner Org (MSP)</label>
          <input className="input" value={owner} onChange={e=>setOwner(e.target.value)} placeholder="Org1MSP"/>
          <div className="flex gap-2 mt-2">
            <button className="btn" disabled={!pid || busy} onClick={doRegister}>Register</button>
            {msg && <span className="text-sm text-gray-600">{msg}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
