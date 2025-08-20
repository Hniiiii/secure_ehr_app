import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './index.css';
import Dashboard from './pages/Dashboard.jsx';
import Patient from './pages/Patient.jsx';

function Shell() {
  return (
    <div>
      <header className="bg-white shadow">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between">
          <Link to="/" className="font-semibold">EHR DApp</Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/p/:pid" element={<Patient />} />
        </Routes>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter><Shell/></BrowserRouter>
);
