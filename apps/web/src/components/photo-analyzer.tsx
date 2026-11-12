'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CircleAlertIcon,
  FlameIcon,
  ImagePlusIcon,
  KeyboardIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SaveIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  LOW_CONFIDENCE,
  MEAL_TYPES,
  scaleMacros,
  sumMacros,
  type MealType,
  type PickedFood,
} from '@repo/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { analyzePhoto, confirmFood, createMeal } from '@/lib/api';
import { compressImage } from '@/lib/image';
import { guessMealType } from '@/lib/meals';
import { useErrorMessage, useI18n } from '@/lib/i18n';
import { FoodSearch } from '@/components/food-search';
import { MacroBar, MacroInline, MacroTiles } from '@/components/macro-summary';

const MAX_SIZE_MB = 10;

type EditableItem = {
  id: string;
  /** Nome dado pelo Gemini (ou pesquisa manual) — é o alias que ensinamos à API. */
  name: string;
  grams: number;
  food: PickedFood | null;
  learned: boolean;
  /** Adicionado à mão: não tem nome do Gemini para aprender. */
  manual: boolean;
  /** Confiança do Gemini (0–1); null se foi escolhido/confirmado pelo utilizador. */
  confidence: number | null;
};

export function PhotoAnalyzer({ date, onSaved }: { date: string | null; onSaved: () => void }) {
  const { t } = useI18n();
  const errorMessage = useErrorMessage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<EditableItem[] | null>(null);

  // Liberta o object URL anterior sempre que a preview muda / o componente sai.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function pick(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast.error(t.photo.notImage);
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(t.photo.tooBig(MAX_SIZE_MB));
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setItems(null);
  }

  function clear() {
    setFile(null);
    setPreview(null);
    setItems(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function onAnalyze() {
    if (!file) return;
    setLoading(true);
    setItems(null);
    try {
      // Reduz a foto antes de enviar (muito mais rápido em redes móveis).
      const res = await analyzePhoto(await compressImage(file));
      setItems(
        res.items.map((it) => ({
          id: crypto.randomUUID(),
          name: it.name,
          grams: it.grams,
          food: it.food,
          learned: it.learned,
          manual: false,
          // Correções aprendidas já foram confirmadas pelo utilizador.
          confidence: it.learned ? null : it.confidence,
        })),
      );
    } catch (err) {
      toast.error(t.photo.analyzeFailed, { description: errorMessage(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0])}
      />

      {preview ? (
        <Card className="relative p-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- blob URL local, next/image não ajuda aqui */}
          <img
            src={preview}
            alt={t.photo.alt}
            className={cn(
              'aspect-4/3 w-full object-cover transition',
              loading && 'scale-[1.01] blur-[2px] brightness-75',
            )}
          />
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
              <Loader2Icon className="size-8 animate-spin" />
              <span className="text-sm font-medium drop-shadow">{t.photo.identifying}</span>
            </div>
          ) : (
            <div className="absolute top-3 right-3 flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="shadow-sm"
                onClick={() => inputRef.current?.click()}
              >
                <RefreshCwIcon /> {t.photo.change}
              </Button>
              <Button
                size="icon-sm"
                variant="secondary"
                className="shadow-sm"
                onClick={clear}
                aria-label={t.photo.remove}
              >
                <XIcon />
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            // Telemóvel: ícone em cima do texto. Ecrãs largos: faixa compacta, ícone ao lado.
            'flex h-44 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-card p-6 text-center transition-colors outline-none',
            'sm:h-36 sm:flex-row sm:gap-4 sm:text-left',
            'hover:border-primary/60 hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50',
            dragging && 'border-primary bg-primary/5',
          )}
        >
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ImagePlusIcon className="size-6" />
          </div>
          <div>
            <p className="font-medium">{t.photo.dropTitle}</p>
            <p className="text-sm text-muted-foreground">{t.photo.dropHint(MAX_SIZE_MB)}</p>
          </div>
        </button>
      )}

      {/* Só há botão de analisar quando há foto; sem foto, a alternativa é um link discreto. */}
      {!items && file && (
        <Button size="lg" className="h-11 w-full text-base" onClick={onAnalyze} disabled={loading}>
          {loading ? (
            <>
              <Loader2Icon className="animate-spin" /> {t.photo.analyzing}
            </>
          ) : (
            <>
              <SparklesIcon /> {t.photo.analyze}
            </>
          )}
        </Button>
      )}
      {!items && !file && (
        <div className="text-center">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setItems([])}>
            <KeyboardIcon /> {t.photo.orManual}
          </Button>
        </div>
      )}

      {items && !file && (
        <Button variant="ghost" size="sm" onClick={clear}>
          <XIcon /> {t.photo.cancel}
        </Button>
      )}

      {items && (
        <MealEditor
          items={items}
          setItems={setItems}
          date={date}
          fromPhoto={!!file}
          onSaved={() => {
            clear();
            onSaved();
          }}
        />
      )}
    </div>
  );
}

function MealEditor({
  items,
  setItems,
  date,
  fromPhoto,
  onSaved,
}: {
  items: EditableItem[];
  setItems: React.Dispatch<React.SetStateAction<EditableItem[] | null>>;
  date: string | null;
  fromPhoto: boolean;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const errorMessage = useErrorMessage();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(!fromPhoto);
  const [mealType, setMealType] = useState<MealType>(() => guessMealType());
  const [saving, setSaving] = useState(false);

  const total = useMemo(
    () => sumMacros(items.map((it) => (it.food ? scaleMacros(it.food, it.grams) : {}))),
    [items],
  );
  const savable = items.filter((it) => it.food && it.grams > 0);
  const unmatched = items.length - savable.length;

  const update = (id: string, patch: Partial<EditableItem>) =>
    setItems((prev) => prev && prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  async function replaceFood(item: EditableItem, food: PickedFood) {
    update(item.id, { food, learned: !item.manual, confidence: null });
    setEditing(null);
    if (item.manual) return;
    // Ensina a API: da próxima vez que o Gemini disser este nome, usa este alimento.
    try {
      await confirmFood(item.name, food);
      toast.success(t.editor.correctionSaved, {
        description: t.editor.correctionDescription(item.name, food.name),
      });
    } catch (err) {
      toast.error(t.editor.correctionFailed, { description: errorMessage(err) });
    }
  }

  function addFood(food: PickedFood, grams = 100) {
    setItems((prev) => [
      ...(prev ?? []),
      { id: crypto.randomUUID(), name: food.name, grams, food, learned: false, manual: true, confidence: null },
    ]);
    setAdding(false);
  }

  async function save() {
    if (!date) return;
    setSaving(true);
    try {
      await createMeal({
        date,
        type: mealType,
        items: savable.map((it) => ({ grams: it.grams, picked: it.food! })),
      });
      toast.success(t.editor.mealSaved(t.meals[mealType]), { description: `${total.kcal} kcal` });
      onSaved();
    } catch (err) {
      toast.error(t.editor.mealFailed, { description: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-in space-y-4 fade-in slide-in-from-bottom-2">
      {items.length > 0 && (
        <Card>
          <CardContent className="space-y-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.editor.estimatedTotal}</p>
                <p className="text-4xl font-semibold tracking-tight tabular-nums">
                  {total.kcal}
                  <span className="ml-1 text-base font-normal text-muted-foreground">kcal</span>
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
                <FlameIcon className="size-6" />
              </div>
            </div>
            <MacroBar total={total} />
            <MacroTiles total={total} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {t.editor.foods} <span className="text-muted-foreground">({items.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {fromPhoto && items.length === 0 && !adding && (
            <div className="flex items-center gap-3 text-muted-foreground">
              <CircleAlertIcon className="size-5 shrink-0" />
              {t.editor.noneFound}
            </div>
          )}

          <ul className="divide-y">
            {items.map((it) => (
              <FoodRow
                key={it.id}
                item={it}
                editing={editing === it.id}
                onEdit={() => setEditing(editing === it.id ? null : it.id)}
                onGrams={(grams) => update(it.id, { grams })}
                onRemove={() => setItems((prev) => prev && prev.filter((x) => x.id !== it.id))}
                onPick={(food) => replaceFood(it, food)}
              />
            ))}
          </ul>

          {adding ? (
            <FoodSearch onPick={addFood} onCancel={() => setAdding(false)} />
          ) : (
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <PlusIcon /> {t.editor.addFood}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
              <SelectTrigger className="h-11 w-40" aria-label={t.editor.mealType}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEAL_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t.meals[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="lg"
              className="h-11 flex-1 text-base"
              onClick={save}
              disabled={saving || savable.length === 0 || !date}
            >
              {saving ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
              {t.editor.saveMeal}
            </Button>
          </div>
          {unmatched > 0 && (
            <p className="text-xs text-muted-foreground">
              {t.editor.unmatched(unmatched)} <PencilIcon className="inline size-3" />{' '}
              {t.editor.unmatchedSuffix}
            </p>
          )}
        </CardContent>
      </Card>

      <p className="px-1 text-center text-xs text-muted-foreground">
        {fromPhoto ? t.editor.sourcePhoto : t.editor.sourceManual}
      </p>
    </div>
  );
}

function FoodRow({
  item,
  editing,
  onEdit,
  onGrams,
  onRemove,
  onPick,
}: {
  item: EditableItem;
  editing: boolean;
  onEdit: () => void;
  onGrams: (grams: number) => void;
  onRemove: () => void;
  onPick: (food: PickedFood) => void;
}) {
  const { t } = useI18n();
  const macros = item.food ? scaleMacros(item.food, item.grams) : null;
  // Título: o que o Gemini viu (em PT, ex.: "Francesinha"). Por baixo, o alimento da base de dados
  // usado para os macros — assim uma correspondência errada vê-se logo e corrige-se.
  // Itens adicionados à mão já são o próprio alimento.
  const name = item.manual ? (item.food?.name ?? item.name) : item.name;
  const matched = item.food && item.food.name.toLowerCase() !== name.toLowerCase() ? item.food.name : null;

  return (
    <li className="space-y-2 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1 basis-full sm:basis-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium" title={name}>
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </p>
            {item.learned && <Badge variant="secondary">{t.editor.learned}</Badge>}
            {item.food && item.confidence !== null && item.confidence < LOW_CONFIDENCE && (
              <Badge variant="outline" className="border-carbs/60 text-carbs" title={t.editor.lowConfidence}>
                {t.editor.confirm}
              </Badge>
            )}
            {item.food?.source === 'insa' && <Badge variant="secondary">INSA</Badge>}
            {!item.food && <Badge variant="destructive">{t.editor.noMatch}</Badge>}
          </div>
          {matched && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground" title={matched}>
              → {matched}
            </p>
          )}
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {macros ? <MacroInline macros={macros} /> : t.editor.identifiedAs(item.name)}
          </p>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <label className="relative">
            <span className="sr-only">{t.editor.grams}</span>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={5000}
              value={item.grams || ''}
              onChange={(e) => onGrams(Math.min(5000, Math.max(0, Math.round(Number(e.target.value)))))}
              className="h-8 w-20 pr-6 text-right tabular-nums"
            />
            <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">
              g
            </span>
          </label>
          <span className="w-16 text-right font-semibold tabular-nums">
            {macros ? macros.kcal : '–'}
            <span className="ml-0.5 text-xs font-normal text-muted-foreground">kcal</span>
          </span>
          <Button
            variant={editing ? 'secondary' : 'ghost'}
            size="icon-sm"
            onClick={onEdit}
            aria-label={t.editor.fixFood}
          >
            <PencilIcon />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label={t.editor.removeFood}>
            <Trash2Icon />
          </Button>
        </div>
      </div>

      {editing && <FoodSearch initialQuery={item.name} onPick={onPick} onCancel={onEdit} />}
    </li>
  );
}
