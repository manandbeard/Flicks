Teacher Analytics Dashboard Specification
Comprehensive Student Progress Tracking & Insights

🎯 Overview
The Teacher Analytics Dashboard provides educators with actionable insights into student learning patterns, concept mastery, and engagement metrics. Built with data visualization libraries and real-time updates, it helps teachers identify struggling students, optimize curriculum, and measure learning outcomes.


📊 Dashboard Layout
Main Sections
┌─────────────────────────────────────────────────────────────┐

│  Header: Class Selector | Date Range | Export              │

├─────────────────────────────────────────────────────────────┤

│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │

│  │   Active    │  │   Cards     │  │  Avg Daily  │        │

│  │  Students   │  │  Reviewed   │  │   Reviews   │        │

│  │     42      │  │    1,247    │  │     8.3     │        │

│  └─────────────┘  └─────────────┘  └─────────────┘        │

├─────────────────────────────────────────────────────────────┤

│  Engagement Trends (Line Chart)                             │

│  ┌───────────────────────────────────────────────────────┐ │

│  │  Daily Active Users & Review Volume (Last 30 Days)    │ │

│  └───────────────────────────────────────────────────────┘ │

├─────────────────────────────────────────────────────────────┤

│  ┌──────────────────────┐  ┌──────────────────────────┐   │

│  │  Concept Mastery     │  │  Momentum Distribution   │   │

│  │  (Heatmap)           │  │  (Pie Chart)             │   │

│  └──────────────────────┘  └──────────────────────────┘   │

├─────────────────────────────────────────────────────────────┤

│  Student Performance Table (Sortable, Filterable)           │

│  ┌───────────────────────────────────────────────────────┐ │

│  │ Alias | Streak | Reviews | Accuracy | Last Active    │ │

│  └───────────────────────────────────────────────────────┘ │

├─────────────────────────────────────────────────────────────┤

│  ┌──────────────────────┐  ┌──────────────────────────┐   │

│  │  Struggling Students │  │  Top Performers          │   │

│  │  (Alert List)        │  │  (Leaderboard)           │   │

│  └──────────────────────┘  └──────────────────────────┘   │

└─────────────────────────────────────────────────────────────┘


📈 Key Metrics & Visualizations
1. Overview Cards
Active Students
interface ActiveStudentsMetric {

  total: number;

  activeToday: number;

  activeThisWeek: number;

  percentageChange: number; // vs previous period

}

// SQL Query

SELECT 

  COUNT(DISTINCT id) as total,

  COUNT(DISTINCT CASE 

    WHEN last_activity_date = CURRENT_DATE 

    THEN id 

  END) as active_today,

  COUNT(DISTINCT CASE 

    WHEN last_activity_date >= CURRENT_DATE - INTERVAL '7 days'

    THEN id 

  END) as active_this_week

FROM users

WHERE role = 'student'

  AND id IN (

    SELECT DISTINCT student_id 

    FROM challenges 

    WHERE concept_id IN (

      SELECT id FROM concepts WHERE teacher_id = $1

    )

  );
Cards Reviewed
interface CardsReviewedMetric {

  total: number;

  today: number;

  thisWeek: number;

  averagePerStudent: number;

}

// SQL Query

SELECT 

  COUNT(*) as total,

  COUNT(CASE 

    WHEN DATE(last_review_at) = CURRENT_DATE 

    THEN 1 

  END) as today,

  COUNT(CASE 

    WHEN last_review_at >= CURRENT_DATE - INTERVAL '7 days'

    THEN 1 

  END) as this_week,

  ROUND(COUNT(*)::DECIMAL / COUNT(DISTINCT student_id), 1) as avg_per_student

FROM challenges

WHERE concept_id IN (

  SELECT id FROM concepts WHERE teacher_id = $1

)

AND last_review_at IS NOT NULL;
Average Daily Reviews
interface DailyReviewsMetric {

  average: number;

  trend: 'up' | 'down' | 'stable';

  percentageChange: number;

}

// SQL Query

WITH daily_reviews AS (

  SELECT 

    DATE(last_review_at) as review_date,

    COUNT(*) as review_count

  FROM challenges

  WHERE concept_id IN (

    SELECT id FROM concepts WHERE teacher_id = $1

  )

  AND last_review_at >= CURRENT_DATE - INTERVAL '30 days'

  GROUP BY DATE(last_review_at)

)

SELECT 

  ROUND(AVG(review_count), 1) as average,

  ROUND(

    (AVG(CASE WHEN review_date >= CURRENT_DATE - INTERVAL '7 days' THEN review_count END) - 

     AVG(CASE WHEN review_date < CURRENT_DATE - INTERVAL '7 days' THEN review_count END)) /

    NULLIF(AVG(CASE WHEN review_date < CURRENT_DATE - INTERVAL '7 days' THEN review_count END), 0) * 100,

    1

  ) as percentage_change

FROM daily_reviews;
2. Engagement Trends Chart
Visualization: Line chart with dual Y-axes

Primary Y-axis: Daily Active Users (DAU)
Secondary Y-axis: Total Reviews
X-axis: Date (last 30 days)

interface EngagementDataPoint {

  date: string;

  activeUsers: number;

  totalReviews: number;

  averageReviewsPerUser: number;

}

// Component

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const EngagementTrendsChart: React.FC<{ data: EngagementDataPoint[] }> = ({ data }) => {

  return (

    <ResponsiveContainer width="100%" height={300}>

      <LineChart data={data}>

        <CartesianGrid strokeDasharray="3 3" />

        <XAxis dataKey="date" />

        <YAxis yAxisId="left" />

        <YAxis yAxisId="right" orientation="right" />

        <Tooltip />

        <Legend />

        <Line 

          yAxisId="left"

          type="monotone" 

          dataKey="activeUsers" 

          stroke="#8B5CF6" 

          name="Active Users"

        />

        <Line 

          yAxisId="right"

          type="monotone" 

          dataKey="totalReviews" 

          stroke="#10B981" 

          name="Total Reviews"

        />

      </LineChart>

    </ResponsiveContainer>

  );

};
3. Concept Mastery Heatmap
Visualization: Heatmap showing student performance across concepts

Rows: Students (aliases)
Columns: Concepts
Color: Mastery level (0-100%)

interface ConceptMasteryData {

  studentAlias: string;

  conceptTitle: string;

  masteryPercentage: number;

  reviewCount: number;

  lastReviewed: string;

}

// Mastery calculation based on FSRS state

const calculateMastery = (challenge: Challenge): number => {

  const stateWeights = {

    new: 0,

    learning: 25,

    review: 75,

    relearning: 50

  };

  

  const baseScore = stateWeights[challenge.state];

  const stabilityBonus = Math.min(25, challenge.stability * 5);

  const accuracyBonus = Math.max(0, 100 - challenge.difficulty * 100) * 0.5;

  

  return Math.min(100, baseScore + stabilityBonus + accuracyBonus);

};

// SQL Query

SELECT 

  u.alias as student_alias,

  c.title as concept_title,

  ch.state,

  ch.stability,

  ch.difficulty,

  ch.reps as review_count,

  ch.last_review_at as last_reviewed

FROM challenges ch

JOIN users u ON ch.student_id = u.id

JOIN concepts c ON ch.concept_id = c.id

WHERE c.teacher_id = $1

ORDER BY u.alias, c.title;

Component:

import { HeatMapGrid } from 'react-grid-heatmap';

const ConceptMasteryHeatmap: React.FC<{ data: ConceptMasteryData[] }> = ({ data }) => {

  const students = [...new Set(data.map(d => d.studentAlias))];

  const concepts = [...new Set(data.map(d => d.conceptTitle))];

  

  const heatmapData = students.map(student =>

    concepts.map(concept => {

      const entry = data.find(

        d => d.studentAlias === student && d.conceptTitle === concept

      );

      return entry?.masteryPercentage || 0;

    })

  );

  

  return (

    <HeatMapGrid

      data={heatmapData}

      xLabels={concepts}

      yLabels={students}

      cellRender={(x, y, value) => (

        <div title={`${students[y]} - ${concepts[x]}: ${value}%`}>

          {value}%

        </div>

      )}

      cellStyle={(x, y, value) => ({

        background: `rgba(16, 185, 129, ${value / 100})`,

        fontSize: '11px',

        color: value > 50 ? 'white' : 'black'

      })}

    />

  );

};
4. Momentum Distribution
Visualization: Pie chart showing distribution of momentum tiers

Spark: Students with 1-2 day streaks
Aura: Students with 3-5 day streaks
Crown: Students with 6+ day streaks

interface MomentumDistribution {

  tier: 'spark' | 'aura' | 'crown';

  count: number;

  percentage: number;

}

// SQL Query

SELECT 

  momentum_tier as tier,

  COUNT(*) as count,

  ROUND(COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER () * 100, 1) as percentage

FROM users

WHERE role = 'student'

  AND id IN (

    SELECT DISTINCT student_id 

    FROM challenges 

    WHERE concept_id IN (

      SELECT id FROM concepts WHERE teacher_id = $1

    )

  )

GROUP BY momentum_tier;

Component:

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = {

  spark: '#FCD34D',

  aura: '#8B5CF6',

  crown: '#EAB308'

};

const MomentumDistributionChart: React.FC<{ data: MomentumDistribution[] }> = ({ data }) => {

  return (

    <ResponsiveContainer width="100%" height={300}>

      <PieChart>

        <Pie

          data={data}

          dataKey="count"

          nameKey="tier"

          cx="50%"

          cy="50%"

          outerRadius={80}

          label={({ tier, percentage }) => `${tier}: ${percentage}%`}

        >

          {data.map((entry, index) => (

            <Cell key={`cell-${index}`} fill={COLORS[entry.tier]} />

          ))}

        </Pie>

        <Tooltip />

        <Legend />

      </PieChart>

    </ResponsiveContainer>

  );

};
5. Student Performance Table
Features:

Sortable columns
Filterable by momentum tier, accuracy range
Search by alias
Export to CSV

interface StudentPerformance {

  id: string;

  alias: string;

  momentumTier: 'spark' | 'aura' | 'crown';

  currentStreak: number;

  totalReviews: number;

  accuracy: number; // percentage

  averageRating: number; // 1-4 scale

  lastActive: string;

  conceptsMastered: number;

  totalConcepts: number;

}

// SQL Query

SELECT 

  u.id,

  u.alias,

  u.momentum_tier,

  u.current_streak,

  COUNT(ch.id) as total_reviews,

  ROUND(

    COUNT(CASE WHEN ch.state IN ('review', 'relearning') THEN 1 END)::DECIMAL / 

    NULLIF(COUNT(ch.id), 0) * 100,

    1

  ) as accuracy,

  u.last_activity_date as last_active,

  COUNT(CASE WHEN ch.state = 'review' AND ch.stability > 10 THEN 1 END) as concepts_mastered,

  COUNT(DISTINCT ch.concept_id) as total_concepts

FROM users u

LEFT JOIN challenges ch ON u.id = ch.student_id

WHERE u.role = 'student'

  AND ch.concept_id IN (

    SELECT id FROM concepts WHERE teacher_id = $1

  )

GROUP BY u.id, u.alias, u.momentum_tier, u.current_streak, u.last_activity_date

ORDER BY total_reviews DESC;

Component:

import { DataTable } from '@/components/ui/data-table';

import { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<StudentPerformance>[] = [

  {

    accessorKey: 'alias',

    header: 'Student',

    cell: ({ row }) => (

      <div className="flex items-center gap-2">

        <Avatar>

          <AvatarFallback>{row.original.alias[0]}</AvatarFallback>

        </Avatar>

        <span>{row.original.alias}</span>

      </div>

    )

  },

  {

    accessorKey: 'momentumTier',

    header: 'Momentum',

    cell: ({ row }) => {

      const tier = row.original.momentumTier;

      const emoji = { spark: '✨', aura: '🔮', crown: '👑' }[tier];

      return (

        <Badge variant={tier}>

          {emoji} {tier}

        </Badge>

      );

    }

  },

  {

    accessorKey: 'currentStreak',

    header: 'Streak',

    cell: ({ row }) => `${row.original.currentStreak} days`

  },

  {

    accessorKey: 'totalReviews',

    header: 'Reviews',

    sortingFn: 'basic'

  },

  {

    accessorKey: 'accuracy',

    header: 'Accuracy',

    cell: ({ row }) => (

      <div className="flex items-center gap-2">

        <Progress value={row.original.accuracy} className="w-16" />

        <span>{row.original.accuracy}%</span>

      </div>

    )

  },

  {

    accessorKey: 'conceptsMastered',

    header: 'Mastery',

    cell: ({ row }) => 

      `${row.original.conceptsMastered}/${row.original.totalConcepts}`

  },

  {

    accessorKey: 'lastActive',

    header: 'Last Active',

    cell: ({ row }) => formatDistanceToNow(new Date(row.original.lastActive))

  }

];

const StudentPerformanceTable: React.FC<{ data: StudentPerformance[] }> = ({ data }) => {

  return <DataTable columns={columns} data={data} />;

};
6. Struggling Students Alert
Criteria for "Struggling":

Accuracy < 60%
No activity in 3+ days
Momentum tier dropped recently
High lapse rate (>30%)

interface StrugglingStudent {

  id: string;

  alias: string;

  issues: string[];

  severity: 'low' | 'medium' | 'high';

  recommendedAction: string;

}

// SQL Query

WITH student_stats AS (

  SELECT 

    u.id,

    u.alias,

    u.last_activity_date,

    u.momentum_tier,

    COUNT(ch.id) as total_reviews,

    COUNT(CASE WHEN ch.state IN ('review', 'relearning') THEN 1 END)::DECIMAL / 

      NULLIF(COUNT(ch.id), 0) * 100 as accuracy,

    SUM(ch.lapses)::DECIMAL / NULLIF(COUNT(ch.id), 0) * 100 as lapse_rate

  FROM users u

  LEFT JOIN challenges ch ON u.id = ch.student_id

  WHERE u.role = 'student'

    AND ch.concept_id IN (

      SELECT id FROM concepts WHERE teacher_id = $1

    )

  GROUP BY u.id, u.alias, u.last_activity_date, u.momentum_tier

)

SELECT 

  id,

  alias,

  ARRAY_REMOVE(ARRAY[

    CASE WHEN accuracy < 60 THEN 'Low accuracy' END,

    CASE WHEN CURRENT_DATE - last_activity_date > 3 THEN 'Inactive' END,

    CASE WHEN lapse_rate > 30 THEN 'High lapse rate' END,

    CASE WHEN momentum_tier = 'spark' AND total_reviews > 10 THEN 'Struggling with consistency' END

  ], NULL) as issues,

  CASE 

    WHEN CURRENT_DATE - last_activity_date > 7 THEN 'high'

    WHEN accuracy < 50 OR lapse_rate > 40 THEN 'high'

    WHEN accuracy < 60 OR lapse_rate > 30 THEN 'medium'

    ELSE 'low'

  END as severity

FROM student_stats

WHERE accuracy < 60 

   OR CURRENT_DATE - last_activity_date > 3

   OR lapse_rate > 30

ORDER BY severity DESC, accuracy ASC;

Component:

const StrugglingStudentsList: React.FC<{ students: StrugglingStudent[] }> = ({ students }) => {

  const severityColors = {

    high: 'destructive',

    medium: 'warning',

    low: 'secondary'

  };

  

  return (

    <Card>

      <CardHeader>

        <CardTitle>Students Needing Attention</CardTitle>

      </CardHeader>

      <CardContent>

        <div className="space-y-4">

          {students.map(student => (

            <Alert key={student.id} variant={severityColors[student.severity]}>

              <AlertCircle className="h-4 w-4" />

              <AlertTitle>{student.alias}</AlertTitle>

              <AlertDescription>

                <ul className="list-disc list-inside">

                  {student.issues.map((issue, i) => (

                    <li key={i}>{issue}</li>

                  ))}

                </ul>

                <p className="mt-2 font-semibold">

                  Recommended: {student.recommendedAction}

                </p>

              </AlertDescription>

            </Alert>

          ))}

        </div>

      </CardContent>

    </Card>

  );

};
7. Top Performers Leaderboard
interface TopPerformer {

  rank: number;

  alias: string;

  totalPoints: number;

  momentumTier: 'spark' | 'aura' | 'crown';

  currentStreak: number;

  masteryRate: number;

}

// SQL Query

SELECT 

  ROW_NUMBER() OVER (ORDER BY u.total_points DESC) as rank,

  u.alias,

  u.total_points,

  u.momentum_tier,

  u.current_streak,

  ROUND(

    COUNT(CASE WHEN ch.state = 'review' AND ch.stability > 10 THEN 1 END)::DECIMAL / 

    NULLIF(COUNT(DISTINCT ch.concept_id), 0) * 100,

    1

  ) as mastery_rate

FROM users u

LEFT JOIN challenges ch ON u.id = ch.student_id

WHERE u.role = 'student'

  AND ch.concept_id IN (

    SELECT id FROM concepts WHERE teacher_id = $1

  )

GROUP BY u.id, u.alias, u.total_points, u.momentum_tier, u.current_streak

ORDER BY u.total_points DESC

LIMIT 10;


🔍 Advanced Analytics Features
1. Concept Difficulty Analysis
Identify concepts that students struggle with most:

interface ConceptDifficulty {

  conceptId: string;

  title: string;

  averageDifficulty: number;

  averageLapses: number;

  completionRate: number;

  recommendedAdjustment: 'easier' | 'harder' | 'optimal';

}

// SQL Query

SELECT 

  c.id as concept_id,

  c.title,

  ROUND(AVG(ch.difficulty), 2) as average_difficulty,

  ROUND(AVG(ch.lapses), 1) as average_lapses,

  ROUND(

    COUNT(CASE WHEN ch.state = 'review' THEN 1 END)::DECIMAL / 

    COUNT(*) * 100,

    1

  ) as completion_rate,

  CASE 

    WHEN AVG(ch.difficulty) > 0.7 AND AVG(ch.lapses) > 3 THEN 'easier'

    WHEN AVG(ch.difficulty) < 0.3 AND AVG(ch.lapses) < 1 THEN 'harder'

    ELSE 'optimal'

  END as recommended_adjustment

FROM concepts c

JOIN challenges ch ON c.id = ch.concept_id

WHERE c.teacher_id = $1

GROUP BY c.id, c.title

ORDER BY average_lapses DESC;
2. Learning Velocity Tracking
Track how quickly students progress through concepts:

interface LearningVelocity {

  studentId: string;

  alias: string;

  conceptsPerWeek: number;

  averageTimeToMastery: number; // days

  trend: 'accelerating' | 'steady' | 'slowing';

}

// SQL Query

WITH mastery_timeline AS (

  SELECT 

    student_id,

    concept_id,

    MIN(created_at) as started_at,

    MIN(CASE WHEN state = 'review' AND stability > 10 THEN last_review_at END) as mastered_at

  FROM challenges

  WHERE concept_id IN (

    SELECT id FROM concepts WHERE teacher_id = $1

  )

  GROUP BY student_id, concept_id

)

SELECT 

  u.id as student_id,

  u.alias,

  COUNT(mt.concept_id) / 

    NULLIF(EXTRACT(WEEK FROM AGE(MAX(mt.mastered_at), MIN(mt.started_at))), 0) as concepts_per_week,

  ROUND(AVG(EXTRACT(DAY FROM AGE(mt.mastered_at, mt.started_at))), 1) as avg_time_to_mastery

FROM users u

JOIN mastery_timeline mt ON u.id = mt.student_id

WHERE mt.mastered_at IS NOT NULL

GROUP BY u.id, u.alias;
3. Retention Curves
Visualize long-term retention using FSRS data:

interface RetentionData {

  daysAfterLearning: number;

  retentionRate: number;

  sampleSize: number;

}

// SQL Query

WITH review_intervals AS (

  SELECT 

    student_id,

    concept_id,

    EXTRACT(DAY FROM AGE(last_review_at, created_at)) as days_since_start,

    CASE WHEN state IN ('review', 'relearning') THEN 1 ELSE 0 END as retained

  FROM challenges

  WHERE concept_id IN (

    SELECT id FROM concepts WHERE teacher_id = $1

  )

  AND last_review_at IS NOT NULL

)

SELECT 

  FLOOR(days_since_start / 7) * 7 as days_after_learning,

  ROUND(AVG(retained) * 100, 1) as retention_rate,

  COUNT(*) as sample_size

FROM review_intervals

GROUP BY FLOOR(days_since_start / 7)

ORDER BY days_after_learning;


📤 Export & Reporting
CSV Export
async function exportAnalytics(

  teacherId: string,

  dateRange: { start: Date; end: Date }

): Promise<Blob> {

  const data = await fetchAnalyticsData(teacherId, dateRange);

  

  const csv = [

    // Headers

    ['Student', 'Streak', 'Reviews', 'Accuracy', 'Mastery', 'Last Active'].join(','),

    // Data rows

    ...data.map(row => [

      row.alias,

      row.currentStreak,

      row.totalReviews,

      `${row.accuracy}%`,

      `${row.conceptsMastered}/${row.totalConcepts}`,

      row.lastActive

    ].join(','))

  ].join('\n');

  

  return new Blob([csv], { type: 'text/csv' });

}
PDF Report Generation
import jsPDF from 'jspdf';

import autoTable from 'jspdf-autotable';

async function generatePDFReport(

  teacherId: string,

  dateRange: { start: Date; end: Date }

): Promise<Blob> {

  const doc = new jsPDF();

  const data = await fetchAnalyticsData(teacherId, dateRange);

  

  // Title

  doc.setFontSize(20);

  doc.text('Student Analytics Report', 14, 20);

  

  // Date range

  doc.setFontSize(12);

  doc.text(

    `Period: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`,

    14,

    30

  );

  

  // Summary statistics

  doc.text('Summary', 14, 45);

  doc.setFontSize(10);

  doc.text(`Total Students: ${data.length}`, 14, 52);

  doc.text(`Average Reviews: ${calculateAverage(data, 'totalReviews')}`, 14, 58);

  doc.text(`Average Accuracy: ${calculateAverage(data, 'accuracy')}%`, 14, 64);

  

  // Student table

  autoTable(doc, {

    startY: 75,

    head: [['Student', 'Streak', 'Reviews', 'Accuracy', 'Mastery']],

    body: data.map(row => [

      row.alias,

      `${row.currentStreak} days`,

      row.totalReviews,

      `${row.accuracy}%`,

      `${row.conceptsMastered}/${row.totalConcepts}`

    ])

  });

  

  return doc.output('blob');

}


🔔 Real-Time Updates
Supabase Realtime Subscriptions
function useRealtimeAnalytics(teacherId: string) {

  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);

  

  useEffect(() => {

    // Subscribe to challenge updates

    const subscription = supabase

      .channel('analytics-updates')

      .on(

        'postgres_changes',

        {

          event: '*',

          schema: 'public',

          table: 'challenges',

          filter: `concept_id=in.(${getTeacherConceptIds(teacherId)})`

        },

        (payload) => {

          // Refresh metrics when challenges are updated

          refreshMetrics();

        }

      )

      .subscribe();

    

    return () => {

      subscription.unsubscribe();

    };

  }, [teacherId]);

  

  return metrics;

}


🎨 UI Components Library
Analytics Card Component
interface AnalyticsCardProps {

  title: string;

  value: string | number;

  change?: number;

  icon: React.ReactNode;

  trend?: 'up' | 'down' | 'neutral';

}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({

  title,

  value,

  change,

  icon,

  trend

}) => {

  const trendColor = {

    up: 'text-green-600',

    down: 'text-red-600',

    neutral: 'text-gray-600'

  }[trend || 'neutral'];

  

  return (

    <Card>

      <CardHeader className="flex flex-row items-center justify-between pb-2">

        <CardTitle className="text-sm font-medium">{title}</CardTitle>

        {icon}

      </CardHeader>

      <CardContent>

        <div className="text-2xl font-bold">{value}</div>

        {change !== undefined && (

          <p className={`text-xs ${trendColor} flex items-center gap-1`}>

            {trend === 'up' && <TrendingUp className="w-4 h-4" />}

            {trend === 'down' && <TrendingDown className="w-4 h-4" />}

            {change > 0 ? '+' : ''}{change}% from last period

          </p>

        )}

      </CardContent>

    </Card>

  );

};


🧪 Testing Analytics
describe('Teacher Analytics', () => {

  it('should calculate student accuracy correctly', () => {

    const challenges = [

      { state: 'review', lapses: 0 },

      { state: 'review', lapses: 1 },

      { state: 'learning', lapses: 2 }

    ];

    

    const accuracy = calculateAccuracy(challenges);

    expect(accuracy).toBe(66.7); // 2 out of 3 in review state

  });

  

  it('should identify struggling students', () => {

    const students = [

      { alias: 'Student1', accuracy: 45, lastActive: '2024-01-01' },

      { alias: 'Student2', accuracy: 85, lastActive: '2024-01-15' }

    ];

    

    const struggling = identifyStrugglingStudents(students);

    expect(struggling).toHaveLength(1);

    expect(struggling[0].alias).toBe('Student1');

  });

});


📊 Performance Optimization
Data Caching Strategy
// Cache analytics data for 5 minutes

const CACHE_TTL = 5 * 60 * 1000;

const analyticsCache = new Map<string, {

  data: any;

  timestamp: number;

}>();

async function getCachedAnalytics(

  teacherId: string,

  forceRefresh: boolean = false

): Promise<AnalyticsData> {

  const cacheKey = `analytics-${teacherId}`;

  const cached = analyticsCache.get(cacheKey);

  

  if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL) {

    return cached.data;

  }

  

  const data = await fetchAnalyticsData(teacherId);

  analyticsCache.set(cacheKey, {

    data,

    timestamp: Date.now()

  });

  

  return data;

}
Pagination for Large Datasets
interface PaginatedAnalytics {

  data: StudentPerformance[];

  page: number;

  pageSize: number;

  totalCount: number;

  totalPages: number;

}

async function getPaginatedStudentPerformance(

  teacherId: string,

  page: number = 1,

  pageSize: number = 20

): Promise<PaginatedAnalytics> {

  const offset = (page - 1) * pageSize;

  

  const { data, count } = await supabase

    .from('student_performance_view')

    .select('*', { count: 'exact' })

    .eq('teacher_id', teacherId)

    .range(offset, offset + pageSize - 1);

  

  return {

    data: data || [],

    page,

    pageSize,

    totalCount: count || 0,

    totalPages: Math.ceil((count || 0) / pageSize)

  };

}



This comprehensive analytics dashboard provides teachers with actionable insights while maintaining student privacy through COPPA-compliant aliases. The real-time updates and exportable reports make it a powerful tool for data-driven instruction.

