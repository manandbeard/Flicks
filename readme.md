# 🎓 Educational Game Platform
## Mobile-First FSRS-Powered Jigsaw Puzzle Learning for Grades 6-12

[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green.svg)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🌟 Overview

A revolutionary educational platform that transforms spaced repetition learning into an engaging, social experience. Students earn momentum multipliers, unlock cosmetics, and challenge peers while mastering curriculum content through FSRS-powered adaptive learning.

### Key Features

- **🎮 Gamified Learning**: Momentum multipliers, Memory Bank, and cosmetic rewards
- **🧠 FSRS Algorithm**: Scientifically-proven spaced repetition for optimal retention
- **🤝 Peer Challenges**: Bounty Flicks system for cooperative learning
- **📱 Mobile-First**: Smooth, swipeable card interface with Framer Motion
- **👨‍🏫 Teacher Tools**: Visual curriculum builder with React Flow
- **🔒 COPPA Compliant**: Safe, anonymous peer interactions with aliases

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [**IMPLEMENTATION_PLAN.md**](IMPLEMENTATION_PLAN.md) | Complete technical architecture and implementation guide |
| [**QUICK_START.md**](QUICK_START.md) | Step-by-step setup instructions for developers |
| [**GAME_MECHANICS_SPEC.md**](GAME_MECHANICS_SPEC.md) | Detailed specifications for all game mechanics |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account (or local Supabase CLI)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd educational-game

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev
```

For detailed setup instructions, see [**QUICK_START.md**](QUICK_START.md).

---

## 🏗️ Architecture

### Tech Stack

**Frontend**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui
- Zustand (client state)
- TanStack Query (server state)
- Framer Motion (animations)
- React Flow (curriculum builder)

**Backend**
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Deno Edge Functions
- ts-fsrs (spaced repetition)

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  Student Feed    │         │  Teacher Builder │         │
│  │  (Mobile-First)  │         │  (Desktop)       │         │
│  └────────┬─────────┘         └────────┬─────────┘         │
│           │                            │                    │
│  ┌────────┴────────────────────────────┴─────────┐         │
│  │         State Management Layer                 │         │
│  │  Zustand (UI) + TanStack Query (Server)       │         │
│  └────────┬───────────────────────────────────────┘         │
└───────────┼─────────────────────────────────────────────────┘
            │
┌───────────┼─────────────────────────────────────────────────┐
│           │         Supabase Backend                         │
│  ┌────────┴─────────┐  ┌──────────┐  ┌──────────────┐     │
│  │   PostgreSQL     │  │   Auth   │  │   Storage    │     │
│  │   (RLS Enabled)  │  │          │  │              │     │
│  └──────────────────┘  └──────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │           Deno Edge Functions                     │      │
│  │  ┌──────────────┐    ┌──────────────────┐       │      │
│  │  │ fsrs-review  │    │ check-momentum   │       │      │
│  │  │ (ts-fsrs)    │    │                  │       │      │
│  │  └──────────────┘    └──────────────────┘       │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎮 Core Game Mechanics

### 1. Momentum Multipliers ("Vibe")

Replace fragile streaks with forgiving tier-based multipliers:

- **✨ Spark** (Days 1-2): 1.0x multiplier
- **🔮 Aura** (Days 3-5): 1.2x multiplier
- **👑 Crown** (Days 6+): 1.5x multiplier

**Soft Downgrade**: Missing 1 day reduces tier by one level, not a complete reset.

### 2. Memory Bank

Permanent point accumulation system where earned points **never decay**. Points unlock cosmetic items only, preventing loss-aversion burnout.

### 3. Bounty Flicks

Peer-to-peer challenge system:
- Students "flick" difficult cards to classmates
- Defenders earn cosmetic duplicates for correct answers
- Challengers earn tutor bonuses
- COPPA-safe: Only aliases visible, no direct messaging

### 4. Coyote Time

500ms grace period allowing students to undo accidental swipes before they're logged to FSRS.

---

## 📊 Database Schema

### Core Tables

```sql
users
├── id (UUID)
├── alias (TEXT) -- COPPA-safe (e.g., "NeonFalcon")
├── role (TEXT) -- student | teacher | admin
├── equipped_cosmetics (JSONB)
├── total_points (INTEGER)
├── current_streak (INTEGER)
├── momentum_tier (TEXT)
└── momentum_multiplier (DECIMAL)

concepts
├── id (UUID)
├── teacher_id (UUID)
├── title (TEXT)
├── card_type (TEXT) -- recall | poll | hotspot | sequence
├── content_payload (JSONB) -- Mixed media support
└── difficulty_rating (DECIMAL)

challenges (FSRS State)
├── id (UUID)
├── student_id (UUID)
├── concept_id (UUID)
├── state (TEXT) -- new | learning | review | relearning
├── due_at (TIMESTAMPTZ)
├── stability (DECIMAL)
├── difficulty (DECIMAL)
├── elapsed_days (INTEGER)
├── scheduled_days (INTEGER)
├── reps (INTEGER)
└── lapses (INTEGER)
```

For complete schema, see [**IMPLEMENTATION_PLAN.md**](IMPLEMENTATION_PLAN.md#database-schema).

---

## 🎨 Card Types

### 1. Recall Cards
Traditional flashcards with question/answer format. Supports text, images, audio, and video.

### 2. Poll Cards
Multiple-choice questions with immediate feedback and explanations.

### 3. Hotspot Cards
Interactive image-based questions where students tap correct regions.

### 4. Sequence Cards
Drag-and-drop ordering challenges for sequential learning.

---

## 🔐 Security & Privacy

### COPPA Compliance

- **Anonymous Aliases**: Auto-generated names (e.g., "NeonFalcon123")
- **No PII Collection**: No personal information for students under 13
- **Safe Interactions**: Peer challenges use aliases only, no direct messaging
- **Parental Controls**: Teacher oversight of all student interactions

### Row Level Security (RLS)

All database tables use Supabase RLS policies:
- Students can only access their own data
- Teachers can only manage their own content
- Bounty Flicks enforce proper access controls

---

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

---

## 📱 Mobile-First Design

### Responsive Breakpoints

```typescript
sm: '640px',   // Small phones
md: '768px',   // Large phones / small tablets
lg: '1024px',  // Tablets / small laptops
xl: '1280px',  // Desktops
2xl: '1536px'  // Large desktops
```

### Touch Gestures

- **Swipe Right**: Easy (confident answer)
- **Swipe Up**: Good (correct answer)
- **Swipe Left**: Hard (struggled but correct)
- **Swipe Down**: Again (incorrect, needs review)

---

## 🎯 Development Roadmap

### Phase 1: MVP (Weeks 1-4)
- [x] Project setup and infrastructure
- [ ] Basic authentication with aliases
- [ ] Student feed with recall cards
- [ ] FSRS integration
- [ ] Momentum multipliers
- [ ] Memory Bank

### Phase 2: Game Mechanics (Weeks 5-8)
- [ ] All 4 card types
- [ ] Bounty Flicks system
- [ ] Cosmetics shop
- [ ] Profile customization
- [ ] Coyote Time buffer

### Phase 3: Teacher Tools (Weeks 9-12)
- [ ] React Flow curriculum builder
- [ ] Concept editor with media upload
- [ ] Analytics dashboard
- [ ] Bulk import/export

### Phase 4: Polish & Launch (Weeks 13-16)
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Mobile responsiveness
- [ ] Production deployment
- [ ] User onboarding

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow ESLint and Prettier configurations
- Write tests for new features
- Update documentation as needed

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **FSRS Algorithm**: [open-spaced-repetition/ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)
- **Supabase**: Backend infrastructure and authentication
- **shadcn/ui**: Beautiful, accessible UI components
- **Framer Motion**: Smooth animations and gestures

---

## 📞 Support

- **Documentation**: See docs folder for detailed guides
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Join our community discussions

---

## 🎓 Educational Philosophy

This platform is built on the principle that learning should be:

1. **Engaging**: Gamification without sacrificing educational value
2. **Forgiving**: Soft failures that encourage persistence
3. **Social**: Cooperative challenges that build community
4. **Adaptive**: FSRS algorithm optimizes review timing
5. **Rewarding**: Permanent progress tracking prevents burnout

---

**Built with ❤️ for educators and students**

*Transforming spaced repetition into an adventure*

