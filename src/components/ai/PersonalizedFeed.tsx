// Personalized Recommendations Feed Component
// AI-powered personalized content for fans

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  TrendingUp, 
  Gift, 
  Users, 
  Music, 
  Trophy, 
  ChevronRight,
  Clock,
  Star,
  Zap,
  RefreshCw,
  Loader2,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { SpotlightCard, AnimatedBorderCard } from '@/components/design-system';
import type { PersonalizedRecommendation } from '@/types/football';
import { generateRecommendations } from '@/lib/aiService';

interface PersonalizedFeedProps {
  fanId: string;
  clubId: string;
  clubName: string;
  pointsBalance: number;
  tierName: string | null;
  upcomingMatches: Array<{
    id: string;
    homeTeam: { name: string };
    awayTeam: { name: string };
    datetime: string;
  }>;
  recentActivityTypes?: string[];
  unreadNotifications?: number;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  activity: { 
    icon: <Zap className="h-4 w-4" />, 
    color: 'text-primary',
    bg: 'bg-primary/15',
  },
  reward: { 
    icon: <Gift className="h-4 w-4" />, 
    color: 'text-accent',
    bg: 'bg-accent/15',
  },
  match: { 
    icon: <Trophy className="h-4 w-4" />, 
    color: 'text-green-400',
    bg: 'bg-green-500/15',
  },
  community: { 
    icon: <Users className="h-4 w-4" />, 
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
  },
  chant: { 
    icon: <Music className="h-4 w-4" />, 
    color: 'text-purple-400',
    bg: 'bg-purple-500/15',
  },
};

const PRIORITY_STYLES: Record<string, string> = {
  high: 'border-l-2 border-l-primary',
  medium: 'border-l-2 border-l-accent',
  low: 'border-l-2 border-l-muted-foreground/30',
};

export function PersonalizedFeed({
  fanId,
  clubId,
  clubName,
  pointsBalance,
  tierName,
  upcomingMatches,
  recentActivityTypes = [],
  unreadNotifications = 0,
}: PersonalizedFeedProps) {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<PersonalizedRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecommendations = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const recs = await generateRecommendations({
        fanId,
        clubId,
        clubName,
        pointsBalance,
        tierName,
        upcomingMatches: upcomingMatches.map(m => ({
          ...m,
          source: 'api-football' as const,
          homeTeam: { ...m.homeTeam, id: '', logo: null, score: null },
          awayTeam: { ...m.awayTeam, id: '', logo: null, score: null },
          league: { id: '', name: '', country: '', logo: null, season: new Date().getFullYear(), round: null },
          venue: { name: null, city: null },
          status: 'scheduled' as const,
          elapsed: null,
          events: [],
        })),
        recentActivityTypes,
        unreadNotifications,
      });

      // Sort by priority
      const sorted = recs.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      setRecommendations(sorted);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fanId, clubId, clubName, pointsBalance, tierName, upcomingMatches, recentActivityTypes, unreadNotifications]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleRefresh = () => {
    fetchRecommendations(true);
  };

  const handleAction = (rec: PersonalizedRecommendation) => {
    navigate(rec.actionUrl);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted/20 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/15 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">For You</h3>
            <p className="text-xs text-muted-foreground">AI-powered recommendations</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={refreshing}
          className="h-8 w-8 rounded-full"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Recommendations List */}
      <AnimatePresence mode="popLayout">
        {recommendations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No recommendations right now</p>
            <p className="text-xs text-muted-foreground mt-1">Check back later for personalized content</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec, index) => {
              const config = TYPE_CONFIG[rec.type] || TYPE_CONFIG.activity;
              
              return (
                <motion.div
                  key={`${rec.type}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <SpotlightCard
                    className={`p-4 cursor-pointer ${PRIORITY_STYLES[rec.priority]}`}
                    spotlightColor="hsl(var(--primary) / 0.05)"
                    onClick={() => handleAction(rec)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`h-10 w-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0 ${config.color}`}>
                        {config.icon}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold text-foreground text-sm truncate">
                            {rec.title}
                          </h4>
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] ${
                              rec.priority === 'high' ? 'border-primary text-primary' :
                              rec.priority === 'medium' ? 'border-accent text-accent' :
                              'border-muted-foreground/30 text-muted-foreground'
                            }`}
                          >
                            {rec.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {rec.description}
                        </p>
                        
                        {/* Reason */}
                        <div className="flex items-center gap-1 mt-2 text-[10px] text-primary/70">
                          <Sparkles className="h-3 w-3" />
                          <span className="italic">{rec.reason}</span>
                        </div>
                      </div>
                      
                      {/* Arrow */}
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                    
                    {/* Expiry */}
                    {rec.expiresAt && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2 pl-13">
                        <Clock className="h-3 w-3" />
                        <span>Expires {new Date(rec.expiresAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </SpotlightCard>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 pt-2">
        <div className="text-center p-3 rounded-xl bg-muted/20">
          <div className="text-lg font-bold text-primary">{pointsBalance}</div>
          <div className="text-[10px] text-muted-foreground">Points</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-muted/20">
          <div className="text-lg font-bold text-accent">{upcomingMatches.length}</div>
          <div className="text-[10px] text-muted-foreground">Upcoming</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-muted/20">
          <div className="text-lg font-bold text-green-400">{recommendations.length}</div>
          <div className="text-[10px] text-muted-foreground">Actions</div>
        </div>
      </div>
    </div>
  );
}

export default PersonalizedFeed;
