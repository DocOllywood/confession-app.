import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import QRCode from 'qrcode.react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [confession, setConfession] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [readLink, setReadLink] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [mode, setMode] = useState('write'); 

  useEffect(() => {
    const tempSession = `sess_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
    setSessionId(tempSession);
  }, []);

  return (
    <div className="App">
      <div className="confessional-booth">
        <h1 className="title">🕯️ The Confessional</h1>
        <textarea 
          className="confession-box" 
          value={confession} 
          onChange={(e) => setConfession(e.target.value)} 
          placeholder="Confess anonymously..."
        />
        <button className="submit-btn">📨 Submit Confession</button>
      </div>
    </div>
  );
}

export default App;