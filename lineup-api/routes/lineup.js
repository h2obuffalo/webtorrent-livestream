const express = require('express');
const router = express.Router();
const db = require('../db');
const etag = require('etag');

// Get lineup JSON with ETag support
router.get('/lineup.json', async (req, res) => {
  try {
    // Fetch all artists with their stages and set times
    const artistsResult = await db.query(`
      SELECT 
        a.id,
        a.name,
        a.photo,
        a.website,
        a.bandcamp,
        a.blurb,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', s.id, 'name', s.name)) FILTER (WHERE s.id IS NOT NULL),
          '[]'
        ) as stages,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', st.id,
              'start', st.start_ts,
              'end', st.end_ts,
              'stage', stage.name,
              'status', st.status
            )
          ) FILTER (WHERE st.id IS NOT NULL),
          '[]'
        ) as setTimes
      FROM artists a
      LEFT JOIN artist_stages ars ON a.id = ars.artist_id
      LEFT JOIN stages s ON ars.stage_id = s.id
      LEFT JOIN set_times st ON a.id = st.artist_id
      LEFT JOIN stages stage ON st.stage_id = stage.id
      GROUP BY a.id, a.name, a.photo, a.website, a.bandcamp, a.blurb
      ORDER BY a.id
    `);

    let artists = artistsResult.rows.map(row => {
      // Parse stages and setTimes from JSON
      let stages = [];
      if (row.stages && row.stages !== '[]') {
        stages = typeof row.stages === 'string' ? JSON.parse(row.stages) : row.stages;
      }
      
      let setTimes = [];
      if (row.set_times && row.set_times !== '[]') {
        setTimes = typeof row.set_times === 'string' ? JSON.parse(row.set_times) : row.set_times;
      }

      // Map to match expected format
      stages = stages.map(s => s.name);
      setTimes = setTimes.map(st => ({
        start: st.start,
        end: st.end,
        stage: st.stage,
        status: st.status
      }));

      return {
        id: row.id,
        name: row.name,
        photo: row.photo,
        website: row.website,
        bandcamp: row.bandcamp,
        blurb: row.blurb,
        stages: stages.filter((v, i, a) => a.indexOf(v) === i), // Remove duplicates
        setTimes
      };
    });

    const jsonString = JSON.stringify(artists);
    const hash = etag(jsonString);

    // Check if client has cached version
    const clientEtag = req.headers['if-none-match'];
    if (clientEtag === hash) {
      return res.status(304).send();
    }

    res.set({
      'Content-Type': 'application/json',
      'ETag': hash,
      'Last-Modified': new Date().toUTCString()
    });

    res.json(artists);
  } catch (error) {
    console.error('Error fetching lineup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

