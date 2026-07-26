export type SolutionAnalysis = {
  category: string;
  urgency: 'Low' | 'Medium' | 'High';
  urgencyScore: number;
  complexity: 'Simple' | 'Standard' | 'Complex';
  estimatedCost: string;
  estimatedTimeline: string;
  recommendedExperts: string[];
  recommendedBusinesses: string[];
  recommendedCommunities: string[];
  suggestedSolutions: string[];
};

export type MatchProfile = {
  id: string;
  name: string;
  type: 'Expert' | 'Business';
  category: string;
  rating: number;
  responseTime: string;
  trustScore: number;
  priceRange: string;
  reason: string;
};

export type CommunityChapter = {
  id: string;
  name: string;
  type: 'City' | 'Industry' | 'Business' | 'University';
  members: string;
  impact: string;
  nextAction: string;
  accent: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  electrician: 'Electrical & Power',
  plumber: 'Plumbing & Water',
  'generator-tech': 'Generator & Power Backup',
  tailor: 'Fashion & Tailoring',
  hairdresser: 'Beauty & Grooming',
  mechanic: 'Auto & Mechanics',
  'ac-tech': 'Cooling & AC',
  'phone-repair': 'Device Repair',
  caterer: 'Food & Catering',
  'event-planner': 'Events & Planning',
  photographer: 'Media & Photography',
  'makeup-artist': 'Beauty & Makeup',
  driver: 'Transport & Logistics',
  cleaner: 'Cleaning & Facility Care',
  bricklayer: 'Building & Construction',
  carpenter: 'Furniture & Carpentry',
  painter: 'Painting & Finishing',
  welder: 'Fabrication & Welding',
  tiler: 'Tiling & Interiors',
  tutor: 'Education & Tutoring',
  security: 'Security Services',
  laundry: 'Laundry & Garment Care',
  dj: 'Entertainment',
  dispatch: 'Dispatch & Delivery',
};

export const MVP_COMMUNITIES: CommunityChapter[] = [
  {
    id: 'lagos',
    name: 'Lagos Problem Solvers',
    type: 'City',
    members: '12.8k',
    impact: '438 problems solved this month',
    nextAction: 'Join chapter',
    accent: '#F97316',
  },
  {
    id: 'ibadan',
    name: 'Ibadan Business Helpdesk',
    type: 'Business',
    members: '5.4k',
    impact: '92 SME leads exchanged this week',
    nextAction: 'Invite a business',
    accent: '#2563EB',
  },
  {
    id: 'campus',
    name: 'University Skills Exchange',
    type: 'University',
    members: '8.1k',
    impact: '216 mentorship matches active',
    nextAction: 'Find mentors',
    accent: '#16A34A',
  },
  {
    id: 'startup',
    name: 'Startup & Funding Circle',
    type: 'Industry',
    members: '3.7k',
    impact: '37 pitch reviews completed',
    nextAction: 'Post challenge',
    accent: '#7C3AED',
  },
];

export function analyzeProblem(input: {
  title?: string;
  description?: string;
  category?: string;
  budget?: string;
}): SolutionAnalysis {
  const text = `${input.title || ''} ${input.description || ''}`.toLowerCase();
  const budget = Number.parseFloat(input.budget || '0');
  const urgentWords = ['urgent', 'emergency', 'today', 'now', 'broken', 'leak', 'fire', 'unsafe', 'stuck'];
  const complexityWords = ['install', 'build', 'renovate', 'multiple', 'business', 'company', 'system', 'event'];
  const urgencyScore = Math.min(98, 42 + urgentWords.filter((word) => text.includes(word)).length * 14 + (budget > 50000 ? 8 : 0));
  const urgency = urgencyScore >= 70 ? 'High' : urgencyScore >= 52 ? 'Medium' : 'Low';
  const complexityHits = complexityWords.filter((word) => text.includes(word)).length;
  const complexity = complexityHits >= 2 ? 'Complex' : complexityHits === 1 ? 'Standard' : 'Simple';
  const category = CATEGORY_LABELS[input.category || ''] || 'General Problem Solving';
  const baseline = budget > 0 ? budget : 15000;
  const low = Math.max(5000, Math.round(baseline * 0.85 / 1000) * 1000);
  const high = Math.max(low + 5000, Math.round(baseline * 1.35 / 1000) * 1000);

  return {
    category,
    urgency,
    urgencyScore,
    complexity,
    estimatedCost: `NGN ${low.toLocaleString()} - ${high.toLocaleString()}`,
    estimatedTimeline: urgency === 'High' ? 'Same day to 24 hours' : complexity === 'Complex' ? '3 - 7 days' : '24 - 72 hours',
    recommendedExperts: [`Verified ${category} expert`, 'High-response local specialist', 'Top-rated independent provider'],
    recommendedBusinesses: [`Verified ${category} business`, 'Nearby premium service provider', 'Fast-response local vendor'],
    recommendedCommunities: ['Local city chapter', `${category} discussion circle`, 'Trusted recommendations group'],
    suggestedSolutions: [
      'Confirm scope, location, and expected outcome.',
      'Request quotes from 2-3 verified providers.',
      'Use chat, booking, payment, and review to keep the work traceable.',
    ],
  };
}

export function getProblemMatches(category?: string): MatchProfile[] {
  const label = CATEGORY_LABELS[category || ''] || 'Solution';
  return [
    {
      id: 'expert-fast-response',
      name: `${label} Rapid Expert`,
      type: 'Expert',
      category: label,
      rating: 4.9,
      responseTime: '< 15 min',
      trustScore: 94,
      priceRange: 'Fair quote',
      reason: 'Best fit for fast diagnosis and direct execution.',
    },
    {
      id: 'business-verified',
      name: `Verified ${label} Business`,
      type: 'Business',
      category: label,
      rating: 4.7,
      responseTime: '< 30 min',
      trustScore: 91,
      priceRange: 'Standard package',
      reason: 'Strong choice for receipt-backed work and team availability.',
    },
    {
      id: 'community-referral',
      name: 'Community Recommended Solver',
      type: 'Expert',
      category: label,
      rating: 4.8,
      responseTime: '< 1 hour',
      trustScore: 88,
      priceRange: 'Negotiable',
      reason: 'Popular referral from local community members.',
    },
  ];
}

export function getReferralMessage(userName?: string) {
  return `${userName || 'I'} invited you to SolveConnect: post a problem, find trusted experts/businesses, and join a local solution community.`;
}
