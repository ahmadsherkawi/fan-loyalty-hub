import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle, ShieldX } from 'lucide-react';

interface EnrollmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubName: string;
  onConfirm: () => void;
  isLoading?: boolean;
  isAlreadyEnrolled?: boolean;
  currentClubName?: string;
  onViewMyClub?: () => void;
}

export function EnrollmentModal({
  open,
  onOpenChange,
  clubName,
  onConfirm,
  isLoading = false,
  isAlreadyEnrolled = false,
  currentClubName,
  onViewMyClub,
}: EnrollmentModalProps) {
  // If already enrolled, show a different message without the join button
  if (isAlreadyEnrolled) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldX className="h-5 w-5 text-destructive" />
              Already Enrolled
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are already a member of <strong>{currentClubName || 'another club'}</strong>'s loyalty program.
              </p>
              <p className="text-sm text-muted-foreground">
                Each fan can only join one club's loyalty program. You cannot join {clubName}.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            {onViewMyClub && (
              <AlertDialogAction onClick={onViewMyClub} className="gradient-stadium">
                View My Club
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Join {clubName}?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              You can only join <strong>one club's loyalty program</strong>. Once you enroll, you won't be able to join another club.
            </p>
            <p className="text-sm text-muted-foreground">
              Make sure this is the club you want to support!
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="gradient-stadium"
          >
            {isLoading ? 'Joining...' : 'Yes, Join Club'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}