// supabase/functions/fsrs-review/index.ts
// Edge Function: process an FSRS card review, update state, award points.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fsrs, Rating, State } from 'https://esm.sh/ts-fsrs@3';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Valid FSRS rating values (mirrors ts-fsrs Rating enum). */
export type FSRSRating = 1 | 2 | 3 | 4; // 1=Again 2=Hard 3=Good 4=Easy

export interface ReviewRequest {
  /** UUID of the challenges row to review. */
  challengeId: string;
  /** FSRS rating provided by the student. */
  rating: FSRSRating;
  /** Milliseconds the student spent on this card (optional). */
  reviewDurationMs?: number;
}

export interface ReviewResponse {
  success: true;
  pointsEarned: number;
  nextDueAt: string;       // ISO-8601
  newState: string;        // 'new' | 'learning' | 'review' | 'relearning'
  newStability: number;
  newDifficulty: number;
}

export interface ErrorResponse {
  success: false;
  error: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_POINTS: Record<FSRSRating, number> = {
  1: 2,   // Again  — minimal points
  2: 5,   // Hard
  3: 7,   // Good
  4: 10,  // Easy
};

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: ReviewRequest = await req.json();
    const { challengeId, rating, reviewDurationMs } = body;

    if (!challengeId || !rating) {
      const err: ErrorResponse = { success: false, error: 'challengeId and rating are required' };
      return new Response(JSON.stringify(err), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the current challenge + user momentum
    const { data: challenge, error: fetchError } = await supabase
      .from('challenges')
      .select('*, users!inner(id, momentum_multiplier, momentum_tier)')
      .eq('id', challengeId)
      .single();

    if (fetchError || !challenge) {
      const err: ErrorResponse = { success: false, error: 'Challenge not found' };
      return new Response(JSON.stringify(err), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Snapshot state before review
    const fsrsStateBefore = {
      state: challenge.state,
      stability: challenge.stability,
      difficulty: challenge.difficulty,
      elapsed_days: challenge.elapsed_days,
      scheduled_days: challenge.scheduled_days,
      reps: challenge.reps,
      lapses: challenge.lapses,
      due: challenge.due_at,
    };

    // Run FSRS algorithm
    const f = fsrs();
    const card = {
      state: challenge.state as State,
      stability: challenge.stability,
      difficulty: challenge.difficulty,
      elapsed_days: challenge.elapsed_days,
      scheduled_days: challenge.scheduled_days,
      reps: challenge.reps,
      lapses: challenge.lapses,
      due: new Date(challenge.due_at),
      last_review: challenge.last_review_at ? new Date(challenge.last_review_at) : undefined,
    };

    const now = new Date();
    const schedulingCards = f.repeat(card, now);
    const nextCard = schedulingCards[rating as Rating].card;

    // Calculate points with momentum multiplier
    const momentumMultiplier: number = challenge.users.momentum_multiplier ?? 1.0;
    const pointsEarned = Math.floor(BASE_POINTS[rating as FSRSRating] * momentumMultiplier);

    // Snapshot state after review
    const fsrsStateAfter = {
      state: nextCard.state,
      stability: nextCard.stability,
      difficulty: nextCard.difficulty,
      elapsed_days: nextCard.elapsed_days,
      scheduled_days: nextCard.scheduled_days,
      reps: nextCard.reps,
      lapses: nextCard.lapses,
      due: nextCard.due.toISOString(),
    };

    // Update challenge row
    const { error: updateError } = await supabase
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
        points_earned: challenge.points_earned + pointsEarned,
      })
      .eq('id', challengeId);

    if (updateError) throw updateError;

    // Write review log entry
    await supabase.from('review_log').insert({
      student_id: challenge.student_id,
      challenge_id: challengeId,
      concept_id: challenge.concept_id,
      rating,
      points_earned: pointsEarned,
      momentum_tier: challenge.users.momentum_tier,
      momentum_multiplier: momentumMultiplier,
      review_duration_ms: reviewDurationMs ?? null,
      was_bounty: challenge.is_bounty,
      fsrs_state_before: fsrsStateBefore,
      fsrs_state_after: fsrsStateAfter,
    });

    // Increment user total_points atomically via RPC
    await supabase.rpc('increment_user_points', {
      user_id: challenge.student_id,
      points: pointsEarned,
    });

    const response: ReviewResponse = {
      success: true,
      pointsEarned,
      nextDueAt: nextCard.due.toISOString(),
      newState: nextCard.state,
      newStability: nextCard.stability,
      newDifficulty: nextCard.difficulty,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const error: ErrorResponse = { success: false, error: (err as Error).message };
    return new Response(JSON.stringify(error), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
