import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Plus, Brain, Search, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  getActiveAnalysisRooms,
  getMyAnalysisRooms,
} from '@/lib/analysisApi';
import { CreateRoomModal } from '@/components/analysis/CreateRoomModal';
import { AnalysisRoomCard } from '@/components/analysis/AnalysisRoomCard';
import type { AnalysisRoomWithCreator } from '@/types/database';

export default function AnalysisRoomsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [allRooms, setAllRooms] = useState<AnalysisRoomWithCreator[]>([]);
  const [myRooms, setMyRooms] = useState<AnalysisRoomWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Fetch rooms
  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const [allRoomsData, myRoomsData] = await Promise.all([
        getActiveAnalysisRooms({ limit: 50 }),
        getMyAnalysisRooms(),
      ]);
      setAllRooms(allRoomsData);
      setMyRooms(myRoomsData);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast({
        title: 'Failed to load rooms',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Filter rooms by search query
  const filterRooms = (rooms: AnalysisRoomWithCreator[]) => {
    if (!searchQuery.trim()) return rooms;

    const query = searchQuery.toLowerCase();
    return rooms.filter(
      (room) =>
        room.home_team.toLowerCase().includes(query) ||
        room.away_team.toLowerCase().includes(query) ||
        room.league_name?.toLowerCase().includes(query) ||
        room.title?.toLowerCase().includes(query)
    );
  };

  // Filter live rooms
  const liveRooms = allRooms.filter((room) => room.mode === 'live');

  // Empty state component
  const EmptyState = ({ type }: { type: 'all' | 'my' | 'live' }) => (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
        <Brain className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium mb-2">
        {type === 'all' && 'No analysis rooms yet'}
        {type === 'my' && 'You haven\'t joined any rooms'}
        {type === 'live' && 'No live matches right now'}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {type === 'all' && 'Be the first to create an analysis room for a match!'}
        {type === 'my' && 'Join a room or create your own to start analyzing matches.'}
        {type === 'live' && 'Check back when matches are in progress.'}
      </p>
      {type !== 'live' && (
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Room
        </Button>
      )}
    </div>
  );

  // Loading skeleton
  const RoomSkeletons = () => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Skeleton key={i} className="h-40 rounded-lg" />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-5xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Brain className="h-6 w-6 text-primary" />
                AI Analysis Rooms
              </h1>
              <p className="text-sm text-muted-foreground">
                Discuss matches with Alex, our AI football analyst
              </p>
            </div>
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Room
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by teams, league..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">
              All Rooms
              {allRooms.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-muted rounded-full">
                  {allRooms.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="live">
              Live Now
              {liveRooms.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full animate-pulse">
                  {liveRooms.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="my">
              My Rooms
              {myRooms.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-muted rounded-full">
                  {myRooms.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* All Rooms Tab */}
          <TabsContent value="all">
            {loading ? (
              <RoomSkeletons />
            ) : filterRooms(allRooms).length === 0 ? (
              <EmptyState type="all" />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filterRooms(allRooms).map((room) => (
                  <AnalysisRoomCard key={room.id} room={room} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Live Tab */}
          <TabsContent value="live">
            {loading ? (
              <RoomSkeletons />
            ) : filterRooms(liveRooms).length === 0 ? (
              <EmptyState type="live" />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filterRooms(liveRooms).map((room) => (
                  <AnalysisRoomCard key={room.id} room={room} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* My Rooms Tab */}
          <TabsContent value="my">
            {loading ? (
              <RoomSkeletons />
            ) : filterRooms(myRooms).length === 0 ? (
              <EmptyState type="my" />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filterRooms(myRooms).map((room) => (
                  <AnalysisRoomCard key={room.id} room={room} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Refresh button */}
        <div className="fixed bottom-20 right-4">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchRooms}
            disabled={loading}
            className="rounded-full shadow-lg"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </main>

      {/* Create Room Modal */}
      <CreateRoomModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </div>
  );
}
