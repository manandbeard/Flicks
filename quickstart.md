Quick Start Guide
Getting Your Educational Game Up and Running

🚀 Prerequisites
Before you begin, ensure you have the following installed:

Node.js (v18 or higher)
npm or pnpm (package manager)
Git (version control)
Supabase CLI (for local development)
VS Code (recommended IDE)


📦 Step 1: Initialize the Project
# Create project directory

mkdir educational-game

cd educational-game

# Initialize Vite + React + TypeScript

npm create vite@latest frontend -- --template react-ts

cd frontend

npm install

# Install core dependencies

npm install @supabase/supabase-js zustand @tanstack/react-query framer-motion reactflow

# Install UI dependencies

npm install tailwindcss postcss autoprefixer

npm install -D @types/node

npx tailwindcss init -p

# Install shadcn/ui

npx shadcn-ui@latest init


🗄️ Step 2: Set Up Supabase
Option A: Supabase Cloud (Recommended for Production)
Go to supabase.com
Create a new project
Copy your project URL and anon key
Create .env.local file:

VITE_SUPABASE_URL=your-project-url

VITE_SUPABASE_ANON_KEY=your-anon-key
Option B: Local Development
# Install Supabase CLI

npm install -g supabase

# Initialize Supabase in project

cd ..

supabase init

# Start local Supabase

supabase start

# Note the API URL and anon key from output


🏗️ Step 3: Create Database Schema
Create a new SQL migration file:

supabase migration new initial_schema

Copy the schema from IMPLEMENTATION_PLAN.md into the migration file, then apply it:

# For local development

supabase db reset

# For cloud (via dashboard)

# Go to SQL Editor and run the schema


⚙️ Step 4: Configure Tailwind CSS
Update tailwind.config.js:

/** @type {import('tailwindcss').Config} */

export default {

  darkMode: ["class"],

  content: [

    './pages/**/*.{ts,tsx}',

    './components/**/*.{ts,tsx}',

    './app/**/*.{ts,tsx}',

    './src/**/*.{ts,tsx}',

  ],

  theme: {

    extend: {

      colors: {

        spark: {

          primary: '#FCD34D',

          glow: 'rgba(252, 211, 77, 0.3)'

        },

        aura: {

          primary: '#8B5CF6',

          glow: 'rgba(139, 92, 246, 0.3)'

        },

        crown: {

          primary: '#EAB308',

          glow: 'rgba(234, 179, 8, 0.3)'

        }

      }

    }

  },

  plugins: [require("tailwindcss-animate")],

}


🔧 Step 5: Set Up Project Structure
cd frontend/src

# Create directory structure

mkdir -p components/{ui,student,teacher,shared}

mkdir -p stores hooks lib types

# Create base files

touch lib/supabase.ts

touch types/database.types.ts

touch types/game.types.ts


🎯 Step 6: Create Supabase Client
Create src/lib/supabase.ts:

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {

  throw new Error('Missing Supabase environment variables');

}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);


🧪 Step 7: Generate TypeScript Types
# Generate types from your Supabase schema

supabase gen types typescript --local > src/types/database.types.ts

# Or for cloud project

supabase gen types typescript --project-id your-project-id > src/types/database.types.ts


🎮 Step 8: Deploy Edge Functions
Create the FSRS review function:

# Create function directory

supabase functions new fsrs-review

# Copy the function code from IMPLEMENTATION_PLAN.md

# Then deploy

supabase functions deploy fsrs-review

# Create momentum check function

supabase functions new check-momentum

supabase functions deploy check-momentum


🎨 Step 9: Install shadcn/ui Components
# Install commonly needed components

npx shadcn-ui@latest add button

npx shadcn-ui@latest add card

npx shadcn-ui@latest add dialog

npx shadcn-ui@latest add badge

npx shadcn-ui@latest add avatar

npx shadcn-ui@latest add progress

npx shadcn-ui@latest add tabs

npx shadcn-ui@latest add toast


🏃 Step 10: Run Development Server
cd frontend

npm run dev

Visit http://localhost:5173 to see your app!


📝 Development Workflow
Daily Development
# Start Supabase (if using local)

supabase start

# Start frontend dev server

cd frontend

npm run dev

# In another terminal, watch for type changes

npm run type-check -- --watch
Making Database Changes
# Create a new migration

supabase migration new your_migration_name

# Edit the migration file in supabase/migrations/

# Apply migration locally

supabase db reset

# Push to production

supabase db push
Deploying Edge Functions
# Deploy a specific function

supabase functions deploy function-name

# Deploy all functions

supabase functions deploy


🧪 Testing
# Run unit tests

npm run test

# Run tests in watch mode

npm run test:watch

# Run E2E tests

npm run test:e2e


🚀 Production Deployment
Frontend (Vercel)
# Install Vercel CLI

npm install -g vercel

# Deploy

vercel deploy --prod
Frontend (Netlify)
# Install Netlify CLI

npm install -g netlify-cli

# Deploy

netlify deploy --prod
Database & Edge Functions
# Link to production project

supabase link --project-ref your-project-ref

# Push database migrations

supabase db push

# Deploy edge functions

supabase functions deploy


🔍 Troubleshooting
Common Issues
Issue: Supabase connection fails

# Check if Supabase is running

supabase status

# Restart Supabase

supabase stop

supabase start

Issue: TypeScript errors

# Regenerate types

supabase gen types typescript --local > src/types/database.types.ts

# Clear cache and reinstall

rm -rf node_modules package-lock.json

npm install

Issue: Edge function not working

# Check function logs

supabase functions logs fsrs-review

# Test function locally

supabase functions serve fsrs-review


📚 Useful Commands
# Supabase

supabase status              # Check status

supabase db reset            # Reset database

supabase db diff             # Show schema changes

supabase gen types typescript # Generate types

# Frontend

npm run dev                  # Start dev server

npm run build                # Build for production

npm run preview              # Preview production build

npm run lint                 # Lint code

npm run format               # Format code

# Testing

npm run test                 # Run tests

npm run test:ui              # Run tests with UI

npm run test:coverage        # Generate coverage report


🎯 Next Steps
✅ Complete setup steps above
📖 Review IMPLEMENTATION_PLAN.md for detailed architecture
🎨 Start with student feed UI (mobile-first)
🧠 Implement FSRS integration
🎮 Add game mechanics (momentum, bounty flicks)
👨‍🏫 Build teacher curriculum builder
🧪 Write tests
🚀 Deploy to production


📞 Support Resources
Supabase Docs: https://supabase.com/docs
React Query Docs: https://tanstack.com/query/latest
Framer Motion Docs: https://www.framer.com/motion/
React Flow Docs: https://reactflow.dev/
shadcn/ui Docs: https://ui.shadcn.com/
ts-fsrs Docs: https://github.com/open-spaced-repetition/ts-fsrs



Ready to build? Follow these steps in order, and you'll have a solid foundation for your educational game! 🎓✨

