Educational Game Implementation Plan
Mobile-First FSRS-Powered Jigsaw Puzzle Learning Platform

🎯 Project Overview
A social, cooperative educational game for grades 6-12 that disguises spaced repetition learning as an engaging mobile feed experience. Students earn momentum multipliers, unlock cosmetics, and challenge peers while mastering curriculum content.


📋 Tech Stack Summary
Frontend: React 18 + Vite + TypeScript
Styling: Tailwind CSS + shadcn/ui components
State Management: Zustand (client) + TanStack Query (server)
Animations: Framer Motion (student feed)
Teacher Tools: React Flow (curriculum builder)
Backend: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
Algorithm: ts-fsrs (Deno Edge Functions)


🏗️ System Architecture
graph TB

    subgraph Client["Client Layer"]

        SF[Student Feed Mobile]

        TB[Teacher Builder Desktop]

    end

    

    subgraph State["State Management"]

        ZS[Zustand Stores]

        TQ[TanStack Query]

    end

    

    subgraph Backend["Supabase Backend"]

        AUTH[Auth Service]

        DB[(PostgreSQL)]

        STORAGE[Storage Buckets]

        EDGE[Edge Functions]

    end

    

    subgraph Algorithm["FSRS Engine"]

        DENO[Deno Runtime]

        TSFSRS[ts-fsrs Library]

    end

    

    SF --> ZS

    SF --> TQ

    TB --> ZS

    TB --> TQ

    

    TQ --> AUTH

    TQ --> DB

    TQ --> STORAGE

    TQ --> EDGE

    

    EDGE --> DENO

    DENO --> TSFSRS

    TSFSRS --> DB

    

    AUTH --> DB


📊 Database Schema
Core Tables
users
CREATE TABLE users (

  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  email TEXT UNIQUE NOT NULL,

  alias TEXT UNIQUE NOT NULL, -- COPPA-safe (e.g., "NeonFalcon")

  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),

  equipped_cosmetics JSONB DEFAULT '{}',

  total_points INTEGER DEFAULT 0,

  current_streak INTEGER DEFAULT 0,

  momentum_tier TEXT DEFAULT 'spark',

  momentum_multiplier DECIMAL DEFAULT 1.0,

  last_activity_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  updated_at TIMESTAMPTZ DEFAULT NOW()

);
concepts
CREATE TABLE concepts (

  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,

  title TEXT NOT NULL,

  description TEXT,

  subject TEXT NOT NULL,

  grade_level INTEGER CHECK (grade_level BETWEEN 6 AND 12),

  card_type TEXT NOT NULL CHECK (card_type IN ('recall', 'poll', 'hotspot', 'sequence')),

  content_payload JSONB NOT NULL, -- Mixed media: text, images, audio

  difficulty_rating DECIMAL DEFAULT 0.3,

  tags TEXT[],

  is_published BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  updated_at TIMESTAMPTZ DEFAULT NOW()

);
challenges (FSRS State)
CREATE TABLE challenges (

  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  student_id UUID REFERENCES users(id) ON DELETE CASCADE,

  concept_id UUID REFERENCES concepts(id) ON DELETE CASCADE,

  

  -- FSRS Required Fields

  state TEXT NOT NULL CHECK (state IN ('new', 'learning', 'review', 'relearning')),

  due_at TIMESTAMPTZ NOT NULL,

  stability DECIMAL NOT NULL DEFAULT 0,

  difficulty DECIMAL NOT NULL DEFAULT 0.3,

  elapsed_days INTEGER NOT NULL DEFAULT 0,

  scheduled_days INTEGER NOT NULL DEFAULT 0,

  reps INTEGER NOT NULL DEFAULT 0,

  lapses INTEGER NOT NULL DEFAULT 0,

  last_review_at TIMESTAMPTZ,

  

  -- Game Mechanics

  points_earned INTEGER DEFAULT 0,

  is_bounty BOOLEAN DEFAULT FALSE,

  bounty_challenger_id UUID REFERENCES users(id),

  

  created_at TIMESTAMPTZ DEFAULT NOW(),

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  

  UNIQUE(student_id, concept_id)

);
cosmetics_catalog
CREATE TABLE cosmetics_catalog (

  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  name TEXT NOT NULL,

  category TEXT NOT NULL CHECK (category IN ('avatar', 'badge', 'theme', 'effect')),

  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),

  unlock_cost INTEGER NOT NULL,

  asset_url TEXT,

  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()

);
user_cosmetics
CREATE TABLE user_cosmetics (

  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  cosmetic_id UUID REFERENCES cosmetics_catalog(id) ON DELETE CASCADE,

  unlocked_at TIMESTAMPTZ DEFAULT NOW(),

  quantity INTEGER DEFAULT 1, -- For dupes from Bounty Flicks

  

  UNIQUE(user_id, cosmetic_id)

);
bounty_flicks
CREATE TABLE bounty_flicks (

  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  challenger_id UUID REFERENCES users(id) ON DELETE CASCADE,

  defender_id UUID REFERENCES users(id) ON DELETE CASCADE,

  concept_id UUID REFERENCES concepts(id) ON DELETE CASCADE,

  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'completed', 'expired')),

  challenger_result TEXT CHECK (challenger_result IN ('correct', 'incorrect')),

  defender_result TEXT CHECK (defender_result IN ('correct', 'incorrect')),

  tutor_bonus_awarded BOOLEAN DEFAULT FALSE,

  cosmetic_dupe_awarded BOOLEAN DEFAULT FALSE,

  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  completed_at TIMESTAMPTZ

);
activity_log
CREATE TABLE activity_log (

  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  action_type TEXT NOT NULL,

  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()

);
classes
CREATE TABLE classes (

  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,

  description TEXT,

  subject TEXT NOT NULL,

  grade_level INTEGER CHECK (grade_level BETWEEN 6 AND 12),

  join_code TEXT UNIQUE NOT NULL, -- Short alphanumeric code students use to enroll

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  updated_at TIMESTAMPTZ DEFAULT NOW()

);
enrollments
CREATE TABLE enrollments (

  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  student_id UUID REFERENCES users(id) ON DELETE CASCADE,

  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,

  enrolled_at TIMESTAMPTZ DEFAULT NOW(),

  is_active BOOLEAN DEFAULT TRUE,

  UNIQUE(student_id, class_id)

);
review_log
CREATE TABLE review_log (

  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  student_id UUID REFERENCES users(id) ON DELETE CASCADE,

  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,

  concept_id UUID REFERENCES concepts(id) ON DELETE CASCADE,

  -- FSRS rating: 1=Again, 2=Hard, 3=Good, 4=Easy

  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 4),

  points_earned INTEGER NOT NULL DEFAULT 0,

  momentum_tier TEXT NOT NULL,

  momentum_multiplier DECIMAL NOT NULL,

  review_duration_ms INTEGER, -- Time the student spent on this card

  was_bounty BOOLEAN DEFAULT FALSE,

  fsrs_state_before JSONB NOT NULL, -- Full FSRS card state snapshot before review

  fsrs_state_after JSONB NOT NULL,  -- Full FSRS card state snapshot after review

  created_at TIMESTAMPTZ DEFAULT NOW()

);
Indexes
CREATE INDEX idx_challenges_student_due ON challenges(student_id, due_at);

CREATE INDEX idx_challenges_concept ON challenges(concept_id);

CREATE INDEX idx_concepts_teacher ON concepts(teacher_id);

CREATE INDEX idx_bounty_flicks_defender ON bounty_flicks(defender_id, status);

CREATE INDEX idx_activity_log_user ON activity_log(user_id, created_at DESC);

CREATE INDEX idx_classes_teacher ON classes(teacher_id);

CREATE INDEX idx_enrollments_student ON enrollments(student_id, is_active);

CREATE INDEX idx_enrollments_class ON enrollments(class_id);

CREATE INDEX idx_review_log_student ON review_log(student_id, created_at DESC);

CREATE INDEX idx_review_log_challenge ON review_log(challenge_id);


🎮 Game Mechanics Implementation
1. Momentum Multipliers ("Vibe")
State Transitions:

type MomentumTier = 'spark' | 'aura' | 'crown';

interface MomentumState {

  tier: MomentumTier;

  multiplier: number;

  consecutiveDays: number;

  emoji: string;

}

const MOMENTUM_TIERS: Record<number, MomentumState> = {

  1: { tier: 'spark', multiplier: 1.0, consecutiveDays: 1, emoji: '✨' },

  2: { tier: 'spark', multiplier: 1.0, consecutiveDays: 2, emoji: '✨' },

  3: { tier: 'aura', multiplier: 1.2, consecutiveDays: 3, emoji: '🔮' },

  4: { tier: 'aura', multiplier: 1.2, consecutiveDays: 4, emoji: '🔮' },

  5: { tier: 'aura', multiplier: 1.2, consecutiveDays: 5, emoji: '🔮' },

  6: { tier: 'crown', multiplier: 1.5, consecutiveDays: 6, emoji: '👑' }

};

Logic:

Track last_activity_date in users table
On daily login, check if date is consecutive
Soft downgrade: Missing 1 day drops tier by 1 level (crown → aura → spark)
Never resets to zero unless 3+ days missed
2. Memory Bank
Implementation:

total_points in users table never decreases
Points earned = base_points × momentum_multiplier
Used exclusively for unlocking cosmetics
Prevents loss-aversion burnout
3. Bounty Flicks
Flow:

sequenceDiagram

    participant C as Challenger

    participant S as System

    participant D as Defender

    

    C->>S: Flick difficult card to peer

    S->>D: Notify defender (alias only)

    D->>S: Accept challenge

    S->>D: Present card

    D->>S: Submit answer

    S->>S: Evaluate both responses

    alt Defender correct

        S->>D: Award cosmetic dupe

    end

    alt Challenger correct

        S->>C: Award tutor bonus

    end

Rules:

Only cards with difficulty > 0.6 can be flicked
24-hour expiration window
COPPA-safe: Only aliases visible, no direct messaging
4. Coyote Time
Implementation:

interface CoyoteTimeBuffer {

  action: 'swipe' | 'sequence' | 'hotspot';

  timestamp: number;

  canUndo: boolean;

}

const COYOTE_TIME_MS = 500;

// Allow undo within 500ms before logging FSRS lapse

function handleCardInteraction(action: CardAction) {

  const buffer: CoyoteTimeBuffer = {

    action: action.type,

    timestamp: Date.now(),

    canUndo: true

  };

  

  setTimeout(() => {

    if (buffer.canUndo) {

      commitToFSRS(action);

    }

  }, COYOTE_TIME_MS);

  

  return buffer;

}


🎨 Frontend Architecture
Project Structure
src/

├── components/

│   ├── ui/              # shadcn/ui base components

│   ├── student/

│   │   ├── Feed.tsx

│   │   ├── CardSwiper.tsx

│   │   ├── MomentumBadge.tsx

│   │   └── BountyFlickModal.tsx

│   ├── teacher/

│   │   ├── CurriculumBuilder.tsx

│   │   ├── ConceptEditor.tsx

│   │   └── AnalyticsDashboard.tsx

│   └── shared/

│       ├── ProfileCustomizer.tsx

│       └── CosmeticShop.tsx

├── stores/

│   ├── useAuthStore.ts

│   ├── useMomentumStore.ts

│   ├── useCardStore.ts

│   └── useCosmeticsStore.ts

├── hooks/

│   ├── useSupabase.ts

│   ├── useFSRS.ts

│   └── useCoyoteTime.ts

├── lib/

│   ├── supabase.ts

│   ├── fsrs-client.ts

│   └── animations.ts

├── types/

│   ├── database.types.ts

│   ├── game.types.ts

│   └── fsrs.types.ts

└── App.tsx
Zustand Stores
useMomentumStore.ts
interface MomentumStore {

  tier: MomentumTier;

  multiplier: number;

  consecutiveDays: number;

  lastActivityDate: Date | null;

  

  checkDailyActivity: () => Promise<void>;

  updateMomentum: (newTier: MomentumTier) => void;

}
useCardStore.ts
interface CardStore {

  currentCard: Challenge | null;

  cardQueue: Challenge[];

  coyoteBuffer: CoyoteTimeBuffer | null;

  

  loadDueCards: () => Promise<void>;

  submitReview: (rating: FSRSRating) => Promise<void>;

  undoLastAction: () => void;

}
TanStack Query Hooks
// Fetch due cards

const useDueCards = () => {

  return useQuery({

    queryKey: ['dueCards', userId],

    queryFn: async () => {

      const { data } = await supabase

        .from('challenges')

        .select('*, concepts(*)')

        .eq('student_id', userId)

        .lte('due_at', new Date().toISOString())

        .order('due_at', { ascending: true });

      return data;

    },

    refetchInterval: 60000 // Refresh every minute

  });

};

// Submit review with optimistic update

const useSubmitReview = () => {

  const queryClient = useQueryClient();

  

  return useMutation({

    mutationFn: async ({ challengeId, rating }: ReviewSubmission) => {

      const { data } = await supabase.functions.invoke('fsrs-review', {

        body: { challengeId, rating }

      });

      return data;

    },

    onMutate: async (variables) => {

      // Optimistic update

      await queryClient.cancelQueries(['dueCards']);

      const previous = queryClient.getQueryData(['dueCards']);

      

      queryClient.setQueryData(['dueCards'], (old: Challenge[]) =>

        old.filter(c => c.id !== variables.challengeId)

      );

      

      return { previous };

    },

    onError: (err, variables, context) => {

      // Rollback on error

      queryClient.setQueryData(['dueCards'], context?.previous);

    },

    onSettled: () => {

      queryClient.invalidateQueries(['dueCards']);

    }

  });

};


⚡ Supabase Edge Functions
fsrs-review Function
Location: supabase/functions/fsrs-review/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { fsrs, Rating, State } from 'https://esm.sh/ts-fsrs@3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {

  const { challengeId, rating } = await req.json();

  const supabase = createClient(supabaseUrl, supabaseKey);

  

  // Fetch current challenge state

  const { data: challenge } = await supabase

    .from('challenges')

    .select('*, users!inner(momentum_multiplier)')

    .eq('id', challengeId)

    .single();

  

  if (!challenge) {

    return new Response(JSON.stringify({ error: 'Challenge not found' }), {

      status: 404

    });

  }

  

  // Initialize FSRS

  const f = fsrs();

  const card = {

    state: challenge.state as State,

    stability: challenge.stability,

    difficulty: challenge.difficulty,

    elapsed_days: challenge.elapsed_days,

    scheduled_days: challenge.scheduled_days,

    reps: challenge.reps,

    lapses: challenge.lapses,

    due: new Date(challenge.due_at)

  };

  

  // Calculate next review

  const now = new Date();

  const schedulingCards = f.repeat(card, now);

  const nextCard = schedulingCards[rating].card;

  

  // Calculate points with momentum multiplier

  const basePoints = rating === Rating.Easy ? 10 : rating === Rating.Good ? 7 : 5;

  const pointsEarned = Math.floor(basePoints * challenge.users.momentum_multiplier);

  

  // Update challenge

  const { error } = await supabase

    .from('challenges')

    .update({

      state: nextCard.state,

      due_at: nextCard.due.toISOString(),

      stability: nextCard.stability,

      difficulty: nextCard.difficulty,

      elapsed_days: nextCard.elapsed_days,

      scheduled_days: nextCard.scheduled_days,

      reps: nextCard.reps,

      lapses: nextCard.lapses,

      last_review_at: now.toISOString(),

      points_earned: challenge.points_earned + pointsEarned

    })

    .eq('id', challengeId);

  

  // Update user total points

  await supabase.rpc('increment_user_points', {

    user_id: challenge.student_id,

    points: pointsEarned

  });

  

  return new Response(JSON.stringify({

    success: true,

    nextCard,

    pointsEarned

  }), {

    headers: { 'Content-Type': 'application/json' }

  });

});
check-momentum Function
Location: supabase/functions/check-momentum/index.ts

serve(async (req) => {

  const { userId } = await req.json();

  const supabase = createClient(supabaseUrl, supabaseKey);

  

  const { data: user } = await supabase

    .from('users')

    .select('last_activity_date, current_streak, momentum_tier')

    .eq('id', userId)

    .single();

  

  const today = new Date().toISOString().split('T')[0];

  const lastActivity = user.last_activity_date;

  

  if (lastActivity === today) {

    return new Response(JSON.stringify({ alreadyCheckedIn: true }));

  }

  

  const daysDiff = lastActivity 

    ? Math.floor((new Date(today).getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))

    : 999;

  

  let newStreak = user.current_streak;

  let newTier = user.momentum_tier;

  let newMultiplier = 1.0;

  

  if (daysDiff === 1) {

    // Consecutive day

    newStreak += 1;

  } else if (daysDiff === 2) {

    // Soft downgrade

    newStreak = Math.max(1, newStreak - 2);

  } else if (daysDiff >= 3) {

    // Hard reset

    newStreak = 1;

  }

  

  // Calculate tier

  if (newStreak >= 6) {

    newTier = 'crown';

    newMultiplier = 1.5;

  } else if (newStreak >= 3) {

    newTier = 'aura';

    newMultiplier = 1.2;

  } else {

    newTier = 'spark';

    newMultiplier = 1.0;

  }

  

  await supabase

    .from('users')

    .update({

      last_activity_date: today,

      current_streak: newStreak,

      momentum_tier: newTier,

      momentum_multiplier: newMultiplier

    })

    .eq('id', userId);

  

  return new Response(JSON.stringify({

    streak: newStreak,

    tier: newTier,

    multiplier: newMultiplier

  }));

});


🎨 Card Types Implementation
1. Recall Cards
interface RecallCard {

  type: 'recall';

  question: string;

  answer: string;

  hints?: string[];

  media?: {

    type: 'image' | 'audio' | 'video';

    url: string;

  };

}
2. Poll Cards
interface PollCard {

  type: 'poll';

  question: string;

  options: Array<{

    id: string;

    text: string;

    isCorrect: boolean;

  }>;

  explanation?: string;

}
3. Hotspot Cards
interface HotspotCard {

  type: 'hotspot';

  imageUrl: string;

  question: string;

  hotspots: Array<{

    id: string;

    x: number; // percentage

    y: number; // percentage

    radius: number;

    isCorrect: boolean;

  }>;

}
4. Sequence Cards
interface SequenceCard {

  type: 'sequence';

  question: string;

  items: Array<{

    id: string;

    text: string;

    correctPosition: number;

  }>;

}

JSONB content_payload Schemas
The concepts.content_payload column stores card data as JSONB. Each card type has a strict schema keyed on the card_type enum value.

Recall
{
  "type": "recall",
  "question": "<string, required>",
  "answer": "<string, required>",
  "hints": ["<string>"],                  // optional array
  "media": {                              // optional
    "type": "<image|audio|video>",
    "url": "<string>"
  }
}

Poll
{
  "type": "poll",
  "question": "<string, required>",
  "options": [                            // min 2, max 6 items
    {
      "id": "<string>",
      "text": "<string>",
      "isCorrect": "<boolean>"
    }
  ],
  "explanation": "<string>"              // optional; shown after answer
}

Hotspot
{
  "type": "hotspot",
  "imageUrl": "<string, required>",
  "question": "<string, required>",
  "hotspots": [
    {
      "id": "<string>",
      "x": "<number, 0–100 — percent of image width>",
      "y": "<number, 0–100 — percent of image height>",
      "radius": "<number, pixels>",
      "label": "<string>",               // optional; shown on reveal
      "isCorrect": "<boolean>"
    }
  ]
}

Sequence
{
  "type": "sequence",
  "question": "<string, required>",
  "items": [                             // min 2, max 8 items
    {
      "id": "<string>",
      "text": "<string>",
      "correctPosition": "<number, 1-based>"
    }
  ]
}


🎭 Animation Specifications
Feed Scroll Animation (Framer Motion)
const cardVariants = {

  enter: (direction: number) => ({

    x: direction > 0 ? 1000 : -1000,

    opacity: 0

  }),

  center: {

    zIndex: 1,

    x: 0,

    opacity: 1

  },

  exit: (direction: number) => ({

    zIndex: 0,

    x: direction < 0 ? 1000 : -1000,

    opacity: 0

  })

};

const swipeConfidenceThreshold = 10000;

const swipePower = (offset: number, velocity: number) => {

  return Math.abs(offset) * velocity;

};
Momentum Badge Animation
const badgeVariants = {

  spark: {

    scale: [1, 1.1, 1],

    rotate: [0, 5, -5, 0],

    transition: { duration: 0.5 }

  },

  aura: {

    scale: [1, 1.2, 1],

    boxShadow: [

      '0 0 0px rgba(139, 92, 246, 0)',

      '0 0 20px rgba(139, 92, 246, 0.6)',

      '0 0 0px rgba(139, 92, 246, 0)'

    ],

    transition: { duration: 1, repeat: Infinity }

  },

  crown: {

    scale: [1, 1.3, 1],

    rotate: [0, 360],

    boxShadow: [

      '0 0 0px rgba(234, 179, 8, 0)',

      '0 0 30px rgba(234, 179, 8, 0.8)',

      '0 0 0px rgba(234, 179, 8, 0)'

    ],

    transition: { duration: 2, repeat: Infinity }

  }

};


🏫 Teacher Curriculum Builder
React Flow Integration
import ReactFlow, { 

  Node, 

  Edge, 

  Controls, 

  Background 

} from 'reactflow';

interface ConceptNode extends Node {

  data: {

    concept: Concept;

    prerequisites: string[];

    dependents: string[];

  };

}

const CurriculumBuilder = () => {

  const [nodes, setNodes] = useState<ConceptNode[]>([]);

  const [edges, setEdges] = useState<Edge[]>([]);

  

  // Custom node types

  const nodeTypes = {

    concept: ConceptNodeComponent,

    unit: UnitNodeComponent

  };

  

  return (

    <ReactFlow

      nodes={nodes}

      edges={edges}

      nodeTypes={nodeTypes}

      onNodesChange={onNodesChange}

      onEdgesChange={onEdgesChange}

      onConnect={onConnect}

    >

      <Controls />

      <Background />

    </ReactFlow>

  );

};


🔐 Authentication & COPPA Compliance
Alias Generation
const ADJECTIVES = ['Neon', 'Cosmic', 'Electric', 'Mystic', 'Quantum'];

const NOUNS = ['Falcon', 'Phoenix', 'Dragon', 'Tiger', 'Wolf'];

function generateAlias(): string {

  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];

  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];

  const num = Math.floor(Math.random() * 1000);

  return `${adj}${noun}${num}`;

}
Row Level Security (RLS)
-- Students can only see their own challenges

CREATE POLICY "Students view own challenges"

ON challenges FOR SELECT

USING (auth.uid() = student_id);

-- Students can only update their own challenges

CREATE POLICY "Students update own challenges"

ON challenges FOR UPDATE

USING (auth.uid() = student_id);

-- Teachers can view all concepts they created

CREATE POLICY "Teachers view own concepts"

ON concepts FOR SELECT

USING (auth.uid() = teacher_id);

-- Bounty flicks: defender can see challenges sent to them

CREATE POLICY "Defenders view bounty flicks"

ON bounty_flicks FOR SELECT

USING (auth.uid() = defender_id OR auth.uid() = challenger_id);


📱 Mobile-First Responsive Design
Breakpoints (Tailwind)
const breakpoints = {

  sm: '640px',   // Small phones

  md: '768px',   // Large phones / small tablets

  lg: '1024px',  // Tablets / small laptops

  xl: '1280px',  // Desktops

  '2xl': '1536px' // Large desktops

};
Touch Gestures
import { useSwipeable } from 'react-swipeable';

const handlers = useSwipeable({

  onSwipedLeft: () => handleSwipe('left'),

  onSwipedRight: () => handleSwipe('right'),

  onSwipedUp: () => handleSwipe('up'),

  preventDefaultTouchmoveEvent: true,

  trackMouse: true

});


🧪 Testing Strategy
Unit Tests (Vitest)
FSRS calculation logic
Momentum tier transitions
Points calculation with multipliers
Coyote Time buffer logic
Integration Tests
Card submission flow
Bounty Flick creation and completion
Cosmetic unlocking
Authentication flows
E2E Tests (Playwright)
Student daily review flow
Teacher concept creation
Profile customization
Mobile swipe interactions


🚀 Deployment Pipeline
Environment Setup
# Development

VITE_SUPABASE_URL=your-dev-url

VITE_SUPABASE_ANON_KEY=your-dev-key

# Production

VITE_SUPABASE_URL=your-prod-url

VITE_SUPABASE_ANON_KEY=your-prod-key
Build & Deploy
# Build frontend

npm run build

# Deploy Edge Functions

supabase functions deploy fsrs-review

supabase functions deploy check-momentum

# Deploy to Vercel/Netlify

vercel deploy --prod


📊 Analytics & Monitoring
Key Metrics to Track
Daily Active Users (DAU)
Average cards reviewed per session
Momentum tier distribution
Bounty Flick completion rate
Cosmetic unlock rate
FSRS retention curves
Teacher engagement (concepts created)
Supabase Analytics Queries
-- Daily active students

SELECT DATE(created_at) as date, COUNT(DISTINCT user_id) as dau

FROM activity_log

WHERE action_type = 'card_review'

GROUP BY DATE(created_at)

ORDER BY date DESC;

-- Momentum tier distribution

SELECT momentum_tier, COUNT(*) as count

FROM users

WHERE role = 'student'

GROUP BY momentum_tier;

-- Average reviews per student

SELECT AVG(review_count) as avg_reviews

FROM (

  SELECT student_id, COUNT(*) as review_count

  FROM challenges

  WHERE last_review_at > NOW() - INTERVAL '7 days'

  GROUP BY student_id

) subquery;


🎯 Success Criteria
Phase 1: MVP (Weeks 1-4)
Basic authentication with alias generation
Student feed with recall cards
FSRS integration working
Momentum multipliers functional
Memory Bank tracking points
Phase 2: Game Mechanics (Weeks 5-8)
All 4 card types implemented
Bounty Flicks peer-to-peer system
Cosmetics shop and unlocking
Profile customization
Coyote Time buffer
Phase 3: Teacher Tools (Weeks 9-12)
React Flow curriculum builder
Concept editor with media upload
Analytics dashboard
Bulk import/export
Phase 4: Polish & Launch (Weeks 13-16)
Performance optimization
Comprehensive testing
Mobile responsiveness perfected
Production deployment
User onboarding flow


🔧 Development Commands
# Install dependencies

npm install

# Run development server

npm run dev

# Build for production

npm run build

# Run tests

npm run test

# Type checking

npm run type-check

# Lint code

npm run lint

# Format code

npm run format

# Start Supabase locally

supabase start

# Generate TypeScript types from database

supabase gen types typescript --local > src/types/database.types.ts

# Deploy Edge Functions

supabase functions deploy


📚 Key Dependencies
{

  "dependencies": {

    "react": "^18.2.0",

    "react-dom": "^18.2.0",

    "zustand": "^4.4.0",

    "@tanstack/react-query": "^5.0.0",

    "framer-motion": "^10.16.0",

    "reactflow": "^11.10.0",

    "@supabase/supabase-js": "^2.38.0",

    "tailwindcss": "^3.3.0",

    "@radix-ui/react-*": "latest",

    "class-variance-authority": "^0.7.0",

    "clsx": "^2.0.0",

    "tailwind-merge": "^2.0.0"

  },

  "devDependencies": {

    "@types/react": "^18.2.0",

    "@types/react-dom": "^18.2.0",

    "@vitejs/plugin-react": "^4.2.0",

    "typescript": "^5.2.0",

    "vite": "^5.0.0",

    "vitest": "^1.0.0",

    "@playwright/test": "^1.40.0",

    "eslint": "^8.55.0",

    "prettier": "^3.1.0"

  }

}


🎨 Design System
Color Palette
const colors = {

  // Momentum tiers

  spark: {

    primary: '#FCD34D', // Yellow

    glow: 'rgba(252, 211, 77, 0.3)'

  },

  aura: {

    primary: '#8B5CF6', // Purple

    glow: 'rgba(139, 92, 246, 0.3)'

  },

  crown: {

    primary: '#EAB308', // Gold

    glow: 'rgba(234, 179, 8, 0.3)'

  },

  

  // UI

  background: '#0F172A',

  surface: '#1E293B',

  border: '#334155',

  text: {

    primary: '#F1F5F9',

    secondary: '#94A3B8',

    muted: '#64748B'

  },

  

  // Feedback

  success: '#10B981',

  error: '#EF4444',

  warning: '#F59E0B',

  info: '#3B82F6'

};
Typography
const typography = {

  fontFamily: {

    sans: ['Inter', 'system-ui', 'sans-serif'],

    display: ['Poppins', 'sans-serif'],

    mono: ['Fira Code', 'monospace']

  },

  fontSize: {

    xs: '0.75rem',

    sm: '0.875rem',

    base: '1rem',

    lg: '1.125rem',

    xl: '1.25rem',

    '2xl': '1.5rem',

    '3xl': '1.875rem',

    '4xl': '2.25rem'

  }

};


🔄 Data Flow Diagrams
Card Review Flow
sequenceDiagram

    participant U as User

    participant F as Feed Component

    participant Z as Zustand Store

    participant TQ as TanStack Query

    participant EF as Edge Function

    participant DB as Database

    

    U->>F: Swipe card

    F->>Z: Update coyote buffer

    Note over Z: Wait 500ms

    Z->>TQ: Submit review

    TQ->>EF: POST /fsrs-review

    EF->>DB: Fetch challenge

    EF->>EF: Calculate FSRS

    EF->>DB: Update challenge + points

    DB-->>EF: Success

    EF-->>TQ: New card state

    TQ->>Z: Update local state

    Z->>F: Render next card

    F->>U: Show points earned
Bounty Flick Flow
sequenceDiagram

    participant C as Challenger

    participant S as System

    participant D as Defender

    

    C->>S: Select difficult card

    C->>S: Choose defender (alias)

    S->>S: Create bounty_flick record

    S->>D: Push notification

    D->>S: Accept challenge

    S->>D: Present card

    D->>S: Submit answer

    S->>S: Evaluate both answers

    alt Defender correct

        S->>D: Award cosmetic dupe

    else Defender incorrect

        S->>D: No reward

    end

    alt Challenger correct

        S->>C: Award tutor bonus

    else Challenger incorrect

        S->>C: No bonus

    end

    S->>C: Notify result

    S->>D: Notify result


🛡️ Security Considerations
Input Validation
Sanitize all user-generated content
Validate card content payloads
Rate limit API endpoints
Prevent SQL injection via parameterized queries
Data Privacy
COPPA compliance: No PII collection for students under 13
Aliases only in peer interactions
Encrypted storage for sensitive data
Regular security audits
Authentication
JWT tokens with short expiration
Refresh token rotation
MFA for teacher accounts
Session management


📖 Documentation Requirements
For Developers
API documentation (OpenAPI/Swagger)
Component Storybook
Database schema diagrams
Architecture decision records (ADRs)
For Users
Student onboarding guide
Teacher curriculum builder tutorial
FAQ and troubleshooting
Video walkthroughs


🎯 Next Steps
Review this plan - Confirm alignment with vision
Set up development environment - Install tools and dependencies
Initialize Supabase project - Create database and configure auth
Scaffold React application - Set up Vite, Tailwind, and base structure
Implement core FSRS logic - Edge function and database integration
Build student feed MVP - Basic card review flow
Iterate and expand - Add game mechanics progressively



Ready to proceed? Let me know if you'd like to adjust any part of this plan or if you're ready to switch to Code mode to start implementation!

