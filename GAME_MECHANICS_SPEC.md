Game Mechanics Technical Specification
Detailed Implementation Guide for Core Features

🎮 1. Momentum Multipliers ("Vibe")
Overview
A streak system that rewards consistency without punishing occasional misses. Replaces traditional fragile streaks with a forgiving tier-based multiplier system.
State Machine
type MomentumTier = 'spark' | 'aura' | 'crown';

interface MomentumState {

  tier: MomentumTier;

  multiplier: number;

  consecutiveDays: number;

  emoji: string;

  displayName: string;

}

const MOMENTUM_CONFIG: Record<MomentumTier, MomentumState> = {

  spark: {

    tier: 'spark',

    multiplier: 1.0,

    consecutiveDays: 1,

    emoji: '✨',

    displayName: 'Spark'

  },

  aura: {

    tier: 'aura',

    multiplier: 1.2,

    consecutiveDays: 3,

    emoji: '🔮',

    displayName: 'Aura'

  },

  crown: {

    tier: 'crown',

    multiplier: 1.5,

    consecutiveDays: 6,

    emoji: '👑',

    displayName: 'Crown'

  }

};
Transition Rules
function calculateNewMomentum(

  lastActivityDate: string | null,

  currentStreak: number,

  currentTier: MomentumTier

): MomentumState {

  const today = new Date().toISOString().split('T')[0];

  

  // Already checked in today

  if (lastActivityDate === today) {

    return MOMENTUM_CONFIG[currentTier];

  }

  

  // Calculate days since last activity

  const daysSinceActivity = lastActivityDate

    ? Math.floor(

        (new Date(today).getTime() - new Date(lastActivityDate).getTime()) 

        / (1000 * 60 * 60 * 24)

      )

    : 999;

  

  let newStreak = currentStreak;

  

  if (daysSinceActivity === 1) {

    // Consecutive day - increment streak

    newStreak = currentStreak + 1;

  } else if (daysSinceActivity === 2) {

    // Soft downgrade - reduce by 2 days (minimum 1)

    newStreak = Math.max(1, currentStreak - 2);

  } else if (daysSinceActivity >= 3) {

    // Hard reset after 3+ days

    newStreak = 1;

  }

  

  // Determine tier based on streak

  if (newStreak >= 6) {

    return { ...MOMENTUM_CONFIG.crown, consecutiveDays: newStreak };

  } else if (newStreak >= 3) {

    return { ...MOMENTUM_CONFIG.aura, consecutiveDays: newStreak };

  } else {

    return { ...MOMENTUM_CONFIG.spark, consecutiveDays: newStreak };

  }

}
UI Display
interface MomentumBadgeProps {

  tier: MomentumTier;

  consecutiveDays: number;

  multiplier: number;

}

const MomentumBadge: React.FC<MomentumBadgeProps> = ({

  tier,

  consecutiveDays,

  multiplier

}) => {

  const config = MOMENTUM_CONFIG[tier];

  

  return (

    <motion.div

      className={`momentum-badge momentum-${tier}`}

      animate={tier}

      variants={badgeVariants}

    >

      <span className="emoji">{config.emoji}</span>

      <div className="info">

        <span className="tier-name">{config.displayName}</span>

        <span className="streak">{consecutiveDays} days</span>

        <span className="multiplier">{multiplier}x points</span>

      </div>

    </motion.div>

  );

};
Database Updates
-- Function to update momentum on daily check-in

CREATE OR REPLACE FUNCTION update_user_momentum(user_id UUID)

RETURNS TABLE(

  new_streak INTEGER,

  new_tier TEXT,

  new_multiplier DECIMAL

) AS $$

DECLARE

  v_last_activity DATE;

  v_current_streak INTEGER;

  v_current_tier TEXT;

  v_days_diff INTEGER;

  v_new_streak INTEGER;

  v_new_tier TEXT;

  v_new_multiplier DECIMAL;

BEGIN

  -- Get current user state

  SELECT last_activity_date, current_streak, momentum_tier

  INTO v_last_activity, v_current_streak, v_current_tier

  FROM users

  WHERE id = user_id;

  

  -- Calculate days difference

  v_days_diff := CURRENT_DATE - v_last_activity;

  

  -- Already checked in today

  IF v_days_diff = 0 THEN

    RETURN QUERY SELECT v_current_streak, v_current_tier, 

      CASE v_current_tier

        WHEN 'crown' THEN 1.5

        WHEN 'aura' THEN 1.2

        ELSE 1.0

      END;

    RETURN;

  END IF;

  

  -- Calculate new streak

  IF v_days_diff = 1 THEN

    v_new_streak := v_current_streak + 1;

  ELSIF v_days_diff = 2 THEN

    v_new_streak := GREATEST(1, v_current_streak - 2);

  ELSE

    v_new_streak := 1;

  END IF;

  

  -- Determine new tier

  IF v_new_streak >= 6 THEN

    v_new_tier := 'crown';

    v_new_multiplier := 1.5;

  ELSIF v_new_streak >= 3 THEN

    v_new_tier := 'aura';

    v_new_multiplier := 1.2;

  ELSE

    v_new_tier := 'spark';

    v_new_multiplier := 1.0;

  END IF;

  

  -- Update user

  UPDATE users

  SET 

    last_activity_date = CURRENT_DATE,

    current_streak = v_new_streak,

    momentum_tier = v_new_tier,

    momentum_multiplier = v_new_multiplier,

    updated_at = NOW()

  WHERE id = user_id;

  

  RETURN QUERY SELECT v_new_streak, v_new_tier, v_new_multiplier;

END;

$$ LANGUAGE plpgsql;


💰 2. Memory Bank
Overview
A permanent point accumulation system where earned points never decay. Points are used exclusively for unlocking cosmetic items, preventing loss-aversion burnout.
Point Calculation
interface PointsCalculation {

  basePoints: number;

  momentumMultiplier: number;

  totalPoints: number;

  breakdown: {

    base: number;

    momentum: number;

    bonus?: number;

  };

}

function calculatePoints(

  rating: FSRSRating,

  momentumMultiplier: number,

  isBountyDefense: boolean = false

): PointsCalculation {

  // Base points by rating

  const BASE_POINTS: Record<FSRSRating, number> = {

    [Rating.Again]: 3,

    [Rating.Hard]: 5,

    [Rating.Good]: 7,

    [Rating.Easy]: 10

  };

  

  const basePoints = BASE_POINTS[rating];

  const momentumBonus = Math.floor(basePoints * (momentumMultiplier - 1));

  const bountyBonus = isBountyDefense ? 5 : 0;

  

  return {

    basePoints,

    momentumMultiplier,

    totalPoints: basePoints + momentumBonus + bountyBonus,

    breakdown: {

      base: basePoints,

      momentum: momentumBonus,

      bonus: bountyBonus > 0 ? bountyBonus : undefined

    }

  };

}
Database Function
-- Function to safely increment user points

CREATE OR REPLACE FUNCTION increment_user_points(

  p_user_id UUID,

  p_points INTEGER

)

RETURNS INTEGER AS $$

DECLARE

  v_new_total INTEGER;

BEGIN

  UPDATE users

  SET 

    total_points = total_points + p_points,

    updated_at = NOW()

  WHERE id = p_user_id

  RETURNING total_points INTO v_new_total;

  

  -- Log the transaction

  INSERT INTO activity_log (user_id, action_type, metadata)

  VALUES (

    p_user_id,

    'points_earned',

    jsonb_build_object(

      'points', p_points,

      'new_total', v_new_total

    )

  );

  

  RETURN v_new_total;

END;

$$ LANGUAGE plpgsql;
UI Components
interface MemoryBankProps {

  totalPoints: number;

  recentEarnings: number;

  showAnimation?: boolean;

}

const MemoryBank: React.FC<MemoryBankProps> = ({

  totalPoints,

  recentEarnings,

  showAnimation = false

}) => {

  return (

    <div className="memory-bank">

      <div className="bank-icon">🏦</div>

      <div className="bank-info">

        <span className="label">Memory Bank</span>

        <motion.span 

          className="total"

          animate={showAnimation ? { scale: [1, 1.2, 1] } : {}}

        >

          {totalPoints.toLocaleString()} pts

        </motion.span>

      </div>

      {recentEarnings > 0 && (

        <motion.div

          className="recent-earnings"

          initial={{ opacity: 0, y: -20 }}

          animate={{ opacity: 1, y: 0 }}

          exit={{ opacity: 0, y: 20 }}

        >

          +{recentEarnings}

        </motion.div>

      )}

    </div>

  );

};


🎯 3. Bounty Flicks (Peer-to-Peer)
Overview
Students can "flick" difficult cards to peers for cooperative learning. Defenders earn cosmetic duplicates for correct answers; Challengers earn tutor bonuses.
Eligibility Rules
interface BountyEligibility {

  canFlick: boolean;

  reason?: string;

}

function checkBountyEligibility(

  challenge: Challenge,

  concept: Concept

): BountyEligibility {

  // Must be a difficult card

  if (concept.difficulty_rating < 0.6) {

    return {

      canFlick: false,

      reason: 'Card difficulty too low (must be ≥0.6)'

    };

  }

  

  // Must have attempted at least once

  if (challenge.reps === 0) {

    return {

      canFlick: false,

      reason: 'Must attempt card before flicking'

    };

  }

  

  // Can't flick if already in bounty

  if (challenge.is_bounty) {

    return {

      canFlick: false,

      reason: 'Card already in active bounty'

    };

  }

  

  return { canFlick: true };

}
Bounty Creation Flow
interface CreateBountyParams {

  challengerId: string;

  defenderId: string;

  conceptId: string;

}

async function createBountyFlick({

  challengerId,

  defenderId,

  conceptId

}: CreateBountyParams): Promise<BountyFlick> {

  // Create bounty record

  const { data: bounty, error } = await supabase

    .from('bounty_flicks')

    .insert({

      challenger_id: challengerId,

      defender_id: defenderId,

      concept_id: conceptId,

      status: 'pending',

      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    })

    .select()

    .single();

  

  if (error) throw error;

  

  // Create challenge for defender if doesn't exist

  const { error: challengeError } = await supabase

    .from('challenges')

    .upsert({

      student_id: defenderId,

      concept_id: conceptId,

      state: 'new',

      due_at: new Date().toISOString(),

      is_bounty: true,

      bounty_challenger_id: challengerId

    }, {

      onConflict: 'student_id,concept_id'

    });

  

  if (challengeError) throw challengeError;

  

  // Send notification to defender

  await sendBountyNotification(defenderId, bounty.id);

  

  return bounty;

}
Bounty Resolution
interface BountyResult {

  challengerCorrect: boolean;

  defenderCorrect: boolean;

  tutorBonusAwarded: boolean;

  cosmeticDupeAwarded: boolean;

}

async function resolveBounty(

  bountyId: string,

  defenderRating: FSRSRating

): Promise<BountyResult> {

  // Fetch bounty with challenger's result

  const { data: bounty } = await supabase

    .from('bounty_flicks')

    .select('*, challenges!inner(*)')

    .eq('id', bountyId)

    .single();

  

  const defenderCorrect = defenderRating >= Rating.Good;

  const challengerCorrect = bounty.challenger_result === 'correct';

  

  let tutorBonusAwarded = false;

  let cosmeticDupeAwarded = false;

  

  // Award tutor bonus to challenger if both correct

  if (challengerCorrect && defenderCorrect) {

    await increment_user_points(bounty.challenger_id, 15);

    tutorBonusAwarded = true;

  }

  

  // Award cosmetic dupe to defender if correct

  if (defenderCorrect) {

    await awardRandomCosmeticDupe(bounty.defender_id);

    cosmeticDupeAwarded = true;

  }

  

  // Update bounty status

  await supabase

    .from('bounty_flicks')

    .update({

      status: 'completed',

      defender_result: defenderCorrect ? 'correct' : 'incorrect',

      tutor_bonus_awarded: tutorBonusAwarded,

      cosmetic_dupe_awarded: cosmeticDupeAwarded,

      completed_at: new Date().toISOString()

    })

    .eq('id', bountyId);

  

  return {

    challengerCorrect,

    defenderCorrect,

    tutorBonusAwarded,

    cosmeticDupeAwarded

  };

}
UI Components
const BountyFlickModal: React.FC<{

  conceptId: string;

  onClose: () => void;

}> = ({ conceptId, onClose }) => {

  const [selectedDefender, setSelectedDefender] = useState<string | null>(null);

  const { data: peers } = usePeers(); // Fetch classmates

  

  const handleFlick = async () => {

    if (!selectedDefender) return;

    

    await createBountyFlick({

      challengerId: currentUserId,

      defenderId: selectedDefender,

      conceptId

    });

    

    toast.success('Bounty flicked! 🎯');

    onClose();

  };

  

  return (

    <Dialog open onOpenChange={onClose}>

      <DialogContent>

        <DialogHeader>

          <DialogTitle>Flick to a Peer</DialogTitle>

          <DialogDescription>

            Challenge a classmate with this difficult card

          </DialogDescription>

        </DialogHeader>

        

        <div className="peer-list">

          {peers?.map(peer => (

            <button

              key={peer.id}

              className={`peer-card ${selectedDefender === peer.id ? 'selected' : ''}`}

              onClick={() => setSelectedDefender(peer.id)}

            >

              <Avatar>

                <AvatarFallback>{peer.alias[0]}</AvatarFallback>

              </Avatar>

              <span className="alias">{peer.alias}</span>

            </button>

          ))}

        </div>

        

        <DialogFooter>

          <Button variant="outline" onClick={onClose}>Cancel</Button>

          <Button onClick={handleFlick} disabled={!selectedDefender}>

            Flick Card 🎯

          </Button>

        </DialogFooter>

      </DialogContent>

    </Dialog>

  );

};


⏱️ 4. Coyote Time
Overview
A 500ms grace period that allows students to undo accidental interactions before they're logged to FSRS. Named after the game design pattern where players can still jump briefly after running off a platform.
Implementation
interface CoyoteBuffer {

  action: CardAction;

  timestamp: number;

  timeoutId: NodeJS.Timeout;

  canUndo: boolean;

}

class CoyoteTimeManager {

  private buffer: CoyoteBuffer | null = null;

  private readonly GRACE_PERIOD_MS = 500;

  

  startBuffer(action: CardAction, onCommit: (action: CardAction) => void): void {

    // Clear existing buffer

    this.clearBuffer();

    

    // Create new buffer

    const timeoutId = setTimeout(() => {

      if (this.buffer?.canUndo) {

        onCommit(action);

        this.buffer = null;

      }

    }, this.GRACE_PERIOD_MS);

    

    this.buffer = {

      action,

      timestamp: Date.now(),

      timeoutId,

      canUndo: true

    };

  }

  

  undo(): boolean {

    if (!this.buffer || !this.buffer.canUndo) {

      return false;

    }

    

    clearTimeout(this.buffer.timeoutId);

    this.buffer = null;

    return true;

  }

  

  clearBuffer(): void {

    if (this.buffer) {

      clearTimeout(this.buffer.timeoutId);

      this.buffer = null;

    }

  }

  

  getRemainingTime(): number {

    if (!this.buffer) return 0;

    const elapsed = Date.now() - this.buffer.timestamp;

    return Math.max(0, this.GRACE_PERIOD_MS - elapsed);

  }

}
React Hook
function useCoyoteTime() {

  const [manager] = useState(() => new CoyoteTimeManager());

  const [remainingTime, setRemainingTime] = useState(0);

  const [canUndo, setCanUndo] = useState(false);

  

  useEffect(() => {

    const interval = setInterval(() => {

      const remaining = manager.getRemainingTime();

      setRemainingTime(remaining);

      setCanUndo(remaining > 0);

    }, 50);

    

    return () => clearInterval(interval);

  }, [manager]);

  

  const startBuffer = useCallback((

    action: CardAction,

    onCommit: (action: CardAction) => void

  ) => {

    manager.startBuffer(action, onCommit);

  }, [manager]);

  

  const undo = useCallback(() => {

    return manager.undo();

  }, [manager]);

  

  return {

    startBuffer,

    undo,

    canUndo,

    remainingTime

  };

}
UI Component
const CoyoteTimeIndicator: React.FC<{

  remainingTime: number;

  onUndo: () => void;

}> = ({ remainingTime, onUndo }) => {

  if (remainingTime === 0) return null;

  

  const progress = (remainingTime / 500) * 100;

  

  return (

    <motion.div

      className="coyote-time-indicator"

      initial={{ opacity: 0, y: 20 }}

      animate={{ opacity: 1, y: 0 }}

      exit={{ opacity: 0, y: -20 }}

    >

      <Progress value={progress} className="timer-bar" />

      <Button

        size="sm"

        variant="ghost"

        onClick={onUndo}

        className="undo-button"

      >

        <Undo2 className="w-4 h-4 mr-2" />

        Undo

      </Button>

    </motion.div>

  );

};
Usage in Card Swiper
const CardSwiper: React.FC = () => {

  const { startBuffer, undo, canUndo, remainingTime } = useCoyoteTime();

  const submitReview = useSubmitReview();

  

  const handleSwipe = (direction: 'left' | 'right' | 'up') => {

    const rating = directionToRating(direction);

    

    startBuffer(

      { type: 'swipe', rating },

      (action) => {

        // Commit to FSRS after grace period

        submitReview.mutate({

          challengeId: currentCard.id,

          rating: action.rating

        });

      }

    );

  };

  

  return (

    <div className="card-swiper">

      <AnimatePresence>

        {currentCard && (

          <motion.div

            drag

            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}

            onDragEnd={(e, info) => {

              if (Math.abs(info.offset.x) > 100) {

                handleSwipe(info.offset.x > 0 ? 'right' : 'left');

              }

            }}

          >

            <Card content={currentCard.concept.content_payload} />

          </motion.div>

        )}

      </AnimatePresence>

      

      <CoyoteTimeIndicator

        remainingTime={remainingTime}

        onUndo={undo}

      />

    </div>

  );

};


🎨 5. Cosmetics System
Cosmetic Types
type CosmeticCategory = 'avatar' | 'badge' | 'theme' | 'effect';

type CosmeticRarity = 'common' | 'rare' | 'epic' | 'legendary';

interface Cosmetic {

  id: string;

  name: string;

  category: CosmeticCategory;

  rarity: CosmeticRarity;

  unlock_cost: number;

  asset_url: string;

  metadata: {

    description?: string;

    color?: string;

    animation?: string;

  };

}

const RARITY_COLORS: Record<CosmeticRarity, string> = {

  common: '#94A3B8',

  rare: '#3B82F6',

  epic: '#8B5CF6',

  legendary: '#EAB308'

};
Unlock Logic
async function unlockCosmetic(

  userId: string,

  cosmeticId: string

): Promise<{ success: boolean; error?: string }> {

  // Fetch cosmetic and user

  const [{ data: cosmetic }, { data: user }] = await Promise.all([

    supabase.from('cosmetics').select('*').eq('id', cosmeticId).single(),

    supabase.from('users').select('total_points').eq('id', userId).single()

  ]);

  

  if (!cosmetic || !user) {

    return { success: false, error: 'Not found' };

  }

  

  // Check if user has enough points

  if (user.total_points < cosmetic.unlock_cost) {

    return { success: false, error: 'Insufficient points' };

  }

  

  // Check if already unlocked

  const { data: existing } = await supabase

    .from('user_cosmetics')

    .select('*')

    .eq('user_id', userId)

    .eq('cosmetic_id', cosmeticId)

    .single();

  

  if (existing) {

    return { success: false, error: 'Already unlocked' };

  }

  

  // Deduct points and unlock

  const { error: updateError } = await supabase

    .from('users')

    .update({ total_points: user.total_points - cosmetic.unlock_cost })

    .eq('id', userId);

  

  if (updateError) {

    return { success: false, error: updateError.message };

  }

  

  const { error: insertError } = await supabase

    .from('user_cosmetics')

    .insert({

      user_id: userId,

      cosmetic_id: cosmeticId,

      quantity: 1

    });

  

  if (insertError) {

    // Rollback points

    await supabase

      .from('users')

      .update({ total_points: user.total_points })

      .eq('id', userId);

    

    return { success: false, error: insertError.message };

  }

  

  return { success: true };

}
Cosmetic Shop UI
const CosmeticShop: React.FC = () => {

  const { data: cosmetics } = useCosmetics();

  const { data: user } = useCurrentUser();

  const unlockMutation = useUnlockCosmetic();

  

  const groupedCosmetics = groupBy(cosmetics, 'category');

  

  return (

    <div className="cosmetic-shop">

      <div className="shop-header">

        <h2>Cosmetic Shop</h2>

        <div className="points-display">

          <Coins className="w-5 h-5" />

          <span>{user?.total_points.toLocaleString()} pts</span>

        </div>

      </div>

      

      <Tabs defaultValue="avatar">

        {Object.entries(groupedCosmetics).map(([category, items]) => (

          <TabsContent key={category} value={category}>

            <div className="cosmetic-grid">

              {items.map(cosmetic => (

                <CosmeticCard

                  key={cosmetic.id}

                  cosmetic={cosmetic}

                  canAfford={user.total_points >= cosmetic.unlock_cost}

                  onUnlock={() => unlockMutation.mutate(cosmetic.id)}

                />

              ))}

            </div>

          </TabsContent>

        ))}

      </Tabs>

    </div>

  );

};


📊 Analytics & Tracking
Key Events to Track
type AnalyticsEvent =

  | { type: 'card_review'; rating: FSRSRating; duration_ms: number }

  | { type: 'momentum_check'; new_tier: MomentumTier }

  | { type: 'bounty_created'; concept_id: string }

  | { type: 'bounty_completed'; success: boolean }

  | { type: 'cosmetic_unlocked'; cosmetic_id: string }

  | { type: 'coyote_undo'; action_type: string };

async function trackEvent(

  userId: string,

  event: AnalyticsEvent

): Promise<void> {

  await supabase.from('activity_log').insert({

    user_id: userId,

    action_type: event.type,

    metadata: event

  });

}
Usage
// Track card review

await trackEvent(userId, {

  type: 'card_review',

  rating: Rating.Good,

  duration_ms: 3500

});

// Track momentum change

await trackEvent(userId, {

  type: 'momentum_check',

  new_tier: 'aura'

});


🧪 Testing Scenarios
Momentum System Tests
describe('Momentum System', () => {

  it('should upgrade from spark to aura after 3 consecutive days', () => {

    const result = calculateNewMomentum('2024-01-01', 2, 'spark');

    expect(result.tier).toBe('aura');

    expect(result.multiplier).toBe(1.2);

  });

  

  it('should soft downgrade after missing 1 day', () => {

    const result = calculateNewMomentum('2024-01-01', 5, 'aura');

    expect(result.consecutiveDays).toBe(3);

    expect(result.tier).toBe('aura');

  });

  

  it('should hard reset after missing 3+ days', () => {

    const result = calculateNewMomentum('2024-01-01', 10, 'crown');

    expect(result.consecutiveDays).toBe(1);

    expect(result.tier).toBe('spark');

  });

});
Coyote Time Tests
describe('Coyote Time', () => {

  it('should allow undo within 500ms', async () => {

    const manager = new CoyoteTimeManager();

    let committed = false;

    

    manager.startBuffer(

      { type: 'swipe', rating: Rating.Again },

      () => { committed = true; }

    );

    

    await sleep(200);

    const undone = manager.undo();

    

    expect(undone).toBe(true);

    expect(committed).toBe(false);

  });

  

  it('should commit after 500ms', async () => {

    const manager = new CoyoteTimeManager();

    let committed = false;

    

    manager.startBuffer(

      { type: 'swipe', rating: Rating.Good },

      () => { committed = true; }

    );

    

    await sleep(600);

    

    expect(committed).toBe(true);

  });

});


🎯 Performance Considerations
Optimizations
Momentum Check: Cache last check time in localStorage to avoid redundant API calls
Cosmetics: Lazy load cosmetic assets, preload equipped items
Bounty Notifications: Use Supabase Realtime for instant updates
FSRS Calculations: Run in Web Worker for heavy computations
Card Queue: Prefetch next 3 cards for smooth transitions
Caching Strategy
// Cache momentum state

const MOMENTUM_CACHE_KEY = 'momentum_last_check';

async function checkMomentumWithCache(userId: string) {

  const lastCheck = localStorage.getItem(MOMENTUM_CACHE_KEY);

  const today = new Date().toISOString().split('T')[0];

  

  if (lastCheck === today) {

    // Already checked today, skip API call

    return;

  }

  

  const result = await checkMomentum(userId);

  localStorage.setItem(MOMENTUM_CACHE_KEY, today);

  

  return result;

}



This specification provides detailed implementation guidance for all core game mechanics. Use it alongside the main implementation plan for building the features.

