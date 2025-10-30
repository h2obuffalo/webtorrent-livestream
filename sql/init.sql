CREATE TABLE tickets (
  id SERIAL PRIMARY KEY,
  ticket_number VARCHAR(255) UNIQUE NOT NULL,
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  device_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE playback_tokens (
  id SERIAL PRIMARY KEY,
  token TEXT NOT NULL,
  ticket_id INTEGER REFERENCES tickets(id),
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE artists (
  id INTEGER PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  photo VARCHAR(255),
  website TEXT,
  bandcamp TEXT,
  blurb TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE artist_stages (
  artist_id INTEGER REFERENCES artists(id),
  stage_id INTEGER REFERENCES stages(id),
  PRIMARY KEY (artist_id, stage_id)
);

CREATE TABLE set_times (
  id SERIAL PRIMARY KEY,
  artist_id INTEGER REFERENCES artists(id),
  stage_id INTEGER REFERENCES stages(id),
  start_ts TIMESTAMPTZ NOT NULL,
  end_ts TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled'
);

CREATE TABLE lineup_changes (
  id SERIAL PRIMARY KEY,
  change_type VARCHAR(50) NOT NULL,
  artist_id INTEGER,
  from_json JSONB,
  to_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_number ON tickets(ticket_number);
CREATE INDEX idx_playback_tokens_token ON playback_tokens(token);
CREATE INDEX idx_set_times_artist ON set_times(artist_id);

