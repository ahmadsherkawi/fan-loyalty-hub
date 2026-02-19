import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FileCheck, Upload, Camera } from 'lucide-react';

interface ManualProofModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityName: string;
  pointsAwarded: number;
  pointsCurrencyName: string;
  onSubmit: (proofDescription: string, proofUrl: string | null) => Promise<void>;
  isLoading?: boolean;
}

export function ManualProofModal({
  open,
  onOpenChange,
  activityName,
  pointsAwarded,
  pointsCurrencyName,
  onSubmit,
  isLoading = false,
}: ManualProofModalProps) {
  const [proofDescription, setProofDescription] = useState('');
  const [proofUrl, setProofUrl] = useState('');

  const handleSubmit = async () => {
    if (!proofDescription.trim()) return;
    await onSubmit(proofDescription, proofUrl || null);
    setProofDescription('');
    setProofUrl('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setProofDescription('');
      setProofUrl('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Submit Proof
          </DialogTitle>
          <DialogDescription>
            Submit evidence for "{activityName}" to earn {pointsAwarded} {pointsCurrencyName}. 
            The club admin will review your submission.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="proofDescription">
              Describe your evidence *
            </Label>
            <Textarea
              id="proofDescription"
              placeholder="Explain what you did and provide details..."
              value={proofDescription}
              onChange={(e) => setProofDescription(e.target.value)}
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proofUrl" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Photo/Link (optional)
            </Label>
            <Input
              id="proofUrl"
              type="url"
              placeholder="https://... (link to photo or proof)"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Upload your photo to a service like Imgur and paste the link, or provide a link to supporting evidence.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Camera className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                <strong>Tips for approval:</strong> Include clear photos, specific details 
                about when and where you completed the activity, and any receipts or proof.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!proofDescription.trim() || isLoading}
              className="flex-1 gradient-stadium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4 mr-2" />
                  Submit Proof
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
