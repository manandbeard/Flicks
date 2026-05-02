-- seed.sql
-- Seed data: 1 teacher, 1 student, 5 recall concepts, cosmetics catalog
-- Run after 001_initial_schema.sql

-- ─────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────

INSERT INTO users (id, email, alias, role, momentum_tier, momentum_multiplier, total_points, current_streak)
VALUES
  ('00000000-0000-0000-0000-000000000001',
   'teacher@flicks.dev',
   'ProfEagle42',
   'teacher',
   'spark', 1.0, 0, 0),

  ('00000000-0000-0000-0000-000000000002',
   'student@flicks.dev',
   'NeonFalcon99',
   'student',
   'aura', 1.2, 350, 4);

-- ─────────────────────────────────────────────
-- CLASS
-- ─────────────────────────────────────────────

INSERT INTO classes (id, teacher_id, name, description, subject, grade_level, join_code)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Science 8 — Period 2',
  'Eighth grade science, second period.',
  'Science',
  8,
  'FLKS8P2'
);

-- ─────────────────────────────────────────────
-- ENROLLMENT
-- ─────────────────────────────────────────────

INSERT INTO enrollments (student_id, class_id)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000010'
);

-- ─────────────────────────────────────────────
-- 5 RECALL CONCEPTS
-- ─────────────────────────────────────────────

INSERT INTO concepts (id, teacher_id, title, description, subject, grade_level, card_type, content_payload, difficulty_rating, tags, is_published)
VALUES
  ('00000000-0000-0000-0000-000000000020',
   '00000000-0000-0000-0000-000000000001',
   'Photosynthesis',
   'The process by which plants convert sunlight into glucose.',
   'Science', 8, 'recall',
   '{"front": "What is the chemical equation for photosynthesis?", "back": "6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂", "hint": "Think about inputs: carbon dioxide, water, and light."}',
   0.350, ARRAY['biology','plants','energy'], TRUE),

  ('00000000-0000-0000-0000-000000000021',
   '00000000-0000-0000-0000-000000000001',
   'Newton''s First Law',
   'An object at rest stays at rest unless acted upon by an external force.',
   'Science', 8, 'recall',
   '{"front": "State Newton''s First Law of Motion.", "back": "An object at rest stays at rest, and an object in motion stays in motion at constant velocity, unless acted upon by a net external force.", "hint": "Think: what does ''inertia'' mean?"}',
   0.280, ARRAY['physics','motion','forces'], TRUE),

  ('00000000-0000-0000-0000-000000000022',
   '00000000-0000-0000-0000-000000000001',
   'Cell Mitosis Phases',
   'The stages of mitotic cell division.',
   'Science', 8, 'recall',
   '{"front": "List the four phases of mitosis in order.", "back": "Prophase → Metaphase → Anaphase → Telophase", "hint": "PMAT — Pigs May Appear Tired."}',
   0.420, ARRAY['biology','cells','reproduction'], TRUE),

  ('00000000-0000-0000-0000-000000000023',
   '00000000-0000-0000-0000-000000000001',
   'Periodic Table Groups',
   'Understanding columns on the periodic table.',
   'Science', 8, 'recall',
   '{"front": "What do elements in the same group (column) of the periodic table have in common?", "back": "They have the same number of valence electrons and similar chemical properties.", "hint": "Think about outer electron shells."}',
   0.310, ARRAY['chemistry','periodic table','elements'], TRUE),

  ('00000000-0000-0000-0000-000000000024',
   '00000000-0000-0000-0000-000000000001',
   'Plate Tectonics',
   'Movement of Earth''s lithospheric plates.',
   'Science', 8, 'recall',
   '{"front": "What causes tectonic plate movement?", "back": "Convection currents in the mantle drive the movement of tectonic plates.", "hint": "Think about heat rising and cooling in the mantle."}',
   0.360, ARRAY['geology','earth science','plates'], TRUE);

-- ─────────────────────────────────────────────
-- CHALLENGES (FSRS state for the student)
-- ─────────────────────────────────────────────

INSERT INTO challenges (student_id, concept_id, state, due_at, stability, difficulty, elapsed_days, scheduled_days, reps, lapses)
VALUES
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000020', 'new',      NOW(),                    0,    0.300, 0, 0, 0, 0),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000021', 'review',   NOW() - INTERVAL '1 day', 4.5,  0.280, 3, 3, 2, 0),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000022', 'learning', NOW(),                    1.2,  0.420, 1, 1, 1, 0),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000023', 'new',      NOW(),                    0,    0.310, 0, 0, 0, 0),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000024', 'review',   NOW() + INTERVAL '2 day', 8.0,  0.360, 5, 2, 3, 1);

-- ─────────────────────────────────────────────
-- COSMETICS CATALOG
-- ─────────────────────────────────────────────

INSERT INTO cosmetics_catalog (id, name, category, rarity, unlock_cost, asset_url, metadata)
VALUES
  -- Avatars
  ('00000000-0000-0000-0000-000000000100', 'Neon Falcon',   'avatar', 'common',    100, NULL, '{"color": "#00FFFF", "emoji": "🦅"}'),
  ('00000000-0000-0000-0000-000000000101', 'Cosmic Wolf',   'avatar', 'rare',      300, NULL, '{"color": "#8B5CF6", "emoji": "🐺"}'),
  ('00000000-0000-0000-0000-000000000102', 'Golden Dragon', 'avatar', 'epic',      750, NULL, '{"color": "#EAB308", "emoji": "🐉"}'),
  ('00000000-0000-0000-0000-000000000103', 'Shadow Phoenix','avatar', 'legendary',2000, NULL, '{"color": "#EF4444", "emoji": "🔥"}'),

  -- Badges
  ('00000000-0000-0000-0000-000000000110', 'Streak Starter', 'badge', 'common',   50,  NULL, '{"description": "Earned a 3-day streak", "icon": "⚡"}'),
  ('00000000-0000-0000-0000-000000000111', 'Aura Achiever',  'badge', 'rare',    200,  NULL, '{"description": "Reached Aura tier", "icon": "🔮"}'),
  ('00000000-0000-0000-0000-000000000112', 'Crown Champion', 'badge', 'epic',    500,  NULL, '{"description": "Reached Crown tier for 7 days", "icon": "👑"}'),
  ('00000000-0000-0000-0000-000000000113', 'Bounty Hunter',  'badge', 'rare',    250,  NULL, '{"description": "Won 10 Bounty Flicks", "icon": "🎯"}'),

  -- Themes
  ('00000000-0000-0000-0000-000000000120', 'Dark Matter',   'theme', 'common',   150, NULL, '{"background": "#0F172A", "accent": "#334155"}'),
  ('00000000-0000-0000-0000-000000000121', 'Neon Nights',   'theme', 'rare',     400, NULL, '{"background": "#0D0D1A", "accent": "#00FFFF"}'),
  ('00000000-0000-0000-0000-000000000122', 'Sunset Vibes',  'theme', 'epic',     800, NULL, '{"background": "#1A0A00", "accent": "#F97316"}'),

  -- Effects
  ('00000000-0000-0000-0000-000000000130', 'Spark Trail',   'effect', 'common',  75,  NULL, '{"animation": "sparkle", "duration_ms": 800}'),
  ('00000000-0000-0000-0000-000000000131', 'Aura Glow',     'effect', 'rare',   350,  NULL, '{"animation": "pulse", "color": "#8B5CF6", "duration_ms": 1200}'),
  ('00000000-0000-0000-0000-000000000132', 'Crown Burst',   'effect', 'legendary',1500, NULL, '{"animation": "burst", "color": "#EAB308", "duration_ms": 2000}');

-- Give the seed student a couple of cosmetics
INSERT INTO user_cosmetics (user_id, cosmetic_id)
VALUES
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000100'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000110');
