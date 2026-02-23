// Attend Match Modal - AI-powered match attendance planning
// Shows tickets, transportation, weather, and personalized tips

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from 'lucide-react';

interface AttendMatchModalProps {
  match: FootballMatch;
  isOpen: boolean;
  onClose: () => void;
  userLocation?: { city: string; country: string };
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

export function AttendMatchModal({ match, isOpen, onClose, userLocation }: AttendMatchModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AttendMatchData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && match) {
      fetchAttendMatchData();
    }
  }, [isOpen, match]);

  const fetchAttendMatchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/attend-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match: {
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            venue: match.venue.name || match.homeTeam.name + ' Stadium',
            city: match.venue.city || 'Unknown',
            country: match.league.country || 'Unknown',
            date: match.datetime,
            time: new Date(match.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            league: match.league.name,
          },
          userLocation,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (condition: string) => {
    const lower = condition.toLowerCase();
    if (lower.includes('rain')) return <CloudRain className="h-8 w-8 text-blue-400" />;
    if (lower.includes('snow')) return <CloudSnow className="h-8 w-8 text-blue-200" />;
    if (lower.includes('clear') || lower.includes('sun')) return <Sun className="h-8 w-8 text-yellow-400" />;
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

  if (!isOpen) return null;

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
                  AI-powered planning for {match.homeTeam.name} vs {match.awayTeam.name}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 overflow-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
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
                      <Separator className="my-4" />
                      <p className="text-sm">{data.weather.recommendation}</p>
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
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
