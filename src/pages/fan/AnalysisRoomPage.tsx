import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Send,
  Users,
  Bot,
  User,
  Sparkles,
  Clock,
  MapPin,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  getAnalysisRoom,
  getAnalysisMessages,
  sendAnalysisMessage,
  joinAnalysisRoom,
  isRoomParticipant,
  subscribeToRoomMessages,
  getModeDisplayText,
  generateWelcomeMessage,
} from '@/lib/analysisApi';
import type {
  AnalysisRoomWithCreator,
  AnalysisMessage,
  AnalysisRoomMode,
} from '@/types/database';

// AI Avatar Component
function AIAvatar() {
  return (
    <Avatar className="w-8 h-8 ring-2 ring-primary/30">
      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
        <Bot className="h-4 w-4" />
      </AvatarFallback>
    </Avatar>
  );
}

// Fan Avatar Component
function FanAvatar({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <Avatar className="w-8 h-8">
      <AvatarImage src={avatarUrl || undefined} />
      <AvatarFallback className="bg-muted">
        <User className="h-4 w-4" />
      </AvatarFallback>
    </Avatar>
  );
}

// Message Component
function MessageBubble({ message, isAI }: { message: AnalysisMessage; isAI: boolean }) {
  const formatTime = (timestamp: string) => {
    return format(new Date(timestamp), 'HH:mm');
  };

  const getMessageTypeStyles = () => {
    switch (message.message_type) {
      case 'insight':
        return 'bg-amber-500/10 border border-amber-500/30';
      case 'event':
        return 'bg-blue-500/10 border border-blue-500/30';
      case 'summary':
        return 'bg-purple-500/10 border border-purple-500/30';
      default:
        return isAI ? 'bg-primary/5' : 'bg-muted';
    }
  };

  return (
    <div className={`flex gap-3 ${isAI ? '' : 'flex-row-reverse'}`}>
      {isAI ? <AIAvatar /> : <FanAvatar name={message.sender_name} avatarUrl={null} />}

      <div className={`flex flex-col ${isAI ? 'items-start' : 'items-end'} max-w-[80%]`}>
        <div className="flex items-center gap-2 mb-1">
          {isAI && (
            <span className="text-xs font-medium text-primary flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {message.sender_name || 'Alex'}
            </span>
          )}
          {!isAI && (
            <span className="text-xs font-medium text-muted-foreground">
              {message.sender_name || 'You'}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{formatTime(message.created_at)}</span>
        </div>

        <div className={`rounded-2xl px-4 py-2.5 ${getMessageTypeStyles()}`}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>

        {message.message_type === 'insight' && (
          <Badge variant="outline" className="mt-1 text-xs bg-amber-500/10">
            💡 Insight
          </Badge>
        )}
      </div>
    </div>
  );
}

export default function AnalysisRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [room, setRoom] = useState<AnalysisRoomWithCreator | null>(null);
  const [messages, setMessages] = useState<AnalysisMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [isParticipant, setIsParticipant] = useState(false);
  const [joining, setJoining] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch room data
  useEffect(() => {
    async function fetchRoom() {
      if (!roomId) return;

      try {
        const roomData = await getAnalysisRoom(roomId);
        if (!roomData) {
          toast({
            title: 'Room not found',
            description: 'This analysis room does not exist.',
            variant: 'destructive',
          });
          navigate('/fan/analysis');
          return;
        }
        setRoom(roomData);

        // Check if user is a participant
        const participant = await isRoomParticipant(roomId);
        setIsParticipant(participant);

        // If participant, fetch messages
        if (participant) {
          const msgs = await getAnalysisMessages(roomId);
          setMessages(msgs);
        }
      } catch (error) {
        console.error('Error fetching room:', error);
        toast({
          title: 'Error loading room',
          description: 'Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchRoom();
  }, [roomId, navigate, toast]);

  // Subscribe to new messages
  useEffect(() => {
    if (!roomId || !isParticipant) return;

    const subscription = subscribeToRoomMessages(roomId, (newMessage) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });

      // If AI message, stop typing indicator
      if (newMessage.sender_type === 'ai_agent') {
        setAiTyping(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [roomId, isParticipant]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiTyping]);

  // Join room handler
  const handleJoin = async () => {
    if (!roomId || !user) return;

    setJoining(true);
    try {
      await joinAnalysisRoom(roomId);
      setIsParticipant(true);

      // Fetch messages after joining
      const msgs = await getAnalysisMessages(roomId);
      setMessages(msgs);

      // Add welcome message if no messages
      if (msgs.length === 0 && room) {
        const welcome = generateWelcomeMessage(room.mode, room.home_team, room.away_team);
        // Welcome message will be created by the backend
      }

      toast({
        title: 'Joined room',
        description: 'You can now participate in the analysis.',
      });
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: 'Failed to join',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setJoining(false);
    }
  };

  // Send message handler
  const handleSend = async () => {
    if (!input.trim() || !roomId || sending || !isParticipant || !room) return;

    const messageContent = input.trim();
    setInput('');
    setSending(true);

    try {
      // Send fan message
      await sendAnalysisMessage(roomId, messageContent, user?.user_metadata?.full_name);

      // Call AI for response
      setAiTyping(true);

      const response = await fetch('/api/analysis/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          message: messageContent,
          mode: room.mode,
          homeTeam: room.home_team,
          awayTeam: room.away_team,
          matchData: {
            home_score: room.home_score,
            away_score: room.away_score,
            league_name: room.league_name,
            venue: room.venue,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // AI response will come through realtime subscription
        // But let's also store it in the database
        const { supabase } = await import('@/integrations/supabase/client');
        await supabase.from('analysis_messages').insert({
          room_id: roomId,
          sender_id: null,
          sender_type: 'ai_agent',
          sender_name: 'Alex (AI Analyst)',
          content: data.response,
          message_type: 'chat',
          metadata: {},
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Failed to send message',
        description: 'Please try again.',
        variant: 'destructive',
      });
      setAiTyping(false);
    } finally {
      setSending(false);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-3xl mx-auto">
          <Skeleton className="h-16 w-full mb-4" />
          <Skeleton className="h-[60vh] w-full" />
        </div>
      </div>
    );
  }

  if (!room) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-3xl mx-auto p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/fan/analysis')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold truncate">
                  {room.home_team} vs {room.away_team}
                </span>
                <Badge
                  variant="outline"
                  className={
                    room.mode === 'live'
                      ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse'
                      : room.mode === 'post_match'
                      ? 'bg-green-500/20 text-green-400 border-green-500/50'
                      : 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                  }
                >
                  {room.mode === 'live' ? '🔴 LIVE' : getModeDisplayText(room.mode)}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {room.match_datetime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(room.match_datetime), 'EEE d MMM, HH:mm')}
                  </span>
                )}
                {room.venue && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {room.venue}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {room.participant_count} fans
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        {!isParticipant ? (
          // Join prompt
          <div className="flex-1 flex items-center justify-center p-4">
            <Card className="w-full max-w-md text-center">
              <CardContent className="p-6">
                <AIAvatar />
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                    <Bot className="h-8 w-8 text-primary-foreground" />
                  </div>
                </div>
                <h2 className="font-semibold text-lg mb-2">
                  {room.home_team} vs {room.away_team}
                </h2>
                <p className="text-muted-foreground text-sm mb-4">
                  Join this analysis room to discuss the match with Alex, our AI football analyst,
                  and other fans.
                </p>
                <Button onClick={handleJoin} disabled={joining} className="w-full">
                  {joining ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-4 w-4" />
                      Join Room
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {/* AI Welcome message */}
                {messages.length === 0 && (
                  <div className="flex gap-3">
                    <AIAvatar />
                    <div className="flex flex-col items-start max-w-[80%]">
                      <div className="rounded-2xl px-4 py-2.5 bg-primary/5">
                        <p className="text-sm">
                          {generateWelcomeMessage(room.mode, room.home_team, room.away_team)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Message list */}
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isAI={message.sender_type === 'ai_agent'}
                  />
                ))}

                {/* AI typing indicator */}
                {aiTyping && (
                  <div className="flex gap-3">
                    <AIAvatar />
                    <div className="rounded-2xl px-4 py-2.5 bg-primary/5">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="sticky bottom-0 bg-background border-t p-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask Alex about the match..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                  className="flex-1"
                />
                <Button onClick={handleSend} disabled={!input.trim() || sending} size="icon">
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Chatting with Alex (AI Analyst) • {room.participant_count} fans in room
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
