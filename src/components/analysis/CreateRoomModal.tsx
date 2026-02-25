import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { createAnalysisRoom } from '@/lib/analysisApi';
import { useToast } from '@/hooks/use-toast';

interface CreateRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRoomModal({ open, onOpenChange }: CreateRoomModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [matchDate, setMatchDate] = useState<Date>();
  const [matchTime, setMatchTime] = useState('15:00');
  const [leagueName, setLeagueName] = useState('');
  const [venue, setVenue] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!homeTeam.trim() || !awayTeam.trim()) {
      toast({
        title: 'Missing teams',
        description: 'Please enter both home and away teams',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const matchDatetime = matchDate
        ? `${format(matchDate, 'yyyy-MM-dd')}T${matchTime}:00`
        : undefined;

      const room = await createAnalysisRoom({
        home_team: homeTeam.trim(),
        away_team: awayTeam.trim(),
        match_datetime: matchDatetime,
        league_name: leagueName.trim() || undefined,
        venue: venue.trim() || undefined,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
      });

      toast({
        title: 'Room created!',
        description: `Analysis room for ${homeTeam} vs ${awayTeam} is ready.`,
      });

      onOpenChange(false);
      navigate(`/fan/analysis/${room.id}`);
    } catch (error) {
      console.error('Error creating room:', error);
      toast({
        title: 'Failed to create room',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setHomeTeam('');
    setAwayTeam('');
    setMatchDate(undefined);
    setMatchTime('15:00');
    setLeagueName('');
    setVenue('');
    setTitle('');
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Analysis Room</DialogTitle>
          <DialogDescription>
            Start a new AI-powered analysis room for a football match. Fans can join and discuss with our AI analyst Alex.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Teams */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="homeTeam">Home Team *</Label>
              <Input
                id="homeTeam"
                placeholder="e.g., Manchester City"
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="awayTeam">Away Team *</Label>
              <Input
                id="awayTeam"
                placeholder="e.g., Liverpool"
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Match Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !matchDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {matchDate ? format(matchDate, 'PPP') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={matchDate}
                    onSelect={setMatchDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="matchTime">Kick-off Time</Label>
              <Input
                id="matchTime"
                type="time"
                value={matchTime}
                onChange={(e) => setMatchTime(e.target.value)}
              />
            </div>
          </div>

          {/* League & Venue */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="league">Competition</Label>
              <Input
                id="league"
                placeholder="e.g., Premier League"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue">Venue</Label>
              <Input
                id="venue"
                placeholder="e.g., Etihad Stadium"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
              />
            </div>
          </div>

          {/* Optional Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Room Title (Optional)</Label>
            <Input
              id="title"
              placeholder="Custom title for the room"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="What aspects of the match would you like to analyze?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Room
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
