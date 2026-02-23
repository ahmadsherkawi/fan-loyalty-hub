// Attend Match Modal - AI-powered match attendance planning
// Shows tickets, transportation, weather, and personalized tips

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import type { FootballMatch } from '@/types/database';
import {
  X,
  Ticket,
  Plane,
  Train,
  Car,
  MapPin,
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  Loader2,
  ExternalLink,
  Lightbulb,
  Clock,
  Utensils,
  Users,
  Shield,
  CheckCircle,
  AlertCircle,
  Thermometer,
  Wind,
  Umbrella,
  Share2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AttendMatchModalProps {
  match: FootballMatch;
  isOpen: boolean;
  onClose: () => void;
  userLocation?: { city: string; country: string };
  onShareSuccess?: () => void;
  clubId?: string; // Current club/community context for posting
}

interface AttendMatchData {
  tickets: {
    ticketmaster: Array<{
      id: string;
      name: string;
      url: string;
      date: string;
      time: string;
      venue: string;
      minPrice: number | null;
      maxPrice: number | null;
      currency: string;
      status: string;
    }>;
    alternativeSources: Array<{
      name: string;
      url: string;
    }>;
  };
  transportation: {
    flights: string;
    trains: string;
    driving: string;
    localTransport: string;
  };
  weather: {
    temperature: number | null;
    condition: string;
    description: string;
    recommendation: string;
  } | null;
  aiTips: {
    arrival: string;
    parking: string;
    food: string;
    atmosphere: string;
    safety: string;
  };
}

export function AttendMatchModal({ match, isOpen, onClose, userLocation, onShareSuccess, clubId }: AttendMatchModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AttendMatchData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const fetchAttendMatchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('[AttendMatch] Fetching data for:', match.homeTeam.name, 'vs', match.awayTeam.name);

      // Call Supabase Edge Function
      const { data: result, error: fnError } = await supabase.functions.invoke('attend-match', {
        body: {
          match: {
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            venue: match.venue?.name || match.homeTeam.name + ' Stadium',
            city: match.venue?.city || 'Unknown',
            country: match.league?.country || 'Unknown',
            date: match.datetime,
            time: new Date(match.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            league: match.league?.name || '',
          },
          userLocation,
        },
      });

      if (fnError) {
        console.error('[AttendMatch] Function error:', fnError);
        setError(fnError.message || 'Failed to fetch data');
        return;
      }

      if (result?.success && result?.data) {
        console.log('[AttendMatch] Data received:', result.data);
        setData(result.data);
      } else {
        setError(result?.error || 'Failed to fetch data');
      }
    } catch (err) {
      console.error('[AttendMatch] Error:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [match, userLocation]);

  useEffect(() => {
    if (isOpen && match) {
      fetchAttendMatchData();
    }
  }, [isOpen, match, fetchAttendMatchData]);

  const getWeatherIcon = (condition: string) => {
    const lower = condition.toLowerCase();
    if (lower.includes('rain') || lower.includes('drizzle')) return <CloudRain className="h-8 w-8 text-blue-400" />;
    if (lower.includes('snow')) return <CloudSnow className="h-8 w-8 text-blue-200" />;
    if (lower.includes('clear') || lower.includes('sun')) return <Sun className="h-8 w-8 text-yellow-400" />;
    if (lower.includes('cloud')) return <Cloud className="h-8 w-8 text-gray-400" />;
    if (lower.includes('storm') || lower.includes('thunder')) return <CloudRain className="h-8 w-8 text-purple-400" />;
    return <Cloud className="h-8 w-8 text-gray-400" />;
  };

  const formatPrice = (price: number | null, currency: string) => {
    if (price === null) return 'TBD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getMatchDateInfo = () => {
    const date = new Date(match.datetime);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateStr = date.toDateString() === today.toDateString() ? 'Today' :
                    date.toDateString() === tomorrow.toDateString() ? 'Tomorrow' :
                    date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return { dateStr, timeStr };
  };

  const handleShareAttendance = async () => {
    if (!profile) {
      toast.error('Please sign in to share your attendance');
      return;
    }

    setSharing(true);
    try {
      let membership = null;
      let communityMembership = null;

      // If clubId is provided, check membership for that specific club
      if (clubId) {
        // Check for fan membership first
        const { data: fanMember } = await supabase
          .from('fan_memberships')
          .select('id, club_id')
          .eq('fan_id', profile.id)
          .eq('club_id', clubId)
          .maybeSingle();
        
        if (fanMember) {
          membership = fanMember;
        } else {
          // Check for community membership
          const { data: commMember } = await supabase
            .from('community_memberships')
            .select('club_id')
            .eq('fan_id', profile.id)
            .eq('club_id', clubId)
            .maybeSingle();
          communityMembership = commMember;
        }
      } else {
        // No clubId provided, check for any membership
        const { data: fanMember } = await supabase
          .from('fan_memberships')
          .select('id, club_id')
          .eq('fan_id', profile.id)
          .limit(1)
          .maybeSingle();
        
        if (fanMember) {
          membership = fanMember;
        } else {
          const { data: commMember } = await supabase
            .from('community_memberships')
            .select('club_id')
            .eq('fan_id', profile.id)
            .limit(1)
            .maybeSingle();
          communityMembership = commMember;
        }
      }

      if (!membership && !communityMembership) {
        toast.error('You need to join a club or community first');
        return;
      }

      // Create match attendance post
      const clubIdToUse = membership?.club_id || communityMembership?.club_id;
      const matchData = {
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        homeTeamLogo: match.homeTeam.logo,
        awayTeamLogo: match.awayTeam.logo,
        matchDate: match.datetime,
        venue: match.venue?.name,
        city: match.venue?.city,
        league: match.league?.name,
        matchId: match.id,
        clubId: clubIdToUse,
      };

      // Build RPC params based on membership type
      const rpcParams: Record<string, unknown> = {
        p_content: `I'm going to this match! Who's joining? 🎉`,
        p_image_url: null,
        p_post_type: 'match_attendance',
        p_match_data: matchData,
      };

      if (membership) {
        // Official club membership
        rpcParams.p_membership_id = membership.id;
        rpcParams.p_community_club_id = null;
      } else if (communityMembership) {
        // Community membership
        rpcParams.p_membership_id = null;
        rpcParams.p_community_club_id = communityMembership.club_id;
      }

      const { data, error } = await supabase.rpc('create_chant', rpcParams);

      if (error) {
        console.error('[Share] Error:', error);
        toast.error('Failed to share. Please try again.');
        return;
      }

      toast.success('Shared! Other fans can now see you\'re attending 🎉');
      
      if (onShareSuccess) {
        onShareSuccess();
      }
      
      onClose();
    } catch (err) {
      console.error('[Share] Error:', err);
      toast.error('Something went wrong');
    } finally {
      setSharing(false);
    }
  };

  if (!isOpen) return null;

  const { dateStr, timeStr } = getMatchDateInfo();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-card rounded-2xl border border-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Ticket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Attend Match</h2>
                <p className="text-sm text-muted-foreground">
                  {match.homeTeam.name} vs {match.awayTeam.name}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Match Info Bar */}
          <div className="flex items-center gap-3 mt-3 text-sm">
            <Badge variant="outline" className="gap-1.5">
              <Clock className="h-3 w-3" />
              {dateStr} at {timeStr}
            </Badge>
            {match.venue?.name && (
              <Badge variant="outline" className="gap-1.5">
                <MapPin className="h-3 w-3" />
                {match.venue.city || match.venue.name}
              </Badge>
            )}
            {match.league?.name && (
              <Badge variant="secondary" className="text-xs">
                {match.league.name}
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 overflow-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">AI is searching for the best options...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <AlertCircle className="h-10 w-10 text-destructive mb-4" />
              <p className="text-destructive">{error}</p>
              <Button variant="outline" className="mt-4" onClick={fetchAttendMatchData}>
                Try Again
              </Button>
            </div>
          ) : data ? (
            <div className="p-4 space-y-4">
              <Tabs defaultValue="tickets" className="w-full">
                <TabsList className="w-full h-10 bg-muted/30 grid grid-cols-4">
                  <TabsTrigger value="tickets" className="h-8 text-xs">
                    <Ticket className="h-3 w-3 mr-1" />
                    Tickets
                  </TabsTrigger>
                  <TabsTrigger value="transport" className="h-8 text-xs">
                    <Car className="h-3 w-3 mr-1" />
                    Travel
                  </TabsTrigger>
                  <TabsTrigger value="weather" className="h-8 text-xs">
                    <Cloud className="h-3 w-3 mr-1" />
                    Weather
                  </TabsTrigger>
                  <TabsTrigger value="tips" className="h-8 text-xs">
                    <Lightbulb className="h-3 w-3 mr-1" />
                    Tips
                  </TabsTrigger>
                </TabsList>

                {/* Tickets Tab */}
                <TabsContent value="tickets" className="mt-4 space-y-3">
                  {/* Ticketmaster Results */}
                  {data.tickets.ticketmaster.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Available on Ticketmaster
                      </h4>
                      {data.tickets.ticketmaster.map((ticket) => (
                        <a
                          key={ticket.id}
                          href={ticket.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-border/50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{ticket.name}</p>
                              <p className="text-xs text-muted-foreground">{ticket.venue}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-[10px]">
                                  {ticket.date}
                                </Badge>
                                {ticket.time && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {ticket.time}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-primary">
                                {formatPrice(ticket.minPrice, ticket.currency)}
                              </p>
                              {ticket.maxPrice && ticket.maxPrice !== ticket.minPrice && (
                                <p className="text-[10px] text-muted-foreground">
                                  - {formatPrice(ticket.maxPrice, ticket.currency)}
                                </p>
                              )}
                              <ExternalLink className="h-4 w-4 text-muted-foreground mt-1" />
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Alternative Sources */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {data.tickets.ticketmaster.length > 0 ? 'Also check:' : 'Find tickets on:'}
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {data.tickets.alternativeSources.map((source) => (
                        <a
                          key={source.name}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-border/50"
                        >
                          <span className="text-sm font-medium">{source.name}</span>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Tip */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      💡 <strong>Tip:</strong> Compare prices across multiple platforms. Official club tickets are usually cheapest but sell fast. Resale platforms offer last-minute options.
                    </p>
                  </div>
                </TabsContent>

                {/* Transport Tab */}
                <TabsContent value="transport" className="mt-4 space-y-3">
                  <div className="grid gap-2">
                    <a
                      href={data.transportation.flights}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-border/50"
                    >
                      <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <Plane className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">Find Flights</p>
                        <p className="text-xs text-muted-foreground">Search Skyscanner for the best deals</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>

                    <a
                      href={data.transportation.trains}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-border/50"
                    >
                      <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                        <Train className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">Train Connections</p>
                        <p className="text-xs text-muted-foreground">Search for train routes</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>

                    <a
                      href={data.transportation.driving}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-border/50"
                    >
                      <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                        <Car className="h-5 w-5 text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">Driving Directions</p>
                        <p className="text-xs text-muted-foreground">Get directions via Google Maps</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>

                    <a
                      href={data.transportation.localTransport}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-border/50"
                    >
                      <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">Local Transport</p>
                        <p className="text-xs text-muted-foreground">Public transport options</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                  </div>
                </TabsContent>

                {/* Weather Tab */}
                <TabsContent value="weather" className="mt-4">
                  {data.weather ? (
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                        <div className="flex items-center gap-4">
                          {getWeatherIcon(data.weather.condition)}
                          <div className="flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-bold">{data.weather.temperature}°C</span>
                              <span className="text-muted-foreground">{data.weather.condition}</span>
                            </div>
                            <p className="text-sm text-muted-foreground capitalize">
                              {data.weather.description}
                            </p>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                        <div className="flex items-start gap-2">
                          <Thermometer className="h-4 w-4 text-primary mt-0.5" />
                          <p className="text-sm">{data.weather.recommendation}</p>
                        </div>
                      </div>

                      {/* Weather Quick Tips */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                          <div className="flex items-center gap-2 mb-1">
                            <Umbrella className="h-4 w-4 text-blue-400" />
                            <span className="text-xs font-medium">Rain Gear</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {data.weather.condition.toLowerCase().includes('rain')
                              ? 'Essential - bring umbrella or poncho'
                              : 'Not needed based on forecast'}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                          <div className="flex items-center gap-2 mb-1">
                            <Wind className="h-4 w-4 text-cyan-400" />
                            <span className="text-xs font-medium">Wind</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Stadium may be windy - dress in layers
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Cloud className="h-10 w-10 text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">Weather data unavailable</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Check your weather app closer to match day
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Tips Tab */}
                <TabsContent value="tips" className="mt-4 space-y-2">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                    <Clock className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Arrival</p>
                      <p className="text-sm text-muted-foreground">{data.aiTips.arrival}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                    <Car className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Parking & Transport</p>
                      <p className="text-sm text-muted-foreground">{data.aiTips.parking}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                    <Utensils className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Food & Drinks</p>
                      <p className="text-sm text-muted-foreground">{data.aiTips.food}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                    <Users className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Atmosphere</p>
                      <p className="text-sm text-muted-foreground">{data.aiTips.atmosphere}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                    <Shield className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Safety</p>
                      <p className="text-sm text-muted-foreground">{data.aiTips.safety}</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Powered by AI • Links open in new tabs
            </p>
            <div className="flex items-center gap-2">
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleShareAttendance}
                disabled={sharing || loading}
                className="gap-1.5"
              >
                {sharing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
                Share with Fans
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
