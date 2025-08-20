import React from 'react';

export default function PatientSummary({ meta }) {
  if (!meta) return null;
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Patient {meta.patientId}</h2>
        <span className="text-sm text-gray-500">Owner: {meta.ownerOrg}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm mt-3">
        <div><span className="font-medium">Updated:</span> {meta.updatedAt}</div>
        <div><span className="font-medium">MIME:</span> {meta.mime || '-'}</div>
        <div className="col-span-2 break-all"><span className="font-medium">CID:</span> {meta.latestCid || '-'}</div>
        <div className="col-span-2 break-all"><span className="font-medium">DocHash:</span> {meta.latestDocHash || '-'}</div>
        <div><span className="font-medium">Size:</span> {meta.size || '-'}</div>
      </div>
    </div>
  );
}
