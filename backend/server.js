
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 5000;
// In-memory database (replace with MongoDB/PostgreSQL in production)
const confessions = new Map();
const sentimentData = [];
// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);
// Helper: Analyze sentiment (without storing plaintext)
function analyzeSentimentMetrics(textLength, timestamp) {
  // This is a privacy-preserving metric that doesn't require content access
  return {
    timestamp,
    textLength,
    hour: new Date(timestamp).getHours(),
    dayOfWeek: new Date(timestamp).getDay()
  };
}
// ROUTES
// Submit encrypted confession
app.post('/api/confess', (req, res) => {
  try {
    const { sessionId, ciphertext, nonce, timestamp } = req.body;
    if (!ciphertext || !nonce || !sessionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const confessionId = `conf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const confession = {
      id: confessionId,
      sessionId,
      ciphertext,
      nonce,
      timestamp,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72 hours
      readCount: 0
    };
    confessions.set(confessionId, confession);
    // Store anonymized metrics for researcher dashboard
    sentimentData.push(analyzeSentimentMetrics(ciphertext.length, timestamp));
    // Auto-delete after 72 hours
    setTimeout(() => {
      confessions.delete(confessionId);
    }, 72 * 60 * 60 * 1000);
    res.json({ 
      id: confessionId,
      message: 'Confession encrypted and stored securely'
    });
  } catch (error) {
    console.error('Error storing confession:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Get encrypted confession (for reading)
app.get('/api/confess/:id', (req, res) => {
  try {
    const { id } = req.params;
    const confession = confessions.get(id);
    if (!confession) {
      return res.status(404).json({ error: 'Confession not found or already deleted' });
    }
    // Return encrypted data (client decrypts)
    res.json({
      ciphertext: confession.ciphertext,
      nonce: confession.nonce,
      timestamp: confession.timestamp
    });
  } catch (error) {
    console.error('Error retrieving confession:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Delete confession (self-destruct after reading)
app.delete('/api/confess/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = confessions.delete(id);
    if (deleted) {
      res.json({ message: 'Confession permanently deleted' });
    } else {
      res.status(404).json({ error: 'Confession not found' });
    }
  } catch (error) {
    console.error('Error deleting confession:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// AI Response (Claude API) - Non-judgmental listener
app.post('/api/ai-respond', async (req, res) => {
  try {
    const { confessionId, sessionId } = req.body;
    
    // Note: In production, you'd temporarily decrypt in memory, send to Claude, then discard
    // For this demo, we'll generate a compassionate response without the actual content
    
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: 'Someone just shared a personal confession with me. Respond with a brief, warm, non-judgmental message (2-3 sentences) that makes them feel heard and supported, without asking questions or giving advice. Just acknowledge their courage in sharing.'
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );
    const aiMessage = response.data.content[0].text;
    res.json({ response: aiMessage });
  } catch (error) {
    console.error('Error getting AI response:', error);
    res.json({ 
      response: 'Thank you for sharing. Your words matter, and I\'m here to listen without judgment.' 
    });
  }
});
// Researcher Dashboard - Anonymized metrics
app.get('/api/research/sentiment', (req, res) => {
  try {
    // Return only anonymized, aggregated data
    const aggregated = {
      totalConfessions: sentimentData.length,
      averageLength: sentimentData.reduce((acc, d) => acc + d.textLength, 0) / sentimentData.length || 0,
      timeDistribution: sentimentData.reduce((acc, d) => {
        acc[d.hour] = (acc[d.hour] || 0) + 1;
        return acc;
      }, {}),
      weekdayDistribution: sentimentData.reduce((acc, d) => {
        acc[d.dayOfWeek] = (acc[d.dayOfWeek] || 0) + 1;
        return acc;
      }, {})
    };
    res.json(aggregated);
  } catch (error) {
    console.error('Error generating research data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Crisis prediction (based on frequency, not content)
app.get('/api/research/crisis-alert', (req, res) => {
  try {
    const recentConfessions = sentimentData.filter(
      d => new Date(d.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    const alert = {
      riskLevel: recentConfessions.length > 10 ? 'elevated' : 'normal',
      frequency: recentConfessions.length,
      message: recentConfessions.length > 10 
        ? 'Elevated activity detected in the past 24 hours'
        : 'Activity within normal parameters'
    };
    res.json(alert);
  } catch (error) {
    console.error('Error generating crisis alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.listen(PORT, () => {
  console.log(`🔒 Secure confession server running on port ${PORT}`);
  console.log(`🌐 Backend ready for E2EE confessions`);
});
