import { Component, createEffect, createMemo, createSignal, onMount, Show } from 'solid-js';
import { Portal } from 'solid-js/web';

type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type ShuffledOption = {
  text: string;
  isCorrect: boolean;
  originalIndex: number;
};

type ShuffledQuestion = {
  id: string;
  prompt: string;
  options: ShuffledOption[];
  explanation: string;
};

interface SatpamDialogData {
  guardId: string;
  guardName: string;
  houseName: string;
  intro: string;
  questions: QuizQuestion[];
  startIndex?: number;
  onClose: () => void;
}

const [showDialog, setShowDialog] = createSignal(false);
const [dialogData, setDialogData] = createSignal<SatpamDialogData | null>(null);
const [shuffledQuestions, setShuffledQuestions] = createSignal<ShuffledQuestion[]>([]);

export const showSatpamDialog = (data: SatpamDialogData) => {
  console.log('🏛️ Satpam Quiz: Showing dialog for', data.guardName);
  setDialogData(data);
  setShowDialog(true);
};

const closeDialog = () => {
  console.log('🏛️ Satpam Quiz: Closing dialog');
  setShowDialog(false);
  const data = dialogData();
  if (data?.onClose) {
    data.onClose();
  }
  setTimeout(() => {
    setDialogData(null);
  }, 250);
};

export const SatpamDialog: Component = () => {
  const [currentIndex, setCurrentIndex] = createSignal(0);
  const [selectedOption, setSelectedOption] = createSignal<number | null>(null);
  const [isLocked, setIsLocked] = createSignal(false);
  const [isCorrect, setIsCorrect] = createSignal<boolean | null>(null);

  createEffect(() => {
    if (showDialog() && dialogData()) {
      const start = dialogData()?.startIndex ?? 0;
      const questions = dialogData()?.questions ?? [];
      const shuffled = questions.map((question) => {
        const optionObjects: ShuffledOption[] = question.options.map((text, index) => ({
          text,
          isCorrect: index === question.correctIndex,
          originalIndex: index,
        }));
        return {
          id: question.id,
          prompt: question.prompt,
          explanation: question.explanation,
          options: shuffle(optionObjects),
        };
      });
      setShuffledQuestions(shuffled);
      setCurrentIndex(start >= shuffled.length ? 0 : start);
      setSelectedOption(null);
      setIsLocked(false);
      setIsCorrect(null);
    }
  });

  const totalQuestions = createMemo(() => shuffledQuestions().length ?? 0);
  const currentQuestion = createMemo(() => shuffledQuestions()[currentIndex()] ?? null);
  const progressLabel = createMemo(() => `${currentIndex() + 1}/${totalQuestions()}`);

  const handleOptionClick = (optionIndex: number) => {
    if (isLocked() || selectedOption() !== null || !currentQuestion()) return;

    const question = currentQuestion();
    if (!question) return;

    const option = question.options[optionIndex];
    const correct = option?.isCorrect ?? false;
    setSelectedOption(optionIndex);
    setIsCorrect(correct);
    setIsLocked(true);

    if (window.gameProgress && typeof window.gameProgress.recordQuestionResult === 'function') {
      window.gameProgress.recordQuestionResult({
        guardId: dialogData()?.guardId,
        questionId: question.id,
        isCorrect: correct,
      });
    }
    
    // Update squad points based on answer
    (async () => {
      try {
        const squadId = await (window as any).getCurrentSquadId();
        if (squadId && (window as any).updateSquadPoints) {
          if (correct) {
            // Correct answer: +5 points
            await (window as any).updateSquadPoints(squadId, 5, `Correct quiz answer: ${dialogData()?.guardName}`);
          } else {
            // Wrong answer: -3 points
            await (window as any).updateSquadPoints(squadId, -3, `Wrong quiz answer: ${dialogData()?.guardName}`);
          }
        }
      } catch (error) {
        console.error('[Quiz] Error updating squad points:', error);
      }
    })();

    setTimeout(() => {
      const nextIndex = currentIndex() + 1;
      if (nextIndex >= totalQuestions()) {
        // All questions answered - update mission progress for squad
        (async () => {
          try {
            const squadId = await (window as any).getCurrentSquadId();
            if (squadId && (window as any).updateMissionProgress) {
              // Update quiz count for squad (all questions in this guard completed)
              await (window as any).updateMissionProgress(squadId, 'quiz');
            }
          } catch (error) {
            console.error('[Quiz] Error updating mission progress:', error);
          }
        })();
        closeDialog();
      } else {
        setCurrentIndex(nextIndex);
        setSelectedOption(null);
        setIsCorrect(null);
        setIsLocked(false);
      }
    }, 1400);
  };

  onMount(() => {
    (window as any).showSatpamDialog = showSatpamDialog;
    console.log('🏛️ Satpam Quiz: showSatpamDialog exposed to window');
  });

  const optionClass = (index: number) => {
    const base =
      'w-full rounded-xl border px-4 py-3 text-left text-sm transition-all duration-200 sm:text-base';
    if (selectedOption() === null) {
      return `${base} border-slate-200 bg-white hover:-translate-y-[2px] hover:border-blue-400 hover:shadow`;
    }
    const question = currentQuestion();
    if (!question) return base;
    if (question.options[index]?.isCorrect) {
      return `${base} border-emerald-500 bg-emerald-50 text-emerald-700 shadow-inner`;
    }
    if (index === selectedOption()) {
      return `${base} border-rose-500 bg-rose-50 text-rose-700 shadow-inner`;
    }
    return `${base} border-slate-200 bg-white opacity-70`;
  };

  return (
    <Portal>
      <Show when={showDialog() && dialogData() && currentQuestion()}>
        {(data) => (
          <div class="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6">
            <div class="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"></div>
            <div class="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl ring-1 ring-white/60">
              <div
                class="relative overflow-hidden rounded-t-3xl px-6 pb-6 pt-8 text-white sm:px-10 sm:pb-8"
                style={{ background: 'linear-gradient(135deg,#3b82f6 0%,#1e3a8a 100%)' }}
              >
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p class="text-xs uppercase tracking-[0.3em] text-blue-100">Penjaga</p>
                    <h2 class="mt-1 text-2xl font-bold sm:text-3xl">{data().guardName}</h2>
                    <p class="text-sm text-blue-100 sm:text-base">Rumah {data().houseName}</p>
                  </div>
                  <div class="rounded-2xl bg-white/15 px-4 py-2 text-center">
                    <p class="text-xs uppercase tracking-[0.4em] text-blue-100">Pertanyaan</p>
                    <p class="text-xl font-semibold">{progressLabel()}</p>
                  </div>
                </div>
                <p class="mt-4 text-sm leading-relaxed text-blue-100 sm:text-base">{data().intro}</p>
              </div>

              <div class="max-h-[65vh] overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
                <div class="space-y-5 sm:space-y-6">
                  <div class="rounded-2xl border border-blue-100 bg-blue-50/70 px-5 py-4 shadow-inner sm:px-6 sm:py-5">
                    <p class="text-xs uppercase tracking-[0.4em] text-blue-500">Pertanyaan</p>
                    <h3 class="mt-2 text-base font-semibold text-slate-900 sm:text-lg">
                      {currentQuestion()?.prompt}
                    </h3>
                  </div>

                  <div class="space-y-3 sm:space-y-4">
                    {currentQuestion()?.options.map((option, index) => (
                      <button
                        type="button"
                        class={optionClass(index)}
                        onClick={() => handleOptionClick(index)}
                        disabled={selectedOption() !== null}
                      >
                        <span class="flex items-start gap-3">
                          <span class="mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-sm font-semibold text-slate-500">
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span>{option.text}</span>
                        </span>
                      </button>
                    ))}
                  </div>

                  <Show when={selectedOption() !== null && currentQuestion()}>
                    <div
                      class={`rounded-2xl border px-4 py-4 sm:px-5 ${isCorrect()
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-rose-200 bg-rose-50 text-rose-700'
                        }`}
                    >
                      <p class="font-semibold">
                        {isCorrect() ? 'Jawabanmu benar! 🎉' : 'Yah, kurang tepat. Semangat lanjut ya!'}
                      </p>
                      <p class="mt-2 text-sm leading-relaxed text-slate-600">
                        {currentQuestion()?.explanation}
                      </p>
                    </div>
                  </Show>
                </div>
              </div>
            </div>
          </div>
        )}
      </Show>
    </Portal>
  );
};

function shuffle<T>(array: T[]): T[] {
  const cloned = array.slice();
  for (let i = cloned.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}
