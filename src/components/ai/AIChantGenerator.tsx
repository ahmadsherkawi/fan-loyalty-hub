// AI Chant Generator Component
// Allows fans to generate personalized chants using AI

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Copy, Share2, RefreshCw, Music, Users, Trophy, Heart, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { SpotlightCard, AnimatedBorderCard } from '@/components/design-system';
import { generateChant } from '@/lib/aiService';
import type { ChantContext, GeneratedChant } from '@/types/football';

interface AIChantGeneratorProps {
  clubName: string;
  clubColors?: { primary: string; secondary: string };
  opponent?: string;
  stadium?: string;
  onChantCreated?: (chant: GeneratedChant) => void;
}

const CHANT_TYPES: Array<{ type: ChantContext['type']; label: string; icon: React.ReactNode; description: string }> = [
  { type: 'match_day', label: 'Match Day', icon: <Zap className="h-4 w-4" />, description: 'Pre-match hype' },
  { type: 'victory', label: 'Victory', icon: <Trophy className="h-4 w-4" />, description: 'Celebrate a win' },
  { type: 'player_praise', label: 'Player', icon: <Users className="h-4 w-4" />, description: 'Honor a star' },
  { type: 'derby', label: 'Derby', icon: <Heart className="h-4 w-4" />, description: 'Rivalry match' },
  { type: 'team_spirit', label: 'Spirit', icon: <Music className="h-4 w-4" />, description: 'Club pride' },
];

const MOOD_COLORS: Record<string, string> = {
  celebratory: 'bg-green-500/20 text-green-400 border-green-500/30',
  defiant: 'bg-red-500/20 text-red-400 border-red-500/30',
  supportive: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  humorous: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  passionate: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

export function AIChantGenerator({
  clubName,
  clubColors,
  opponent,
  stadium,
  onChantCreated,
}: AIChantGeneratorProps) {
  const [selectedType, setSelectedType] = useState<ChantContext['type']>('match_day');
  const [playerName, setPlayerName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedChant, setGeneratedChant] = useState<GeneratedChant | null>(null);
  const [customContext, setCustomContext] = useState('');

  const handleGenerate = async () => {
    setGenerating(true);
    setGeneratedChant(null);

    try {
      const context: ChantContext = {
        type: selectedType,
        clubName,
        clubColors,
        opponent,
        stadium,
        players: playerName ? [playerName] : undefined,
        occasion: customContext || undefined,
      };

      // Use the aiService directly (works in any environment)
      const chant = await generateChant({ context });

      setGeneratedChant(chant);
      onChantCreated?.(chant);
    } catch (error) {
      console.error('Chant generation error:', error);
      toast.error('Failed to generate chant. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedChant) {
      const text = `${generatedChant.content}\n\n${generatedChant.suggestedHashtags.join(' ')}`;
      navigator.clipboard.writeText(text);
      toast.success('Chant copied to clipboard!');
    }
  };

  const handleShare = () => {
    if (generatedChant) {
      const text = `${generatedChant.content}\n\n${generatedChant.suggestedHashtags.join(' ')}`;
      if (navigator.share) {
        navigator.share({
          title: `${clubName} Chant`,
          text,
        });
      } else {
        handleCopy();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Chant Type Selection */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Chant Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {CHANT_TYPES.map((ct) => (
            <Button
              key={ct.type}
              variant={selectedType === ct.type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType(ct.type)}
              className={`h-auto py-3 flex flex-col gap-1 ${
                selectedType === ct.type 
                  ? 'gradient-stadium border-0' 
                  : 'bg-background/50'
              }`}
            >
              {ct.icon}
              <span className="text-xs">{ct.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Player Name (for player praise type) */}
      {selectedType === 'player_praise' && (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Player Name
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="e.g., Marcus Rashford"
            className="w-full px-4 py-2 rounded-xl bg-background/50 border border-border/40 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          />
        </div>
      )}

      {/* Custom Context */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Add Custom Context (Optional)
        </label>
        <Textarea
          value={customContext}
          onChange={(e) => setCustomContext(e.target.value)}
          placeholder="Add any special details, like 'Champions League final' or 'Last minute winner'..."
          className="min-h-[80px] bg-background/50 border-border/40"
        />
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full h-12 rounded-xl gradient-stadium text-white font-semibold"
      >
        {generating ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Generating Your Chant...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate AI Chant
          </>
        )}
      </Button>

      {/* Generated Chant Display */}
      <AnimatePresence mode="wait">
        {generatedChant && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <AnimatedBorderCard className="p-6">
              <div className="space-y-4">
                {/* Mood Badge */}
                <div className="flex items-center justify-between">
                  <Badge className={MOOD_COLORS[generatedChant.mood] || MOOD_COLORS.passionate}>
                    {generatedChant.mood}
                  </Badge>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3" />
                    AI Generated
                  </div>
                </div>

                {/* Chant Content */}
                <div className="bg-background/30 rounded-xl p-4 border border-border/20">
                  <p className="text-foreground whitespace-pre-line leading-relaxed text-lg font-medium">
                    {generatedChant.content}
                  </p>
                </div>

                {/* Hashtags */}
                {generatedChant.suggestedHashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {generatedChant.suggestedHashtags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="flex-1 rounded-xl"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                    className="flex-1 rounded-xl"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleGenerate}
                    className="flex-1 rounded-xl gradient-stadium"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate
                  </Button>
                </div>
              </div>
            </AnimatedBorderCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function buildPrompt(context: ChantContext, customContext?: string): string {
  let prompt = `Generate a ${context.type} football chant for ${context.clubName}`;
  
  if (context.clubColors) {
    prompt += ` (colors: ${context.clubColors.primary} and ${context.clubColors.secondary})`;
  }
  
  prompt += `\nType: ${context.type.replace('_', ' ')}`;
  
  if (context.opponent) {
    prompt += `\nOpponent: ${context.opponent}`;
  }
  
  if (context.players && context.players.length > 0) {
    prompt += `\nPlayer to praise: ${context.players.join(', ')}`;
  }
  
  if (context.stadium) {
    prompt += `\nStadium: ${context.stadium}`;
  }
  
  if (customContext) {
    prompt += `\n\nAdditional context: ${customContext}`;
  }
  
  return prompt;
}

export default AIChantGenerator;
