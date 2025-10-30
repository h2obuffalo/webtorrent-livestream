const express = require('express');
const router = express.Router();
const db = require('../db');

// Webhook to receive lineup updates from admin webform
router.post('/webhook', async (req, res) => {
  try {
    const artists = req.body;

    if (!Array.isArray(artists)) {
      return res.status(400).json({ error: 'Expected array of artists' });
    }

    // Get old lineup for diff
    const oldResult = await db.query(`
      SELECT * FROM artists ORDER BY id
    `);
    const oldArtists = oldResult.rows;

    // Use a transaction to update everything atomically
    await db.query('BEGIN');

    try {
      // Clear existing data
      await db.query('DELETE FROM artist_stages');
      await db.query('DELETE FROM set_times');
      await db.query('DELETE FROM stages');
      await db.query('DELETE FROM artists');

      // Insert artists
      for (const artist of artists) {
        // Insert artist
        await db.query(
          'INSERT INTO artists (id, name, photo, website, bandcamp, blurb, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
          [artist.id, artist.name, artist.photo, artist.website, artist.bandcamp, artist.blurb]
        );

        // Insert stages
        if (artist.stages && artist.stages.length > 0) {
          for (const stageName of artist.stages) {
            // Insert stage if it doesn't exist
            await db.query(
              'INSERT INTO stages (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
              [stageName]
            );

            // Link artist to stage
            const stageResult = await db.query('SELECT id FROM stages WHERE name = $1', [stageName]);
            if (stageResult.rows.length > 0) {
              await db.query(
                'INSERT INTO artist_stages (artist_id, stage_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [artist.id, stageResult.rows[0].id]
              );
            }
          }
        }

        // Insert set times
        if (artist.setTimes && artist.setTimes.length > 0) {
          for (const setTime of artist.setTimes) {
            const stageResult = await db.query('SELECT id FROM stages WHERE name = $1', [setTime.stage]);
            if (stageResult.rows.length > 0) {
              await db.query(
                'INSERT INTO set_times (artist_id, stage_id, start_ts, end_ts, status) VALUES ($1, $2, $3, $4, $5)',
                [artist.id, stageResult.rows[0].id, setTime.start, setTime.end, setTime.status || 'scheduled']
              );
            }
          }
        }
      }

      // Detect changes and log them
      const changes = detectChanges(oldArtists, artists);
      for (const change of changes) {
        await db.query(
          'INSERT INTO lineup_changes (change_type, artist_id, from_json, to_json) VALUES ($1, $2, $3, $4)',
          [change.type, change.artistId, JSON.stringify(change.from), JSON.stringify(change.to)]
        );
      }

      await db.query('COMMIT');

      res.json({
        success: true,
        artistsUpdated: artists.length,
        changesLogged: changes.length
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recent changes for News screen
router.get('/changes', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const result = await db.query(
      'SELECT * FROM lineup_changes ORDER BY created_at DESC LIMIT $1',
      [limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching changes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to detect changes (only stage and set time changes)
function detectChanges(oldArtists, newArtists) {
  const changes = [];
  const oldMap = new Map(oldArtists.map(a => [a.id, a]));

  for (const newArtist of newArtists) {
    const oldArtist = oldMap.get(newArtist.id);
    if (!oldArtist) continue;

    // Check for stage changes
    const oldStages = oldArtist.stages || [];
    const newStages = newArtist.stages || [];
    if (JSON.stringify(oldStages.sort()) !== JSON.stringify(newStages.sort())) {
      changes.push({
        type: 'stage-change',
        artistId: newArtist.id,
        from: oldStages,
        to: newStages
      });
    }

    // Check for set time changes (compare as JSON strings)
    const oldSetTimes = JSON.stringify((oldArtist.set_times || []).map(st => ({
      start: st.start_ts,
      end: st.end_ts,
      stage: st.stage,
      status: st.status
    })));
    const newSetTimes = JSON.stringify((newArtist.setTimes || []).map(st => ({
      start: st.start,
      end: st.end,
      stage: st.stage,
      status: st.status
    })));

    if (oldSetTimes !== newSetTimes) {
      changes.push({
        type: 'settime-change',
        artistId: newArtist.id,
        from: oldArtist.set_times || [],
        to: newArtist.setTimes || []
      });
    }
  }

  return changes;
}

module.exports = router;

