import { Component, Show, createSignal, onCleanup, onMount } from 'solid-js';
import { Portal } from 'solid-js/web';
import { IoClose } from 'solid-icons/io';

type QuizStatusPanelProps = {
  open: boolean;
  onClose: () => void;
};

type ProgressSnapshot = {
  answeredQuestions: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
};

const defaultSnapshot: ProgressSnapshot = {
  answeredQuestions: 0,
  totalQuestions: 0,
  correctAnswers: 0,
  wrongAnswers: 0,
};

export const QuizStatusPanel: Component<QuizStatusPanelProps> = (props) => {
  const [progress, setProgress] = createSignal<ProgressSnapshot>(defaultSnapshot);

  const handleUpdate = (event: CustomEvent) => {
    if (!event.detail) return;
    const detail = event.detail;
    setProgress({
      answeredQuestions: detail.answeredQuestions ?? 0,
      totalQuestions: detail.totalQuestions ?? 0,
      correctAnswers: detail.correctAnswers ?? 0,
      wrongAnswers: detail.wrongAnswers ?? 0,
    });
  };

  onMount(() => {
    const updateListener = (event: Event) => handleUpdate(event as CustomEvent);
    window.addEventListener('gameProgress:update', updateListener as EventListener);
    window.addEventListener('gameProgress:completed', updateListener as EventListener);

    if (window.gameProgress && typeof window.gameProgress.getState === 'function') {
      const initial = window.gameProgress.getState();
      handleUpdate(new CustomEvent('init', { detail: initial }));
    }

    onCleanup(() => {
      window.removeEventListener('gameProgress:update', updateListener as EventListener);
      window.removeEventListener('gameProgress:completed', updateListener as EventListener);
    });
  });

  const remainingQuestions = () => {
    const total = progress().totalQuestions || 0;
    const answered = progress().answeredQuestions || 0;
    return Math.max(total - answered, 0);
  };

  return (
    <Portal>
      <Show when={props.open}>
        <div class="fixed inset-0 z-[85] flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center">
          <div
            class="absolute inset-0"
            onClick={() => props.onClose()}
          ></div>

          <div class="relative w-full max-w-[420px] rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl sm:border sm:border-slate-100">
            <div class="flex items-center justify-between px-5 py-4 sm:px-6">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.4em] text-blue-500">
                  Kuis / Rumah Adat
                </p>
                <h2 class="text-xl font-bold text-slate-900 sm:text-2xl">Ringkasan Progres</h2>
              </div>
              <button
                type="button"
                class="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                onClick={() => props.onClose()}
              >
                <IoClose size={20} />
              </button>
            </div>

            <div class="grid grid-cols-2 gap-3 px-5 pb-5 sm:px-6">
              <div class="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600">
                  Total Kuis
                </p>
                <p class="mt-2 text-2xl font-bold text-blue-800">{progress().totalQuestions}</p>
                <p class="mt-1 text-xs text-blue-600">Jumlah pertanyaan tersedia</p>
              </div>
              <div class="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600">
                  Sudah Dijawab
                </p>
                <p class="mt-2 text-2xl font-bold text-emerald-700">{progress().answeredQuestions}</p>
                <p class="mt-1 text-xs text-emerald-600">
                  <span class="font-semibold text-emerald-700">{progress().correctAnswers}</span> benar,
                  <span class="font-semibold text-rose-600"> {progress().wrongAnswers}</span> salah
                </p>
              </div>
              <div class="col-span-2 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500">
                  Pertanyaan Tersisa
                </p>
                <div class="mt-2 flex items-baseline justify-between">
                  <p class="text-3xl font-bold text-amber-600">{remainingQuestions()}</p>
                  <p class="text-xs font-medium text-amber-600">
                    {progress().answeredQuestions}/{progress().totalQuestions} selesai
                  </p>
                </div>
                <div class="mt-3 h-2 rounded-full bg-amber-100">
                  <div
                    class="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                    style={{
                      width: `${progress().totalQuestions ? Math.min(100, Math.round((progress().answeredQuestions / progress().totalQuestions) * 100)) : 0}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </Portal>
  );
};

