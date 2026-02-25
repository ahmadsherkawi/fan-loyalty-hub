import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Send,
  Users,
  Bot,
  User,
  Sparkles,
  Clock,
  Loader2,
  Share2,
  Settings,
  Crown,
  UserX,
  Power,
  Trash2,
  MoreVertical,
  MessageCircle,
  Copy,
  Check,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  getAnalysisRoom,
  getAnalysisMessages,
  sendAnalysisMessage,
  joinAnalysisRoom,
  isRoomParticipant,
  isRoomAdmin,
  subscribeToRoomMessages,
  getRoomParticipants,
  kickParticipant,
  toggleAlexAI,
  terminateRoom,
  getModeDisplayText,
  generateWelcomeMessage,
} from '@/lib/analysisApi';
import { apiFootball } from '@/lib/apiFootball';
import { getAlexAnalysisContext, getLeagueId } from '@/lib/alexContext';
import { alexChat } from '@/lib/aiService';
import type {
  AnalysisRoomWithCreator,
  AnalysisMessage,
  AnalysisRoomParticipant,
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
function FanAvatar({ name, avatarUrl, isAdmin }: { name: string | null; avatarUrl: string | null; isAdmin?: boolean }) {
  return (
    <div className="relative">
      <Avatar className="w-8 h-8">
        <AvatarImage src={avatarUrl || undefined} />
        <AvatarFallback className="bg-muted">
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      {isAdmin && (
        <Crown className="absolute -top-1 -right-1 h-3 w-3 text-yellow-500" />
      )}
    </div>
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
      </div>
    </div>
  );
}

export default function AnalysisRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const clubId = searchParams.get('clubId');

  const [room, setRoom] = useState<AnalysisRoomWithCreator | null>(null);
  const [messages, setMessages] = useState<AnalysisMessage[]>([]);
  const [participants, setParticipants] = useState<AnalysisRoomParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [isParticipant, setIsParticipant] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [joining, setJoining] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [alexEnabled, setAlexEnabled] = useState(true);
  const [showParticipants, setShowParticipants] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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
          navigate(-1);
          return;
        }
        
        // Check if room is terminated
        if (roomData.status === 'terminated') {
          toast({
            title: 'Room closed',
            description: 'This analysis room has been closed by the admin.',
            variant: 'destructive',
          });
          navigate(-1);
          return;
        }
        
        setRoom(roomData);
        setAlexEnabled(roomData.alex_enabled ?? true);

        // Check if user is a participant
        const participant = await isRoomParticipant(roomId);
        setIsParticipant(participant);

        // Check if user is admin
        if (participant) {
          const admin = await isRoomAdmin(roomId);
          setIsAdmin(admin);
          
          // Fetch messages and participants
          const [msgs, parts] = await Promise.all([
            getAnalysisMessages(roomId),
            getRoomParticipants(roomId)
          ]);
          setMessages(msgs);
          setParticipants(parts as AnalysisRoomParticipant[]);
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
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });

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

      const [msgs, admin] = await Promise.all([
        getAnalysisMessages(roomId),
        isRoomAdmin(roomId)
      ]);
      setMessages(msgs);
      setIsAdmin(admin);

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
      // Save fan message
      await sendAnalysisMessage(roomId, messageContent, profile?.full_name);

      // Only call Alex if enabled
      if (alexEnabled) {
        setAiTyping(true);

        let analysisContext = null;
        if (apiFootball.isApiConfigured()) {
          try {
            const leagueId = room.league_name ? getLeagueId(room.league_name) : undefined;
            analysisContext = await getAlexAnalysisContext(
              room.home_team,
              room.away_team,
              { leagueId, fixtureId: room.fixture_id || undefined }
            );
          } catch (ctxError) {
            console.warn('Could not fetch analysis context:', ctxError);
          }
        }

        // Call Alex AI
        const response = await alexChat({
          message: messageContent,
          mode: room.mode,
          homeTeam: room.home_team,
          awayTeam: room.away_team,
          roomId: roomId,
          fixtureId: room.fixture_id || undefined,
          homeTeamId: room.home_team_id || undefined,
          awayTeamId: room.away_team_id || undefined,
          leagueId: room.league_name ? getLeagueId(room.league_name) : undefined,
          matchData: {
            home_score: room.home_score,
            away_score: room.away_score,
            league_name: room.league_name,
            venue: room.venue,
          },
          analysisContext: analysisContext || undefined,
        });

        // Save AI response
        await supabase.from('analysis_messages').insert({
          room_id: roomId,
          sender_id: null,
          sender_type: 'ai_agent',
          sender_name: 'Alex (AI Analyst)',
          content: response,
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

  // Copy invite link
  const handleCopyInviteLink = async () => {
    const link = `${window.location.origin}/fan/analysis/${roomId}`;
    await navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast({
      title: 'Link copied!',
      description: 'Share this link with other fans.',
    });
  };

  // Invite fans - post to chants
  const handleInviteFans = async () => {
    if (!room || !profile) return;

    setInviting(true);
    try {
      // Post to chants if club exists
      if (room.club_id) {
        const { error } = await supabase.from('chants').insert({
          fan_id: profile.id,
          club_id: room.club_id,
          content: `🏟️ Join my AI Analysis Room for ${room.home_team} vs ${room.away_team}! Let's discuss the match together.`,
          post_type: 'analysis_invite',
          match_data: {
            homeTeam: room.home_team,
            awayTeam: room.away_team,
            matchDate: room.match_datetime,
            league: room.league_name,
            roomId: room.id,
          },
        });

        if (error) {
          console.warn('Could not post to chants:', error);
          // Still show success since we have the link
        }
      }

      // Copy link to clipboard
      await handleCopyInviteLink();
      
    } catch (error) {
      console.error('Error inviting fans:', error);
      // Fallback to just copying link
      await handleCopyInviteLink();
    } finally {
      setInviting(false);
    }
  };

  // Toggle Alex AI
  const handleToggleAlex = async (enabled: boolean) => {
    if (!roomId || !isAdmin) return;
    
    try {
      await toggleAlexAI(roomId, enabled);
      setAlexEnabled(enabled);
      
      // Add system message
      await supabase.from('analysis_messages').insert({
        room_id: roomId,
        sender_type: 'ai_agent',
        sender_name: 'System',
        content: enabled ? '🤖 Alex AI has been enabled by the admin.' : '🔇 Alex AI has been disabled by the admin. Fans can now chat freely.',
        message_type: 'system',
        metadata: {},
      });
      
      toast({
        title: enabled ? 'Alex enabled' : 'Alex disabled',
        description: enabled ? 'Alex will respond to messages' : 'Fans can chat without AI responses',
      });
    } catch (error) {
      console.error('Error toggling Alex:', error);
      toast({
        title: 'Failed to update',
        variant: 'destructive',
      });
    }
  };

  // Kick participant
  const handleKickParticipant = async (participantId: string, participantName: string) => {
    if (!roomId || !isAdmin) return;
    
    try {
      await kickParticipant(roomId, participantId);
      
      // Update local state
      setParticipants(prev => prev.filter(p => p.id !== participantId));
      
      // Add system message
      await supabase.from('analysis_messages').insert({
        room_id: roomId,
        sender_type: 'ai_agent',
        sender_name: 'System',
        content: `👋 ${participantName} has been removed from the room.`,
        message_type: 'system',
        metadata: {},
      });
      
      toast({
        title: 'Participant removed',
      });
    } catch (error) {
      console.error('Error kicking participant:', error);
      toast({
        title: 'Failed to remove participant',
        variant: 'destructive',
      });
    }
  };

  // Terminate room
  const handleTerminateRoom = async () => {
    if (!roomId || !isAdmin) return;
    
    if (!confirm('Are you sure you want to close this room? This cannot be undone.')) return;
    
    try {
      await terminateRoom(roomId);
      
      toast({
        title: 'Room closed',
        description: 'The analysis room has been terminated.',
      });
      
      navigate(-1);
    } catch (error) {
      console.error('Error terminating room:', error);
      toast({
        title: 'Failed to close room',
        variant: 'destructive',
      });
    }
  };

  // Handle back navigation
  const handleBack = () => {
    if (clubId) {
      navigate(`/fan/community/${clubId}`);
    } else {
      navigate(-1);
    }
  };

  // Refresh participants
  const refreshParticipants = async () => {
    if (!roomId) return;
    const parts = await getRoomParticipants(roomId);
    setParticipants(parts as AnalysisRoomParticipant[]);
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
      <header className="sticky top-0 z-10 border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" />
        <div className="relative max-w-3xl mx-auto p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="rounded-full text-muted-foreground hover:text-foreground h-9"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div className="h-5 w-px bg-border/40 hidden sm:block" />

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
                {!alexEnabled && (
                  <Badge variant="outline" className="bg-gray-500/20 text-gray-400">
                    <Bot className="h-3 w-3 mr-1" />
                    Muted
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {room.match_datetime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(room.match_datetime), 'EEE d MMM, HH:mm')}
                  </span>
                )}
                <span 
                  className="flex items-center gap-1 cursor-pointer hover:text-foreground"
                  onClick={() => {
                    refreshParticipants();
                    setShowParticipants(true);
                  }}
                >
                  <Users className="h-3 w-3" />
                  {room.participant_count} fans
                </span>
              </div>
            </div>

            {/* Admin Controls */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Settings className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="p-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="alex-toggle" className="text-sm flex items-center gap-2">
                        <Bot className="h-4 w-4" />
                        Alex AI
                      </Label>
                      <Switch
                        id="alex-toggle"
                        checked={alexEnabled}
                        onCheckedChange={handleToggleAlex}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {alexEnabled ? 'Alex responds to messages' : 'Fans chat only'}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    refreshParticipants();
                    setShowParticipants(true);
                  }}>
                    <Users className="h-4 w-4 mr-2" />
                    Manage Participants
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyInviteLink}>
                    {copiedLink ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    Copy Invite Link
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleTerminateRoom}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Close Room
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Invite Button (non-admin) */}
            {!isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleInviteFans}
                disabled={inviting}
                className="rounded-full text-xs gap-1"
              >
                <Share2 className="h-3 w-3" />
                Invite
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Participants Dialog */}
      <Dialog open={showParticipants} onOpenChange={setShowParticipants}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participants ({participants.length})
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {participants.map((p) => {
              const profileData = (p as any).profiles;
              return (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <FanAvatar 
                      name={profileData?.full_name} 
                      avatarUrl={profileData?.avatar_url}
                      isAdmin={p.is_admin}
                    />
                    <div>
                      <p className="text-sm font-medium">
                        {profileData?.full_name || 'Anonymous'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined {format(new Date(p.joined_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                  {isAdmin && !p.is_admin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleKickParticipant(p.id, profileData?.full_name || 'Anonymous')}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Main content */}
      <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        {!isParticipant ? (
          // Join prompt
          <div className="flex-1 flex items-center justify-center p-4">
            <Card className="w-full max-w-md text-center">
              <CardContent className="p-6">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                    <MessageCircle className="h-8 w-8 text-primary-foreground" />
                  </div>
                </div>
                <h2 className="font-semibold text-lg mb-2">
                  {room.home_team} vs {room.away_team}
                </h2>
                <p className="text-muted-foreground text-sm mb-4">
                  Join this analysis room to discuss the match with fellow fans{alexEnabled && ' and Alex, our AI analyst'}.
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
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {/* AI Welcome message (only if Alex enabled) */}
                {messages.length === 0 && alexEnabled && (
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

                {/* Fan chat mode message */}
                {messages.length === 0 && !alexEnabled && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Fan chat mode - start the conversation!</p>
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
                  placeholder={alexEnabled ? "Ask Alex about the match..." : "Chat with fans..."}
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
              <p className="text-xs text-muted-foreground mt-2 text-center flex items-center justify-center gap-2">
                {alexEnabled ? (
                  <>
                    <Bot className="h-3 w-3" />
                    Chatting with Alex (AI Analyst)
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-3 w-3" />
                    Fan chat mode
                  </>
                )}
                <span>•</span>
                <span>{room.participant_count} fans in room</span>
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
