-- 001_initial_schema.sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────

CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email               TEXT UNIQUE NOT NULL,
  alias               TEXT UNIQUE NOT NULL,  -- COPPA-safe (e.g., "NeonFalcon123")
  role                TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
  equipped_cosmetics  JSONB NOT NULL DEFAULT '{}',
  total_points        INTEGER NOT NULL DEFAULT 0,
  current_streak      INTEGER NOT NULL DEFAULT 0,
  momentum_tier       TEXT NOT NULL DEFAULT 'spark' CHECK (momentum_tier IN ('spark', 'aura', 'crown')),
  momentum_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.0,
  last_activity_date  DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE classes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  subject     TEXT NOT NULL,
  grade_level INTEGER CHECK (grade_level BETWEEN 6 AND 12),
  join_code   TEXT UNIQUE NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE concepts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  subject          TEXT NOT NULL,
  grade_level      INTEGER CHECK (grade_level BETWEEN 6 AND 12),
  card_type        TEXT NOT NULL CHECK (card_type IN ('recall', 'poll', 'hotspot', 'sequence')),
  content_payload  JSONB NOT NULL,
  difficulty_rating DECIMAL(4,3) NOT NULL DEFAULT 0.300,
  tags             TEXT[] NOT NULL DEFAULT '{}',
  is_published     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE enrollments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (student_id, class_id)
);

CREATE TABLE challenges (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id           UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  -- FSRS fields
  state                TEXT NOT NULL DEFAULT 'new' CHECK (state IN ('new', 'learning', 'review', 'relearning')),
  due_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stability            DECIMAL(10,4) NOT NULL DEFAULT 0,
  difficulty           DECIMAL(4,3) NOT NULL DEFAULT 0.300,
  elapsed_days         INTEGER NOT NULL DEFAULT 0,
  scheduled_days       INTEGER NOT NULL DEFAULT 0,
  reps                 INTEGER NOT NULL DEFAULT 0,
  lapses               INTEGER NOT NULL DEFAULT 0,
  last_review_at       TIMESTAMPTZ,
  -- Game mechanics
  points_earned        INTEGER NOT NULL DEFAULT 0,
  is_bounty            BOOLEAN NOT NULL DEFAULT FALSE,
  bounty_challenger_id UUID REFERENCES users(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, concept_id)
);

CREATE TABLE review_log (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id        UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  concept_id          UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  -- FSRS rating: 1=Again, 2=Hard, 3=Good, 4=Easy
  rating              INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 4),
  points_earned       INTEGER NOT NULL DEFAULT 0,
  momentum_tier       TEXT NOT NULL,
  momentum_multiplier DECIMAL(4,2) NOT NULL,
  review_duration_ms  INTEGER,
  was_bounty          BOOLEAN NOT NULL DEFAULT FALSE,
  fsrs_state_before   JSONB NOT NULL,
  fsrs_state_after    JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cosmetics_catalog (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('avatar', 'badge', 'theme', 'effect')),
  rarity      TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  unlock_cost INTEGER NOT NULL,
  asset_url   TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_cosmetics (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cosmetic_id UUID NOT NULL REFERENCES cosmetics_catalog(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  quantity    INTEGER NOT NULL DEFAULT 1,
  UNIQUE (user_id, cosmetic_id)
);

CREATE TABLE bounty_flicks (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenger_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  defender_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id             UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  status                 TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'completed', 'expired')),
  challenger_result      TEXT CHECK (challenger_result IN ('correct', 'incorrect')),
  defender_result        TEXT CHECK (defender_result IN ('correct', 'incorrect')),
  tutor_bonus_awarded    BOOLEAN NOT NULL DEFAULT FALSE,
  cosmetic_dupe_awarded  BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at           TIMESTAMPTZ
);

CREATE TABLE activity_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────

CREATE INDEX idx_challenges_student_due   ON challenges(student_id, due_at);
CREATE INDEX idx_challenges_concept       ON challenges(concept_id);
CREATE INDEX idx_concepts_teacher         ON concepts(teacher_id);
CREATE INDEX idx_bounty_flicks_defender   ON bounty_flicks(defender_id, status);
CREATE INDEX idx_activity_log_user        ON activity_log(user_id, created_at DESC);
CREATE INDEX idx_classes_teacher          ON classes(teacher_id);
CREATE INDEX idx_enrollments_student      ON enrollments(student_id, is_active);
CREATE INDEX idx_enrollments_class        ON enrollments(class_id);
CREATE INDEX idx_review_log_student       ON review_log(student_id, created_at DESC);
CREATE INDEX idx_review_log_challenge     ON review_log(challenge_id);

-- ─────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_concepts_updated_at
  BEFORE UPDATE ON concepts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_challenges_updated_at
  BEFORE UPDATE ON challenges
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Increment user total_points atomically
CREATE OR REPLACE FUNCTION increment_user_points(user_id UUID, points INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE users
  SET total_points = total_points + points
  WHERE id = user_id;
END;
$$;

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges        ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cosmetics_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cosmetics    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bounty_flicks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log      ENABLE ROW LEVEL SECURITY;

-- Helper to get the current user's row from users
-- Returns NULL if the authenticated user has no row yet (handled in policies)
CREATE OR REPLACE FUNCTION auth_user_id() RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT id FROM users WHERE email = auth.email() LIMIT 1;
$$;

-- users: each user sees only their own row; teachers can see students in their classes
CREATE POLICY "users: own row"
  ON users FOR SELECT
  USING (id = auth_user_id());

CREATE POLICY "users: update own row"
  ON users FOR UPDATE
  USING (id = auth_user_id());

-- classes: teachers own their classes; enrolled students can read
CREATE POLICY "classes: teacher manages"
  ON classes FOR ALL
  USING (teacher_id = auth_user_id());

CREATE POLICY "classes: enrolled students read"
  ON classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.class_id = classes.id
        AND enrollments.student_id = auth_user_id()
        AND enrollments.is_active
    )
  );

-- concepts: teachers manage their own; students in enrolled classes can read published ones
CREATE POLICY "concepts: teacher manages"
  ON concepts FOR ALL
  USING (teacher_id = auth_user_id());

CREATE POLICY "concepts: students read published"
  ON concepts FOR SELECT
  USING (
    is_published AND
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN classes c ON c.id = e.class_id
      WHERE e.student_id = auth_user_id()
        AND e.is_active
        AND c.teacher_id = concepts.teacher_id
    )
  );

-- enrollments: students manage their own; teachers see enrollments for their classes
CREATE POLICY "enrollments: own"
  ON enrollments FOR ALL
  USING (student_id = auth_user_id());

CREATE POLICY "enrollments: teacher read"
  ON enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = enrollments.class_id
        AND classes.teacher_id = auth_user_id()
    )
  );

-- challenges: students manage their own
CREATE POLICY "challenges: own student"
  ON challenges FOR ALL
  USING (student_id = auth_user_id());

-- review_log: students manage their own; teachers can read for their students
CREATE POLICY "review_log: own student"
  ON review_log FOR ALL
  USING (student_id = auth_user_id());

CREATE POLICY "review_log: teacher read"
  ON review_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM challenges ch
      JOIN concepts con ON con.id = ch.concept_id
      WHERE ch.id = review_log.challenge_id
        AND con.teacher_id = auth_user_id()
    )
  );

-- cosmetics_catalog: everyone can read
CREATE POLICY "cosmetics_catalog: public read"
  ON cosmetics_catalog FOR SELECT
  USING (true);

-- user_cosmetics: users see their own
CREATE POLICY "user_cosmetics: own"
  ON user_cosmetics FOR ALL
  USING (user_id = auth_user_id());

-- bounty_flicks: challenger or defender can see/manage
CREATE POLICY "bounty_flicks: participants"
  ON bounty_flicks FOR ALL
  USING (
    challenger_id = auth_user_id() OR defender_id = auth_user_id()
  );

-- activity_log: users see their own
CREATE POLICY "activity_log: own"
  ON activity_log FOR ALL
  USING (user_id = auth_user_id());
