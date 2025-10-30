const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const fs = require('fs');

const upload = multer({ dest: '/tmp/' });

// Upload tickets from CSV or JSON
router.post('/upload-tickets', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    let ticketNumbers = [];

    // Try to parse as JSON first
    if (req.file.mimetype === 'application/json') {
      const data = JSON.parse(fileContent);
      ticketNumbers = Array.isArray(data) ? data : data.tickets || [];
    } else {
      // Parse as CSV
      const lines = fileContent.split('\n');
      ticketNumbers = lines
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
          // Handle CSV with or without headers
          const parts = line.split(',');
          return parts[0].trim();
        });
    }

    // Remove duplicates
    const uniqueTickets = [...new Set(ticketNumbers)];

    // Insert tickets into database
    let inserted = 0;
    let errors = 0;

    for (const ticketNumber of uniqueTickets) {
      try {
        await db.query(
          'INSERT INTO tickets (ticket_number) VALUES ($1) ON CONFLICT (ticket_number) DO NOTHING',
          [ticketNumber]
        );
        inserted++;
      } catch (error) {
        console.error(`Error inserting ticket ${ticketNumber}:`, error.message);
        errors++;
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      inserted,
      errors,
      total: uniqueTickets.length
    });
  } catch (error) {
    console.error('Error uploading tickets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle security on/off
router.post('/toggle-security', async (req, res) => {
  try {
    const { enabled } = req.body;
    // This is a runtime flag check - actual implementation would need to restart
    // For now, just acknowledge the request
    process.env.AUTH_DISABLED = enabled === false ? 'true' : 'false';
    
    res.json({
      success: true,
      message: `Security ${enabled === false ? 'disabled' : 'enabled'}`,
      note: 'Restart required for full effect'
    });
  } catch (error) {
    console.error('Error toggling security:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

