import { useState } from "react";
import { Mic, MoreHorizontal, Edit2, Trash2, Clock, X, Check, Flag, Users, Calendar, MapPin, ExternalLink, Ticket, Eye, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface MatchData {
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  matchDate: string;
  venue?: string;
  city?: string;
  league?: string;
  matchId?: string;
  clubId?: string;
}

interface Chant {
  id: string;
  fan_id: string;
  fan_name: string | null;
  fan_avatar_url: string | null;
  content: string;
  image_url: string | null;
  cheers_count: number;
  going_count?: number;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  cheered_by_me: boolean;
  going_by_me?: boolean;
  post_type?: string;
  match_data?: MatchData | null;
}

interface ChantCardProps {
  chant: Chant;
  currentFanId: string;
  onCheer: (chantId: string) => Promise<void>;
  onEdit: (chantId: string, content: string, imageUrl: string | null) => Promise<void>;
  onDelete: (chantId: string) => Promise<void>;
  onReport?: (chantId: string, reason: string) => Promise<void>;
  onGoing?: (chantId: string) => Promise<void>;
  isCheering?: boolean;
  isReporting?: boolean;
  isGoing?: boolean;
  hideActions?: boolean;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatMatchDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatMatchTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// Parse content and highlight @mentions
function renderContentWithMentions(content: string): React.ReactNode {
  const mentionRegex = /@([\w.]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }
    // Add the highlighted mention
    parts.push(
      <span
        key={match.index}
        className="text-primary font-semibold hover:underline cursor-pointer"
      >
        @{match[1]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

export function ChantCard({
  chant,
  currentFanId,
  onCheer,
  onEdit,
  onDelete,
  onReport,
  onGoing,
  isCheering = false,
  isReporting = false,
  isGoing = false,
  hideActions = false,
}: ChantCardProps) {
  const navigate = useNavigate();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [editContent, setEditContent] = useState(chant.content);
  const [reportReason, setReportReason] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);

  const isOwnChant = chant.fan_id === currentFanId;
  const isMatchAttendance = chant.post_type === 'match_attendance';
  const isWatchingMatch = chant.post_type === 'watching_match';
  const matchData = chant.match_data;

  const handleCheer = async () => {
    await onCheer(chant.id);
  };

  const handleGoing = async () => {
    if (onGoing) {
      await onGoing(chant.id);
    }
  };

  const handleEdit = async () => {
    if (editContent.trim().length === 0 || editContent.length > 280) return;
    setIsEditing(true);
    try {
      await onEdit(chant.id, editContent, chant.image_url);
      setShowEditDialog(false);
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(chant.id);
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReport = async () => {
    if (!onReport || !reportReason.trim()) return;
    setIsReportSubmitting(true);
    try {
      await onReport(chant.id, reportReason.trim());
      setShowReportDialog(false);
      setReportReason("");
    } finally {
      setIsReportSubmitting(false);
    }
  };

  const handleViewMatch = () => {
    if (matchData?.matchId) {
      const params = new URLSearchParams({ matchId: matchData.matchId });
      if (matchData.clubId) {
        params.set('clubId', matchData.clubId);
      }
      navigate(`/fan/matches?${params.toString()}`);
    } else {
      navigate('/fan/matches');
    }
  };

  // Match Attendance Card (for both match_attendance and watching_match)
  if ((isMatchAttendance || isWatchingMatch) && matchData) {
    return (
      <div className={`rounded-2xl border p-4 transition-all ${
        isWatchingMatch 
          ? 'bg-gradient-to-br from-red-500/10 via-card to-red-500/5 border-red-500/20 hover:border-red-500/40' 
          : 'bg-gradient-to-br from-primary/10 via-card to-accent/5 border-primary/20 hover:border-primary/40'
      }`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full border flex items-center justify-center text-sm font-semibold ${
              isWatchingMatch 
                ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                : 'bg-primary/10 border-primary/20 text-primary'
            }`}>
              {chant.fan_avatar_url ? (
                <img
                  src={chant.fan_avatar_url}
                  alt={chant.fan_name || "Fan"}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                getInitials(chant.fan_name)
              )}
            </div>
            <div>
              <p className="font-semibold text-sm">{chant.fan_name || "Unknown Fan"}</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatRelativeTime(chant.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Menu */}
          {!hideActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                {isOwnChant ? (
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="rounded-lg text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                ) : (
                  onReport && (
                    <DropdownMenuItem
                      onClick={() => setShowReportDialog(true)}
                      className="rounded-lg text-amber-600 focus:text-amber-600"
                    >
                      <Flag className="h-4 w-4 mr-2" />
                      Report
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Match Card */}
        <div className="rounded-xl bg-card/80 border border-border/50 p-4 mb-3">
          {/* Match Header */}
          <div className="flex items-center justify-between mb-3">
            <Badge variant="outline" className={`gap-1.5 text-xs ${
              isWatchingMatch 
                ? 'bg-red-500/10 text-red-400 border-red-500/30' 
                : ''
            }`}>
              {isWatchingMatch ? (
                <>
                  <Eye className="h-3 w-3" />
                  Watching Live
                </>
              ) : (
                <>
                  <Ticket className="h-3 w-3" />
                  Match Attendance
                </>
              )}
            </Badge>
            {matchData.league && (
              <span className="text-[10px] text-muted-foreground">{matchData.league}</span>
            )}
          </div>

          {/* Teams */}
          <div className="flex items-center justify-between gap-3 mb-3">
            {/* Home Team */}
            <div className="flex-1 text-center">
              <div className="flex flex-col items-center gap-1">
                {matchData.homeTeamLogo ? (
                  <img src={matchData.homeTeamLogo} alt={matchData.homeTeam} className="w-10 h-10 object-contain" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-muted/30 flex items-center justify-center text-xs font-bold">
                    {matchData.homeTeam.charAt(0)}
                  </div>
                )}
                <span className="text-xs font-semibold truncate max-w-[80px]">{matchData.homeTeam}</span>
              </div>
            </div>

            {/* VS */}
            <div className="text-center px-2">
              {isWatchingMatch ? (
                <span className="text-sm font-bold text-red-400">VS</span>
              ) : (
                <span className="text-sm font-bold text-muted-foreground">VS</span>
              )}
            </div>

            {/* Away Team */}
            <div className="flex-1 text-center">
              <div className="flex flex-col items-center gap-1">
                {matchData.awayTeamLogo ? (
                  <img src={matchData.awayTeamLogo} alt={matchData.awayTeam} className="w-10 h-10 object-contain" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-muted/30 flex items-center justify-center text-xs font-bold">
                    {matchData.awayTeam.charAt(0)}
                  </div>
                )}
                <span className="text-xs font-semibold truncate max-w-[80px]">{matchData.awayTeam}</span>
              </div>
            </div>
          </div>

          {/* Date & Venue */}
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formatMatchDate(matchData.matchDate)}</span>
              <span>at {formatMatchTime(matchData.matchDate)}</span>
            </div>
          </div>
          {(matchData.venue || matchData.city) && (
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1">
              <MapPin className="h-3 w-3" />
              <span>{matchData.venue || matchData.city}</span>
            </div>
          )}
        </div>

        {/* Message */}
        {chant.content && (
          <p className="text-sm text-muted-foreground mb-3 italic">"{chant.content}"</p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isWatchingMatch ? (
              /* Chat Button for watching posts */
              <Button
                variant="default"
                size="sm"
                onClick={handleViewMatch}
                className="rounded-full gap-1.5 h-8 px-3 bg-red-500 hover:bg-red-600 text-white"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs font-medium">Join Chat</span>
              </Button>
            ) : (
              /* Going Button for attendance posts */
              onGoing && (
                <Button
                  variant={chant.going_by_me ? "default" : "outline"}
                  size="sm"
                  onClick={handleGoing}
                  disabled={isGoing || hideActions}
                  className={`rounded-full gap-1.5 h-8 px-3 ${
                    chant.going_by_me
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : "hover:bg-green-500/10 hover:text-green-500 hover:border-green-500"
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-medium">{chant.going_count || 1} going</span>
                </Button>
              )
            )}

            {/* Cheer Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCheer}
              disabled={isCheering || hideActions}
              className={`rounded-full gap-1.5 h-8 px-3 ${
                chant.cheered_by_me
                  ? "text-accent hover:text-accent/80 hover:bg-accent/10"
                  : "text-muted-foreground hover:text-accent"
              }`}
            >
              <Mic
                className={`h-4 w-4 ${chant.cheered_by_me ? "fill-current" : ""}`}
              />
              <span className="text-xs font-medium">{chant.cheers_count}</span>
            </Button>
          </div>

          {/* View Match Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewMatch}
            className="rounded-full gap-1.5 h-8 px-3 text-primary hover:bg-primary/10"
          >
            <ExternalLink className="h-3 w-3" />
            <span className="text-xs">View Match</span>
          </Button>
        </div>

        {/* Delete Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="rounded-2xl max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Post?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {isWatchingMatch 
                ? 'This will remove your watching post. Other fans will no longer see that you\'re watching.'
                : 'This will remove your match attendance post. Other fans will no longer see that you\'re attending.'
              }
            </p>
            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-xl"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Report Dialog */}
        <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
          <DialogContent className="rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle>Report Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please let us know why you're reporting this post.
              </p>
              <Textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Reason for reporting..."
                className="rounded-xl border-border/40 min-h-[80px] resize-none"
                maxLength={500}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReportDialog(false);
                  setReportReason("");
                }}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReport}
                disabled={isReportSubmitting || !reportReason.trim()}
                className="rounded-xl"
              >
                {isReportSubmitting ? "Submitting..." : "Submit Report"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Regular Chant Card
  return (
    <>
      <div className="rounded-2xl bg-card border border-border/50 p-4 hover:border-border transition-all">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
              {chant.fan_avatar_url ? (
                <img
                  src={chant.fan_avatar_url}
                  alt={chant.fan_name || "Fan"}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                getInitials(chant.fan_name)
              )}
            </div>
            <div>
              <p className="font-semibold text-sm">{chant.fan_name || "Unknown Fan"}</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatRelativeTime(chant.created_at)}</span>
                {chant.is_edited && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 ml-1">
                    edited
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Menu */}
          {!hideActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                {isOwnChant ? (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        setEditContent(chant.content);
                        setShowEditDialog(true);
                      }}
                      className="rounded-lg"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
                      className="rounded-lg text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                ) : (
                  onReport && (
                    <DropdownMenuItem
                      onClick={() => setShowReportDialog(true)}
                      className="rounded-lg text-amber-600 focus:text-amber-600"
                    >
                      <Flag className="h-4 w-4 mr-2" />
                      Report
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Content with @mentions highlighted */}
        <div className="mt-3">
          <p className="text-sm whitespace-pre-wrap break-words">
            {renderContentWithMentions(chant.content)}
          </p>
        </div>

        {/* Image */}
        {chant.image_url && (
          <div className="mt-3">
            <img
              src={chant.image_url}
              alt="Chant attachment"
              className="rounded-xl max-h-64 w-auto object-cover"
            />
          </div>
        )}

        {/* Cheer Button */}
        <div className="mt-4 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCheer}
            disabled={isCheering || hideActions}
            className={`rounded-full gap-1.5 h-8 px-3 ${
              chant.cheered_by_me
                ? "text-accent hover:text-accent/80 hover:bg-accent/10"
                : "text-muted-foreground hover:text-accent"
            }`}
          >
            <Mic
              className={`h-4 w-4 ${chant.cheered_by_me ? "fill-current" : ""}`}
            />
            <span className="text-xs font-medium">{chant.cheers_count}</span>
          </Button>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Chant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="What's on your mind?"
              className="rounded-xl border-border/40 min-h-[100px] resize-none"
              maxLength={280}
            />
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Use @username to mention other fans</span>
              <span>{editContent.length}/280</span>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={isEditing || editContent.trim().length === 0 || editContent.length > 280}
              className="rounded-xl"
            >
              {isEditing ? (
                "Saving..."
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Chant?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. Your chant will be permanently deleted.
          </p>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-xl"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>Report Chant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please let us know why you're reporting this chant.
            </p>
            <Textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Reason for reporting..."
              className="rounded-xl border-border/40 min-h-[80px] resize-none"
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground text-right">
              {reportReason.length}/500
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowReportDialog(false);
                setReportReason("");
              }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReport}
              disabled={isReportSubmitting || !reportReason.trim()}
              className="rounded-xl"
            >
              {isReportSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
