import { createContext, use, useCallback, useMemo, useRef, useState } from 'react';
import type { PickedFood } from '@repo/shared';
import * as api from './api';
import { today } from './dates';
import { compressPhoto } from './image';

export type DraftItem = {
  id: string;
  /** Nome dado pelo Gemini — é o "alias" que se ensina à API ao corrigir. */
  name: string;
  grams: number;
  food: PickedFood | null;
  learned: boolean;
  /** Adicionado à mão (pesquisa ou código de barras): não há nome do Gemini para aprender. */
  manual: boolean;
  /** Confiança do Gemini (0–1); null se foi escolhido/confirmado pelo utilizador. */
  confidence: number | null;
};

export type PhotoAsset = { uri: string; width: number; height: number; mimeType?: string | null };

export type Draft = {
  /** Dia em que a refeição vai ser guardada (o dia aberto no resumo). */
  date: string;
  photoUri: string | null;
  status: 'idle' | 'analyzing' | 'ready' | 'error';
  error: unknown;
  items: DraftItem[];
};

const empty = (date = today()): Draft => ({ date, photoUri: null, status: 'idle', error: null, items: [] });

let nextId = 0;
const newId = () => `item-${Date.now()}-${nextId++}`;

type DraftValue = Draft & {
  /** Começa uma refeição a partir de uma foto (comprimida e analisada em segundo plano). */
  startPhoto: (date: string, photo: PhotoAsset) => void;
  retryAnalysis: () => void;
  /** Começa uma refeição vazia (sem foto). */
  startManual: (date: string) => void;
  addFood: (food: PickedFood, grams?: number) => void;
  replaceFood: (id: string, food: PickedFood) => void;
  setGrams: (id: string, grams: number) => void;
  removeItem: (id: string) => void;
  reset: () => void;
};

const DraftContext = createContext<DraftValue | null>(null);

/**
 * Rascunho da refeição a registar. Partilhado entre o ecrã principal, o editor,
 * a pesquisa e o scanner (cada um é um ecrã diferente do Expo Router).
 */
export function DraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<Draft>(empty);
  // Ignora respostas de análises antigas (foto trocada ou rascunho descartado entretanto).
  const analysisRun = useRef(0);
  const lastPhoto = useRef<{ date: string; photo: PhotoAsset } | null>(null);

  const analyze = useCallback((date: string, photo: PhotoAsset) => {
    const run = ++analysisRun.current;
    lastPhoto.current = { date, photo };
    // A pré-visualização mostra logo a foto original; o envio usa a versão comprimida.
    setDraft({ date, photoUri: photo.uri, status: 'analyzing', error: null, items: [] });
    compressPhoto(photo)
      .then((small) => api.analyzePhoto(small.uri))
      .then(
        (res) => {
          if (run !== analysisRun.current) return;
          setDraft((d) => ({
            ...d,
            status: 'ready',
            items: res.items.map((it) => ({
              id: newId(),
              name: it.name,
              grams: it.grams,
              food: it.food,
              learned: it.learned,
              manual: false,
              confidence: it.learned ? null : it.confidence,
            })),
          }));
        },
        (error: unknown) => {
          if (run !== analysisRun.current) return;
          setDraft((d) => ({ ...d, status: 'error', error }));
        },
      );
  }, []);

  const value = useMemo<DraftValue>(
    () => ({
      ...draft,
      startPhoto: analyze,
      retryAnalysis: () => {
        const p = lastPhoto.current;
        if (p) analyze(p.date, p.photo);
      },
      startManual: (date) => {
        analysisRun.current++;
        setDraft({ ...empty(date), status: 'ready' });
      },
      addFood: (food, grams = 100) =>
        setDraft((d) => ({
          ...d,
          status: d.status === 'idle' ? 'ready' : d.status,
          items: [
            ...d.items,
            { id: newId(), name: food.name, grams, food, learned: false, manual: true, confidence: null },
          ],
        })),
      replaceFood: (id, food) =>
        setDraft((d) => ({
          ...d,
          items: d.items.map((it) => (it.id === id ? { ...it, food, learned: !it.manual, confidence: null } : it)),
        })),
      setGrams: (id, grams) =>
        setDraft((d) => ({ ...d, items: d.items.map((it) => (it.id === id ? { ...it, grams } : it)) })),
      removeItem: (id) => setDraft((d) => ({ ...d, items: d.items.filter((it) => it.id !== id) })),
      reset: () => {
        analysisRun.current++;
        setDraft(empty());
      },
    }),
    [draft, analyze],
  );

  return <DraftContext value={value}>{children}</DraftContext>;
}

export function useDraft() {
  const ctx = use(DraftContext);
  if (!ctx) throw new Error('useDraft() tem de estar dentro de <DraftProvider>');
  return ctx;
}
