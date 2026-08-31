-- ============================================================
-- AME St. Joseph Church — Supabase Schema
-- Run this entire file in your Supabase SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run)
-- ============================================================

CREATE TABLE IF NOT EXISTS church_users (
  id         BIGSERIAL PRIMARY KEY,
  username   TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'editor',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS church_posts (
  id             BIGSERIAL PRIMARY KEY,
  type           TEXT NOT NULL,
  title          TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  body           TEXT NOT NULL,
  excerpt        TEXT,
  image_url      TEXT,
  event_date     TEXT,
  event_time     TEXT,
  event_location TEXT,
  scripture      TEXT,
  speaker        TEXT,
  video_url      TEXT,
  recurrence     TEXT,
  published      INTEGER NOT NULL DEFAULT 1,
  featured       INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS church_contact_messages (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  subject    TEXT,
  message    TEXT NOT NULL,
  read       INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS church_site_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS church_session (
  sid    VARCHAR NOT NULL COLLATE "default",
  sess   JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  CONSTRAINT church_session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS=FALSE);
CREATE INDEX IF NOT EXISTS idx_church_session_expire ON church_session (expire);

-- Link gallery photos to an event post
ALTER TABLE church_posts ADD COLUMN IF NOT EXISTS linked_event_id BIGINT REFERENCES church_posts(id) ON DELETE SET NULL;

-- Gallery album images (many photos per gallery post)
CREATE TABLE IF NOT EXISTS church_gallery_images (
  id         BIGSERIAL PRIMARY KEY,
  post_id    BIGINT NOT NULL REFERENCES church_posts(id) ON DELETE CASCADE,
  image_url  TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE church_gallery_images DISABLE ROW LEVEL SECURITY;

-- Indexes for frequently filtered/sorted columns
CREATE INDEX IF NOT EXISTS idx_church_posts_type        ON church_posts (type);
CREATE INDEX IF NOT EXISTS idx_church_posts_published   ON church_posts (published);
CREATE INDEX IF NOT EXISTS idx_church_posts_type_pub    ON church_posts (type, published);
CREATE INDEX IF NOT EXISTS idx_church_posts_created_at  ON church_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_church_posts_featured    ON church_posts (featured);
CREATE INDEX IF NOT EXISTS idx_church_messages_read      ON church_contact_messages (read);
CREATE INDEX IF NOT EXISTS idx_church_posts_linked_event ON church_posts (linked_event_id);
CREATE INDEX IF NOT EXISTS idx_gallery_images_post ON church_gallery_images (post_id, sort_order);

CREATE OR REPLACE FUNCTION get_post_stats()
RETURNS TABLE(sermons BIGINT, events BIGINT, updates BIGINT, programs BIGINT, gallery BIGINT, total BIGINT) AS $$
  SELECT
    COUNT(CASE WHEN type = 'sermon'  THEN 1 END),
    COUNT(CASE WHEN type = 'event'   THEN 1 END),
    COUNT(CASE WHEN type = 'update'  THEN 1 END),
    COUNT(CASE WHEN type = 'program' THEN 1 END),
    COUNT(CASE WHEN type = 'gallery' THEN 1 END),
    COUNT(*)
  FROM church_posts;
$$ LANGUAGE SQL;

-- Hymnal
CREATE TABLE IF NOT EXISTS church_hymns (
  id         BIGSERIAL PRIMARY KEY,
  number     INTEGER NOT NULL UNIQUE,
  title      TEXT NOT NULL,
  author     TEXT,
  lyrics     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Each language section carries its own numbering, restarting at 1.
ALTER TABLE church_hymns ADD COLUMN IF NOT EXISTS section TEXT NOT NULL DEFAULT 'English';
ALTER TABLE church_hymns DROP CONSTRAINT IF EXISTS church_hymns_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS church_hymns_number_section_key ON church_hymns (number, section);
CREATE INDEX IF NOT EXISTS idx_church_hymns_number ON church_hymns (number);
-- Ordering rank so English hymns lead and other languages follow alphabetically.
ALTER TABLE church_hymns ADD COLUMN IF NOT EXISTS section_rank SMALLINT NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION church_hymns_set_section_rank()
RETURNS TRIGGER AS $
BEGIN
  NEW.section_rank := CASE NEW.section
    WHEN 'English'   THEN 0
    WHEN 'Afrikaans' THEN 1
    WHEN 'isiXhosa'  THEN 2
    WHEN 'Sesotho'   THEN 3
    WHEN 'Nama'      THEN 4
    ELSE 99
  END;
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_church_hymns_section_rank ON church_hymns;
CREATE TRIGGER trg_church_hymns_section_rank
  BEFORE INSERT OR UPDATE OF section ON church_hymns
  FOR EACH ROW EXECUTE FUNCTION church_hymns_set_section_rank();

CREATE INDEX IF NOT EXISTS idx_church_hymns_section ON church_hymns (section_rank, section, number);
ALTER TABLE church_hymns DISABLE ROW LEVEL SECURITY;

ALTER TABLE church_users              DISABLE ROW LEVEL SECURITY;
ALTER TABLE church_posts              DISABLE ROW LEVEL SECURITY;
ALTER TABLE church_contact_messages   DISABLE ROW LEVEL SECURITY;
ALTER TABLE church_site_settings      DISABLE ROW LEVEL SECURITY;
