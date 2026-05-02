// supabase/functions/check-momentum/index.ts
// Edge Function: evaluate a user's login streak and update their momentum tier.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MomentumTier = 'spark' | 'aura' | 'crown';

export interface MomentumCheckRequest {
  /** UUID of the user logging in / completing a review session. */
  userId: string;
}

export interface MomentumCheckResponse {
  success: true;
  userId: string;
  previousTier: MomentumTier;
  newTier: MomentumTier;
  newMultiplier: number;
  currentStreak: number;
  tierChanged: boolean;
}

export interface ErrorResponse {
  success: false;
  error: string;
}

// ─── Momentum tier table ──────────────────────────────────────────────────────

interface TierConfig {
  tier: MomentumTier;
  multiplier: number;
  emoji: string;
}

/** Maps consecutive-day streak → tier config. Values ≥ 6 → Crown. */
const TIER_BY_STREAK: Record<number, TierConfig> = {
  0: { tier: 'spark', multiplier: 1.0, emoji: '✨' },
  1: { tier: 'spark', multiplier: 1.0, emoji: '✨' },
  2: { tier: 'spark', multiplier: 1.0, emoji: '✨' },
  3: { tier: 'aura',  multiplier: 1.2, emoji: '🔮' },
  4: { tier: 'aura',  multiplier: 1.2, emoji: '🔮' },
  5: { tier: 'aura',  multiplier: 1.2, emoji: '🔮' },
};
const CROWN_STREAK_THRESHOLD = 6;
const CROWN_CONFIG: TierConfig = { tier: 'crown', multiplier: 1.5, emoji: '👑' };

function getTierForStreak(streak: number): TierConfig {
  if (streak >= CROWN_STREAK_THRESHOLD) return CROWN_CONFIG;
  return TIER_BY_STREAK[streak] ?? TIER_BY_STREAK[0];
}

/**
 * Determine the new streak given the last activity date.
 *
 * Rules:
 *  - Same day   → streak unchanged (already recorded today)
 *  - +1 day     → increment streak
 *  - +2 days    → soft downgrade: drop 1 tier by reducing streak
 *  - ≥3 days    → streak resets to 1 (hard reset)
 */
function computeNewStreak(lastActivityDate: string | null, currentStreak: number): number {
  if (!lastActivityDate) return 1;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const last = new Date(lastActivityDate);
  last.setUTCHours(0, 0, 0, 0);

  const diffDays = Math.round((today.getTime() - last.getTime()) / 86_400_000);

  if (diffDays === 0) return currentStreak;         // already active today
  if (diffDays === 1) return currentStreak + 1;     // consecutive day
  if (diffDays === 2) return Math.max(1, currentStreak - 1); // soft downgrade
  return 1;                                          // 3+ days — hard reset
}

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: MomentumCheckRequest = await req.json();
    const { userId } = body;

    if (!userId) {
      const err: ErrorResponse = { success: false, error: 'userId is required' };
      return new Response(JSON.stringify(err), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch current user state
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, last_activity_date, current_streak, momentum_tier, momentum_multiplier')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      const err: ErrorResponse = { success: false, error: 'User not found' };
      return new Response(JSON.stringify(err), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const previousTier = user.momentum_tier as MomentumTier;
    const newStreak = computeNewStreak(user.last_activity_date, user.current_streak);
    const { tier: newTier, multiplier: newMultiplier } = getTierForStreak(newStreak);

    const today = new Date().toISOString().split('T')[0];

    // Only write if something actually changed (or date needs updating)
    if (newStreak !== user.current_streak || newTier !== previousTier || user.last_activity_date !== today) {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          current_streak: newStreak,
          momentum_tier: newTier,
          momentum_multiplier: newMultiplier,
          last_activity_date: today,
        })
        .eq('id', userId);

      if (updateError) throw updateError;
    }

    const response: MomentumCheckResponse = {
      success: true,
      userId,
      previousTier,
      newTier,
      newMultiplier,
      currentStreak: newStreak,
      tierChanged: newTier !== previousTier,
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
