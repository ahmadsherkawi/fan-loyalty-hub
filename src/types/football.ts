// Football API Types for Phase 2 AI Features
// Uses API-Football ONLY

// ================= API-FOOTBALL TYPES =================

export interface ApiFootballLeague {
  id: number;
  name: string;
  type: string;
  logo: string;
  country: string;
  season: number;
}

export interface ApiFootballTeam {
  id: number;
  name: string;
  code: string | null;
  country: string;
  founded: number | null;
  national: boolean;
  logo: string;
}

export interface ApiFootballFixture {
  fixture: {
    id: number;
    referee: string | null;
    timezone: string;
    date: string;
    timestamp: number;
    periods: {
      first: number | null;
      second: number | null;
    };
    venue: {
      id: number | null;
      name: string | null;
      city: string | null;
    };
    status: {
      long: string;
      short: string;
      elapsed: number | null;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string | null;
    season: number;
    round: string;
  };
  teams: {
    home: ApiFootballTeamInfo;
    away: ApiFootballTeamInfo;
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
  events?: ApiFootballEvent[];
  lineups?: ApiFootballLineup[];
  statistics?: ApiFootballStatistics[];
}

export interface ApiFootballTeamInfo {
  id: number;
  name: string;
  logo: string;
  winner: boolean | null;
}

export interface ApiFootballEvent {
  time: {
    elapsed: number;
    extra: number | null;
  };
  team: {
    id: number;
    name: string;
    logo: string;
  };
  player: {
    id: number;
    name: string;
  };
  player_id: number;
  type: 'Goal' | 'Card' | 'subst' | 'Var';
  detail: string;
  comments: string | null;
}

export interface ApiFootballLineup {
  team: {
    id: number;
    name: string;
    logo: string;
  };
  formation: string;
  startXI: Array<{
    player: {
      id: number;
      name: string;
      number: number;
      pos: string;
      grid: string;
    };
  }>;
  substitutes: Array<{
    player: {
      id: number;
      name: string;
      number: number;
      pos: string;
      grid: string;
    };
  }>;
  coach: {
    id: number;
    name: string;
  };
}

export interface ApiFootballStatistics {
  team: {
    id: number;
    name: string;
    logo: string;
  };
  statistics: Array<{
    type: string;
    value: number | string | null;
  }>;
}

export interface ApiFootballStanding {
  rank: number;
  team: ApiFootballTeam;
  points: number;
  goalsDiff: number;
  group: string;
  form: string;
  status: string;
  description: string | null;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: {
      for: number;
      against: number;
    };
  };
  home: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: {
      for: number;
      against: number;
    };
  };
  away: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: {
      for: number;
      against: number;
    };
  };
  update: string;
}

export interface ApiFootballPlayer {
  id: number;
  name: string;
  firstname: string;
  lastname: string;
  age: number;
  birth: {
    date: string;
    place: string | null;
    country: string | null;
  };
  nationality: string;
  height: string | null;
  weight: string | null;
  injured: boolean;
  photo: string;
}

export interface ApiFootballTeamStatistics {
  team: ApiFootballTeam;
  statistics: {
    type: string;
    value: number | string | null;
  }[];
}

// ================= UNIFIED INTERNAL TYPES =================

export type MatchStatus = 
  | 'scheduled' 
  | 'live' 
  | 'finished' 
  | 'postponed' 
  | 'cancelled';

export interface FootballMatch {
  id: string;
  source: 'api-football';
  homeTeam: {
    id: string;
    name: string;
    logo: string | null;
    score: number | null;
  };
  awayTeam: {
    id: string;
    name: string;
    logo: string | null;
    score: number | null;
  };
  league: {
    id: string;
    name: string;
    country: string;
    logo: string | null;
    season: number;
    round: string | null;
  };
  venue: {
    name: string | null;
    city: string | null;
  };
  datetime: string;
  status: MatchStatus;
  elapsed: number | null; // minutes played if live
  events: MatchEvent[];
}

export interface MatchEvent {
  type: 'goal' | 'card' | 'substitution' | 'var' | 'other';
  minute: number;
  team: 'home' | 'away';
  player: string;
  detail?: string;
  assistedBy?: string;
}

export interface TeamStanding {
  rank: number;
  teamId: string;
  teamName: string;
  teamLogo: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string; // e.g., "W,D,W,L,W"
}

export interface TeamForm {
  teamId: string;
  teamName: string;
  lastMatches: Array<{
    opponent: string;
    home: boolean;
    result: 'W' | 'D' | 'L';
    goalsFor: number;
    goalsAgainst: number;
  }>;
  winStreak: number;
  unbeatenStreak: number;
  formScore: number; // 0-100
}

export interface PlayerInfo {
  id: string;
  name: string;
  photo: string | null;
  position: string;
  nationality: string;
  age: number;
}

// ================= AI PREDICTION TYPES =================

export interface MatchPrediction {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  prediction: {
    homeWin: number; // probability 0-100
    draw: number;
    awayWin: number;
  };
  predictedScore: {
    home: number;
    away: number;
  };
  confidence: number; // 0-100
  factors: {
    type: 'form' | 'home_advantage' | 'h2h' | 'standings' | 'motivation';
    description: string;
    impact: 'positive' | 'negative' | 'neutral';
  }[];
  keyPlayers: {
    home: PlayerInfo[];
    away: PlayerInfo[];
  };
  generatedAt: string;
}

// ================= AI CHANT CONTEXT TYPES =================

export interface ChantContext {
  type: 'match_day' | 'victory' | 'defeat' | 'player_praise' | 'team_spirit' | 'derby' | 'celebration';
  clubName: string;
  clubColors?: {
    primary: string;
    secondary: string;
  };
  opponent?: string;
  score?: {
    home: number;
    away: number;
  };
  players?: string[];
  stadium?: string;
  occasion?: string; // e.g., "Champions League Final", "Derby Day"
}

export interface GeneratedChant {
  content: string;
  mood: 'celebratory' | 'defiant' | 'supportive' | 'humorous' | 'passionate';
  suggestedHashtags: string[];
  createdAt: string;
}

// ================= RECOMMENDATION TYPES =================

export interface PersonalizedRecommendation {
  type: 'activity' | 'reward' | 'match' | 'community' | 'chant';
  title: string;
  description: string;
  reason: string; // AI explanation of why this is recommended
  priority: 'high' | 'medium' | 'low';
  actionUrl: string;
  imageUrl?: string;
  metadata: Record<string, unknown>;
  expiresAt?: string;
}

export interface FanInsights {
  engagementScore: number; // 0-100
  favoritePlayers: string[];
  preferredMatchTimes: string[]; // e.g., ["Saturday 15:00", "Sunday 17:30"]
  activityPreferences: string[];
  predictedNextActions: string[];
}
