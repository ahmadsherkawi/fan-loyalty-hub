// AI Match Prediction Card Component
// Displays AI-generated predictions for upcoming matches

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Clock, MapPin, Loader2, Sparkles, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SpotlightCard, AnimatedBorderCard } from '@/components/design-system';
import type { FootballMatch, MatchPrediction, TeamForm } from '@/types/football';
import { footballApi } from '@/lib/footballApi';
import { generatePrediction } from '@/lib/aiService';

interface AIPredictionCardProps {
  match: FootballMatch;
  homeTeamId?: string;
  awayTeamId?: string;
  onPredictionMade?: (prediction: MatchPrediction) => void;
}

const IMPACT_ICONS = {
  positive: <TrendingUp className="h-3.5 w-3.5 text-green-400" />,
  negative: <TrendingDown className="h-3.5 w-3.5 text-red-400" />,
  neutral: <Minus className="h-3.5 w-3.5 text-muted-foreground" />,
};

export function AIPredictionCard({
  match,
  homeTeamId,
  awayTeamId,
  onPredictionMade,
}: AIPredictionCardProps) {
  const [prediction, setPrediction] = useState<MatchPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [homeForm, setHomeForm] = useState<TeamForm | null>(null);
  const [awayForm, setAwayForm] = useState<TeamForm | null>(null);

  // Fetch team form when team IDs are available
  useEffect(() => {
    const fetchForm = async () => {
      if (homeTeamId) {
        const form = await footballApi.getTeamForm(homeTeamId);
        setHomeForm(form);
      }
      if (awayTeamId) {
        const form = await footballApi.getTeamForm(awayTeamId);
        setAwayForm(form);
      }
    };
    fetchForm();
  }, [homeTeamId, awayTeamId]);

  const handleGeneratePrediction = async () => {
    setLoading(true);
    try {
      const pred = await generatePrediction({
        match,
        homeForm,
        awayForm,
      });
      setPrediction(pred);
      onPredictionMade?.(pred);
    } catch (error) {
      console.error('Prediction error:', error);
    } finally {
      setLoading(false);
    }
  };

  const matchDate = new Date(match.datetime);
  const isUpcoming = matchDate > new Date();
  const isLive = match.status === 'live';

  return (
    <SpotlightCard className="p-5" spotlightColor="hsl(var(--primary) / 0.08)">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">AI Prediction</span>
          </div>
          {isLive && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse">
              LIVE
            </Badge>
          )}
          {!isLive && isUpcoming && (
            <Badge variant="outline" className="text-xs">
              {matchDate.toLocaleDateString()} {matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Badge>
          )}
        </div>

        {/* Match Display */}
        <div className="flex items-center justify-between gap-4">
          {/* Home Team */}
          <div className="flex-1 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-muted/30 flex items-center justify-center overflow-hidden">
              {match.homeTeam.logo ? (
                <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="w-full h-full object-contain" />
              ) : (
                <span className="text-lg font-bold text-muted-foreground">
                  {match.homeTeam.name.charAt(0)}
                </span>
              )}
            </div>
            <p className="font-semibold text-sm truncate">{match.homeTeam.name}</p>
            {homeForm && (
              <p className="text-xs text-muted-foreground">Form: {homeForm.formScore}%</p>
            )}
          </div>

          {/* VS / Score */}
          <div className="flex flex-col items-center gap-1">
            {match.status === 'finished' || match.status === 'live' ? (
              <div className="text-2xl font-display font-bold">
                <span className={match.homeTeam.score! > match.awayTeam.score! ? 'text-green-400' : ''}>
                  {match.homeTeam.score}
                </span>
                <span className="mx-2 text-muted-foreground">-</span>
                <span className={match.awayTeam.score! > match.homeTeam.score! ? 'text-green-400' : ''}>
                  {match.awayTeam.score}
                </span>
              </div>
            ) : (
              <div className="text-lg font-bold text-muted-foreground">VS</div>
            )}
            <span className="text-[10px] text-muted-foreground">{match.league.name}</span>
          </div>

          {/* Away Team */}
          <div className="flex-1 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-muted/30 flex items-center justify-center overflow-hidden">
              {match.awayTeam.logo ? (
                <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="w-full h-full object-contain" />
              ) : (
                <span className="text-lg font-bold text-muted-foreground">
                  {match.awayTeam.name.charAt(0)}
                </span>
              )}
            </div>
            <p className="font-semibold text-sm truncate">{match.awayTeam.name}</p>
            {awayForm && (
              <p className="text-xs text-muted-foreground">Form: {awayForm.formScore}%</p>
            )}
          </div>
        </div>

        {/* Prediction Display */}
        <AnimatePresence mode="wait">
          {prediction ? (
            <motion.div
              key="prediction"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Probability Bars */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Win Probability</span>
                  <Badge variant="outline" className="text-[10px]">
                    {prediction.confidence}% confidence
                  </Badge>
                </div>
                
                {/* Home Win */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>{match.homeTeam.name}</span>
                    <span className="font-semibold text-green-400">{prediction.prediction.homeWin}%</span>
                  </div>
                  <Progress value={prediction.prediction.homeWin} className="h-2 bg-muted/30 [&>div]:bg-green-500" />
                </div>
                
                {/* Draw */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>Draw</span>
                    <span className="font-semibold text-yellow-400">{prediction.prediction.draw}%</span>
                  </div>
                  <Progress value={prediction.prediction.draw} className="h-2 bg-muted/30 [&>div]:bg-yellow-500" />
                </div>
                
                {/* Away Win */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>{match.awayTeam.name}</span>
                    <span className="font-semibold text-blue-400">{prediction.prediction.awayWin}%</span>
                  </div>
                  <Progress value={prediction.prediction.awayWin} className="h-2 bg-muted/30 [&>div]:bg-blue-500" />
                </div>
              </div>

              {/* Predicted Score */}
              <div className="flex items-center justify-center gap-3 py-2 px-4 rounded-xl bg-primary/10 border border-primary/20">
                <span className="text-xs text-muted-foreground">Predicted Score:</span>
                <span className="text-lg font-bold">
                  {prediction.predictedScore.home} - {prediction.predictedScore.away}
                </span>
              </div>

              {/* Factors */}
              {prediction.factors.length > 0 && (
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(!expanded)}
                    className="w-full justify-between text-xs h-8"
                  >
                    <span className="flex items-center gap-2">
                      <BarChart3 className="h-3 w-3" />
                      Analysis Factors
                    </span>
                    {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                  
                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-2 overflow-hidden"
                      >
                        {prediction.factors.map((factor, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 text-xs p-2 rounded-lg bg-muted/20"
                          >
                            {IMPACT_ICONS[factor.impact]}
                            <div>
                              <span className="font-medium capitalize">{factor.type}:</span>{' '}
                              <span className="text-muted-foreground">{factor.description}</span>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="generate"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Button
                onClick={handleGeneratePrediction}
                disabled={loading}
                variant="outline"
                className="w-full h-12 rounded-xl border-dashed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate AI Prediction
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Venue Info */}
        {match.venue.name && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/30">
            <MapPin className="h-3 w-3" />
            <span>{match.venue.name}{match.venue.city && `, ${match.venue.city}`}</span>
          </div>
        )}
      </div>
    </SpotlightCard>
  );
}

export default AIPredictionCard;
