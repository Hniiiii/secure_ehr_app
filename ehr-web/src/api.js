import axios from 'axios';
const api = axios.create({ baseURL: 'http://localhost:4000/api' });

export async function register(pid, ownerOrg) {
  return (await api.post(`/patients/${pid}/register`, { ownerOrg })).data;
}
export async function getInfo(pid) {
  return (await api.get(`/patients/${pid}`)).data;
}
export async function getHistory(pid) {
  return (await api.get(`/patients/${pid}/history`)).data;
}
export async function anchor(pid, file, mime) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('mime', mime);
  return (await api.post(`/patients/${pid}/anchor`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
}
export async function verify(pid, txId) {
  return (await api.post(`/patients/${pid}/verify`, { txId })).data;
}
export function fetchFile(pid, txId) {
  const url = new URL(`http://localhost:4000/api/patients/${pid}/fetch`);
  if (txId) url.searchParams.set('txId', txId);
  window.location.href = url.toString();
}
