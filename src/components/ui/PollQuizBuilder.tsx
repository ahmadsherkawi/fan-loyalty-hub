import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, CheckCircle2, BarChart3, HelpCircle } from 'lucide-react';

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

interface PollQuizBuilderProps {
  value: InAppConfig | null;
  onChange: (config: InAppConfig | null) => void;
}

const generateId = () => crypto.randomUUID().slice(0, 8);

const defaultOptions = [
  { id: generateId(), text: '', isCorrect: false },
  { id: generateId(), text: '', isCorrect: false },
];

export function PollQuizBuilder({ value, onChange }: PollQuizBuilderProps) {
  const [type, setType] = useState<InAppActivityType>(value?.type || 'poll');
  const [question, setQuestion] = useState(value?.question || '');
  const [options, setOptions] = useState<InAppOption[]>(
    value?.options || defaultOptions
  );
  const [correctAnswer, setCorrectAnswer] = useState<string>(
    value?.options?.find(o => o.isCorrect)?.id || ''
  );
  
  // Track if this is the initial mount
  const isInitialMount = useRef(true);
  const prevValueRef = useRef<string | null>(null);

  // Sync internal state with parent only when value changes externally
  useEffect(() => {
    const valueStr = JSON.stringify(value);
    if (prevValueRef.current !== valueStr) {
      prevValueRef.current = valueStr;
      if (value) {
        setType(value.type);
        setQuestion(value.question);
        setOptions(value.options);
        setCorrectAnswer(value.options.find(o => o.isCorrect)?.id || '');
      }
    }
  }, [value]);

  // Update parent when internal state changes (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    const updatedOptions = options.map(opt => ({
      ...opt,
      isCorrect: type === 'quiz' ? opt.id === correctAnswer : undefined,
    }));

    const config: InAppConfig = {
      type,
      question,
      options: updatedOptions,
    };

    // Update prevValueRef to prevent loop
    prevValueRef.current = JSON.stringify(config);
    onChange(config);
  }, [type, question, options, correctAnswer, onChange]);

  const handleAddOption = () => {
    if (options.length >= 6) return;
    setOptions([...options, { id: generateId(), text: '', isCorrect: false }]);
  };

  const handleRemoveOption = (id: string) => {
    if (options.length <= 2) return;
    setOptions(options.filter(opt => opt.id !== id));
    if (correctAnswer === id) {
      setCorrectAnswer('');
    }
  };

  const handleOptionTextChange = (id: string, text: string) => {
    setOptions(options.map(opt => 
      opt.id === id ? { ...opt, text } : opt
    ));
  };

  return (
    <div className="space-y-4 p-4 border border-primary/20 rounded-lg bg-primary/5">
      <div className="flex items-center gap-2 text-primary font-medium">
        {type === 'poll' ? (
          <BarChart3 className="h-4 w-4" />
        ) : (
          <HelpCircle className="h-4 w-4" />
        )}
        In-App Activity Configuration
      </div>

      <Tabs value={type} onValueChange={(v) => setType(v as InAppActivityType)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="poll" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Poll
          </TabsTrigger>
          <TabsTrigger value="quiz" className="gap-2">
            <HelpCircle className="h-4 w-4" />
            Quiz
          </TabsTrigger>
        </TabsList>

        <TabsContent value="poll" className="mt-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Fans share their opinion. Everyone who answers earns points.
          </p>
        </TabsContent>

        <TabsContent value="quiz" className="mt-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Test fan knowledge. Only correct answers earn points.
          </p>
        </TabsContent>
      </Tabs>

      <div className="space-y-2">
        <Label htmlFor="question">Question *</Label>
        <Input
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={type === 'poll' 
            ? "e.g., Who should be captain next season?" 
            : "e.g., In which year was the club founded?"}
        />
      </div>

      <div className="space-y-3">
        <Label>Answer Options * (2-6 options)</Label>
        
        {type === 'quiz' && (
          <RadioGroup value={correctAnswer} onValueChange={setCorrectAnswer}>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2">
                  <RadioGroupItem 
                    value={option.id} 
                    id={`correct-${option.id}`}
                    className="shrink-0"
                  />
                  <Input
                    value={option.text}
                    onChange={(e) => handleOptionTextChange(option.id, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1"
                  />
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(option.id)}
                      className="shrink-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </RadioGroup>
        )}

        {type === 'poll' && (
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={option.id} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground shrink-0">
                  {index + 1}
                </div>
                <Input
                  value={option.text}
                  onChange={(e) => handleOptionTextChange(option.id, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1"
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveOption(option.id)}
                    className="shrink-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {options.length < 6 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddOption}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Option
          </Button>
        )}
      </div>

      {type === 'quiz' && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
          <span>Select the radio button next to the correct answer. Fans must pick this option to earn points.</span>
        </div>
      )}
    </div>
  );
}
