import { useState } from "react";
import { Heart, MoreHorizontal, Edit2, Trash2, Clock, X, Check } from "lucide-react";
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

interface Chant {
  id: string;
  fan_id: string;
  fan_name: string | null;
  fan_avatar_url: string | null;
  content: string;
  image_url: string | null;
  cheers_count: number;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  cheered_by_me: boolean;
}

interface ChantCardProps {
  chant: Chant;
  currentFanId: string;
  onCheer: (chantId: string) => Promise<void>;
  onEdit: (chantId: string, content: string, imageUrl: string | null) => Promise<void>;
  onDelete: (chantId: string) => Promise<void>;
  isCheering?: boolean;
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

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function ChantCard({
  chant,
  currentFanId,
  onCheer,
  onEdit,
  onDelete,
  isCheering = false,
}: ChantCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editContent, setEditContent] = useState(chant.content);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwnChant = chant.fan_id === currentFanId;

  const handleCheer = async () => {
    await onCheer(chant.id);
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

          {/* Menu for own chants */}
          {isOwnChant && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
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
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Content */}
        <div className="mt-3">
          <p className="text-sm whitespace-pre-wrap break-words">{chant.content}</p>
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
            disabled={isCheering}
            className={`rounded-full gap-1.5 h-8 px-3 ${
              chant.cheered_by_me
                ? "text-red-500 hover:text-red-600 hover:bg-red-500/10"
                : "text-muted-foreground hover:text-red-500"
            }`}
          >
            <Heart
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
    </>
  );
}
