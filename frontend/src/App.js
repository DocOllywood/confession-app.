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
  
  useEffect(() => {
    const tempSession = `sess_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(tempSession);
  }, []);

  const handleSend = async () => {
    if (!confession.trim()) return;
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/confess`, {
        text: confession,
        sessionId: sessionId
      });
      setAiResponse(res.data.reply);
    } catch (err) {
      console.error("Error confessing:", err);
    }
    setIsLoading(false);
  };

  return (
    <div className="App">
      <div className="confessional-booth">
        <h1>🕯️ The Confessional</h1>
        <textarea 
          value={confession} 
          onChange={(e) => setConfession(e.target.value)} 
          placeholder="What is on your mind?"
        />
        <button onClick={handleSend} disabled={isLoading}>
          {isLoading ? 'Processing...' : 'Submit Confession'}
        </button>
        {aiResponse && <div className="response-box">{aiResponse}</div>}
      </div>
    </div>
  );
}

export default App;
