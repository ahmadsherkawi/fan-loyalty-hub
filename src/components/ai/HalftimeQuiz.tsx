import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Q = { q: string; options: string[] };
type Quiz = { id: string; questions: Q[]; sponsor_name: string | null };

export function HalftimeQuiz({ fixtureId }: { fixtureId: string }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState<{ score: number; total: number; answer_key: number[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: quiz, isFetching, error } = useQuery({
    queryKey: ["quiz", fixtureId, lang],
    enabled: started && !!user,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("jamhoor-ai", { body: { action: "quiz", fixture_id: fixtureId, lang } });
      if (error || (data as { error?: string })?.error) throw new Error((data as { error?: string })?.error ?? "quiz");
      return (data as { quiz: Quiz }).quiz;
    },
  });
  const { data: previous } = useQuery({
    queryKey: ["quiz-answer", quiz?.id],
    enabled: !!quiz?.id,
    queryFn: async () => (await supabase.from("quiz_answers").select("score, answers").eq("quiz_id", quiz!.id).maybeSingle()).data,
  });

  async function pick(i: number) {
    const next = [...answers, i];
    setAnswers(next);
    if (quiz && next.length === quiz.questions.length) {
      setSubmitting(true);
      const { data } = await supabase.rpc("submit_quiz", { p_quiz: quiz.id, p_answers: next });
      setSubmitting(false);
      setResult(data as unknown as { score: number; total: number; answer_key: number[] });
      qc.invalidateQueries({ queryKey: ["quiz-answer", quiz.id] });
    } else setIdx(idx + 1);
  }

  if (!user) return null;
  return (
    <div className="rounded-3xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary"><Brain className="h-5 w-5" /></span>
        <div className="flex-1">
          <h3 className="font-semibold">{t("quiz.title")}</h3>
          <p className="text-xs text-muted-foreground">{quiz?.sponsor_name ? t("quiz.presentedBy", { sponsor: quiz.sponsor_name }) : t("quiz.sub")}</p>
        </div>
      </div>

      {!started && <Button className="mt-4 w-full rounded-full" onClick={() => setStarted(true)}>{t("quiz.start")}</Button>}
      {started && isFetching && <p className="mt-4 animate-pulse text-sm text-muted-foreground">{t("quiz.generating")}</p>}
      {started && error && <p className="mt-4 text-sm text-destructive">{t("quiz.error")}</p>}

      {quiz && previous && !result && (
        <p className="mt-4 rounded-2xl bg-secondary p-4 text-center text-sm">{t("quiz.already", { score: previous.score, total: quiz.questions.length })}</p>
      )}

      {quiz && !previous && !result && quiz.questions[idx] && (
        <div className="mt-4">
          <p className="text-xs text-muted-foreground">{t("quiz.progress", { n: idx + 1, total: quiz.questions.length })}</p>
          <p className="mt-1 font-medium">{quiz.questions[idx].q}</p>
          <div className="mt-3 grid gap-2">
            {quiz.questions[idx].options.map((o, i) => (
              <button key={i} disabled={submitting} onClick={() => pick(i)} className="rounded-xl border bg-background px-3 py-2.5 text-start text-sm transition-colors hover:border-primary">{o}</button>
            ))}
          </div>
        </div>
      )}

      {quiz && result && (
        <div className="mt-4">
          <p className="scoreboard text-center text-4xl font-bold">{result.score}/{result.total}</p>
          <p className="text-center text-sm text-muted-foreground">{t("quiz.done")}</p>
          <div className="mt-4 space-y-2">
            {quiz.questions.map((q, i) => {
              const ok = answers[i] === result.answer_key[i];
              return (
                <div key={i} className="rounded-xl bg-secondary/60 p-3 text-sm">
                  <p className="font-medium">{q.q}</p>
                  <p className={cn("mt-1 flex items-center gap-1", ok ? "text-primary" : "text-destructive")}>
                    {ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}{q.options[result.answer_key[i]]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
