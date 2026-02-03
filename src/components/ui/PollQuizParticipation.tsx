import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { BarChart3, HelpCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export type InAppActivityType = 'poll' | 'quiz';

export interface InAppOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface InAppConfig {
  type: InAppActivityType;
  question: string;
  options: InAppOption[];
}

interface PollQuizParticipationProps {
  isOpen: boolean;
  onClose: () => void;
  activityName: string;
  config: InAppConfig;
  pointsAwarded: number;
  pointsCurrency: string;
  onSubmit: (selectedOptionId: string, isCorrect: boolean) => Promise<void>;
  isPreview?: boolean;
}

export function PollQuizParticipation({
  isOpen,
  onClose,
  activityName,
  config,
  pointsAwarded,
  pointsCurrency,
  onSubmit,
  isPreview = false,
}: PollQuizParticipationProps) {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);

  const isPoll = config.type === 'poll';
  const isQuiz = config.type === 'quiz';

  const handleSubmit = async () => {
    if (!selectedOption) return;

    setIsSubmitting(true);
    try {
      // For quizzes, check if the answer is correct
      const selectedOpt = config.options.find(o => o.id === selectedOption);
      const isCorrect = isPoll ? true : (selectedOpt?.isCorrect || false);

      if (isQuiz) {
        setResult(isCorrect ? 'correct' : 'incorrect');
      }

      await onSubmit(selectedOption, isCorrect);

      // For polls, close immediately; for quizzes, show result first
      if (isPoll) {
        setTimeout(() => {
          handleClose();
        }, 500);
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedOption('');
    setResult(null);
    onClose();
  };

  const canSubmit = selectedOption && !isSubmitting && result === null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPoll ? (
              <BarChart3 className="h-5 w-5 text-primary" />
            ) : (
              <HelpCircle className="h-5 w-5 text-primary" />
            )}
            {activityName}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {isPoll ? 'Share your opinion' : 'Test your knowledge'}
            <Badge variant="secondary" className="ml-auto">
              +{pointsAwarded} {pointsCurrency}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Question */}
          <div className="text-lg font-medium text-foreground">
            {config.question}
          </div>

          {/* Result Display for Quiz */}
          {result !== null && isQuiz && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              result === 'correct' 
                ? 'bg-success/10 border border-success/20' 
                : 'bg-destructive/10 border border-destructive/20'
            }`}>
              {result === 'correct' ? (
                <>
                  <CheckCircle className="h-6 w-6 text-success shrink-0" />
                  <div>
                    <div className="font-semibold text-success">Correct!</div>
                    <div className="text-sm text-muted-foreground">
                      You earned {pointsAwarded} {pointsCurrency}!
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-6 w-6 text-destructive shrink-0" />
                  <div>
                    <div className="font-semibold text-destructive">Incorrect</div>
                    <div className="text-sm text-muted-foreground">
                      Better luck next time!
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Options */}
          {result === null && (
            <RadioGroup 
              value={selectedOption} 
              onValueChange={setSelectedOption}
              className="space-y-3"
            >
              {config.options.map((option) => (
                <div 
                  key={option.id} 
                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedOption === option.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedOption(option.id)}
                >
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label 
                    htmlFor={option.id} 
                    className="flex-1 cursor-pointer font-normal"
                  >
                    {option.text}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {/* Show correct answer after quiz result */}
          {result === 'incorrect' && isQuiz && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Correct answer: </span>
              {config.options.find(o => o.isCorrect)?.text}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {result !== null ? (
              <Button onClick={handleClose} className="w-full">
                Close
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleClose} 
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  className="flex-1"
                  disabled={!canSubmit}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Submit Answer
                </Button>
              </>
            )}
          </div>

          {isPreview && result === null && (
            <p className="text-xs text-muted-foreground text-center">
              This is a preview. In production, your answer would be recorded.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
