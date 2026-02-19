-- Add in_app_config column to activities for storing poll/quiz configuration
ALTER TABLE public.activities 
ADD COLUMN in_app_config jsonb DEFAULT NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN public.activities.in_app_config IS 'Configuration for in-app activities. Structure: { type: "poll" | "quiz", question: string, options: [{ id: string, text: string, isCorrect?: boolean }] }';