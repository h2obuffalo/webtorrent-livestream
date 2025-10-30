const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');

// Validate ticket and issue playback token
router.post('/validate-ticket', async (req, res) => {
  try {
    const { ticketNumber, deviceId } = req.body;
    
    if (!ticketNumber || !deviceId) {
      return res.status(400).json({ error: 'Missing ticketNumber or deviceId' });
    }

    // Security off mode: always return a valid token
    if (process.env.AUTH_DISABLED === 'true') {
      const fakeToken = jwt.sign(
        { ticketId: 'disabled', deviceId, exp: Math.floor(Date.now() / 1000) + (4 * 24 * 60 * 60) },
        process.env.JWT_SECRET || 'default-secret'
      );
      return res.json({
        token: fakeToken,
        expiresAt: new Date(Date.now() + (4 * 24 * 60 * 60 * 1000)).toISOString()
      });
    }

    // Find ticket
    const ticketResult = await db.query(
      'SELECT * FROM tickets WHERE ticket_number = $1',
      [ticketNumber]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(403).json({ error: 'Invalid ticket number' });
    }

    const ticket = ticketResult.rows[0];

    // Check if ticket has expired
    if (ticket.expires_at && new Date(ticket.expires_at) < new Date()) {
      return res.status(403).json({ error: 'Ticket has expired' });
    }

    let activatedAt = ticket.activated_at;
    let expiresAt = ticket.expires_at;

    // If not yet activated, activate it now
    if (!activatedAt) {
      activatedAt = new Date();
      expiresAt = new Date(activatedAt.getTime() + (4 * 24 * 60 * 60 * 1000)); // 4 days
      
      await db.query(
        'UPDATE tickets SET activated_at = $1, expires_at = $2, device_id = $3 WHERE id = $4',
        [activatedAt, expiresAt, deviceId, ticket.id]
      );
    } else {
      // Already activated - check if device matches
      if (ticket.device_id !== deviceId) {
        return res.status(403).json({ error: 'Ticket already activated on another device' });
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { ticketId: ticket.id, deviceId, exp: Math.floor(new Date(expiresAt).getTime() / 1000) },
      process.env.JWT_SECRET || 'default-secret'
    );

    // Store token in playback_tokens table
    await db.query(
      'INSERT INTO playback_tokens (token, ticket_id, expires_at) VALUES ($1, $2, $3)',
      [token, ticket.id, expiresAt]
    );

    res.json({
      token,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('Error validating ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify playback token
router.get('/verify-token', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Missing token' });
    }

    // Security off mode: always return success
    if (process.env.AUTH_DISABLED === 'true') {
      return res.json({ valid: true });
    }

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    } catch (error) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Check if token exists in database
    const result = await db.query(
      'SELECT * FROM playback_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Token not found or expired' });
    }

    res.json({ valid: true, decoded });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

