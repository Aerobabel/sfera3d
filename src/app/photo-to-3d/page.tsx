'use client';

import Link from 'next/link';
import { ChangeEvent, DragEvent, FormEvent, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  Loader2,
  Sparkles,
  Upload
} from 'lucide-react';

type PreviewImage = {
  file: File;
  url: string;
};

type QualityPreset = 'standard' | 'hq' | 'ultra';

const QUALITY_LABELS: Record<QualityPreset, string> = {
  standard: 'Стандарт (быстро)',
  hq: 'Высокое качество',
  ultra: 'Ultra (максимум деталей)'
};

export default function PhotoTo3DPrototypePage() {
  const [images, setImages] = useState<PreviewImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [quality, setQuality] = useState<QualityPreset>('hq');
  const [notes, setNotes] = useState('');

  const hasImages = images.length > 0;

  const replaceImages = (files: FileList | null) => {
    if (!files) return;
    const nextImages = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, 12)
      .map((file) => ({
        file,
        url: URL.createObjectURL(file)
      }));

    if (!nextImages.length) return;

    setImages((prev) => {
      prev.forEach((image) => URL.revokeObjectURL(image.url));
      return nextImages;
    });
    setIsReady(false);
    setProgress(0);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    replaceImages(event.target.files);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    replaceImages(event.dataTransfer.files);
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleGenerate = (event: FormEvent) => {
    event.preventDefault();
    if (!hasImages) return;
    setIsReady(false);
    setProgress(0);
    setIsProcessing(true);
  };

  useEffect(() => {
    if (!isProcessing) return;

    const timer = window.setInterval(() => {
      setProgress((previous) => {
        const next = Math.min(previous + Math.floor(Math.random() * 12) + 7, 100);
        if (next >= 100) {
          window.clearInterval(timer);
          setIsProcessing(false);
          setIsReady(true);
        }
        return next;
      });
    }, 280);

    return () => window.clearInterval(timer);
  }, [isProcessing]);

  useEffect(() => {
    return () => {
      images.forEach((image) => URL.revokeObjectURL(image.url));
    };
  }, [images]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">3DSFERA LAB</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Прототип: Фото в 3D
            </h1>
            <p className="mt-2 text-sm text-slate-400 sm:text-base">
              Загрузите даже неидеальные фото, а система восстановит качественную 3D-модель.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            На главную
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-6">
            <h2 className="text-lg font-semibold">1) Загрузка фотографий</h2>
            <p className="mt-1 text-sm text-slate-400">
              Минимум 3 ракурса. Можно размытые, шумные или с неидеальным освещением.
            </p>

            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleInputChange}
            />

            <label
              htmlFor="photo-upload"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`mt-4 block cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
                isDragging
                  ? 'border-cyan-300 bg-cyan-500/10'
                  : 'border-white/20 bg-black/20 hover:border-cyan-200/70 hover:bg-cyan-500/5'
              }`}
            >
              <Upload className="mx-auto h-8 w-8 text-cyan-300" />
              <p className="mt-3 text-sm font-medium">
                Нажмите для выбора файлов или перетащите фото сюда
              </p>
              <p className="mt-1 text-xs text-slate-400">
                JPG / PNG / WEBP, до 12 фото
              </p>
            </label>

            {hasImages && (
              <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {images.map((image) => (
                  <div
                    key={image.url}
                    className="overflow-hidden rounded-xl border border-white/10 bg-black/30"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={image.file.name}
                      className="h-24 w-full object-cover"
                    />
                    <p className="truncate px-2 py-1 text-[11px] text-slate-400">
                      {image.file.name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-6">
            <h2 className="text-lg font-semibold">2) Параметры генерации</h2>

            <form className="mt-4 space-y-5" onSubmit={handleGenerate}>
              <div>
                <p className="text-sm font-medium text-slate-300">Целевое качество</p>
                <div className="mt-2 space-y-2">
                  {(['standard', 'hq', 'ultra'] as QualityPreset[]).map((preset) => (
                    <label
                      key={preset}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
                    >
                      <input
                        type="radio"
                        name="quality"
                        value={preset}
                        checked={quality === preset}
                        onChange={() => setQuality(preset)}
                      />
                      <span>{QUALITY_LABELS[preset]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300" htmlFor="notes">
                  Комментарий к заказу (опционально)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Например: нужен GLB для Web, с чистыми PBR-текстурами"
                  className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm outline-none ring-cyan-300/40 focus:ring"
                />
              </div>

              <button
                type="submit"
                disabled={!hasImages || isProcessing}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40 hover:bg-cyan-400 transition"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Сгенерировать 3D-модель
                  </>
                )}
              </button>
            </form>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-6">
          <h2 className="text-lg font-semibold">3) Результат</h2>

          {!hasImages && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              Сначала загрузите фото для запуска прототипа.
            </div>
          )}

          {hasImages && isProcessing && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-300">Обработка в облаке</span>
                <span className="font-semibold text-cyan-300">{progress}%</span>
              </div>
              <div className="h-3 rounded-full bg-black/40">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {hasImages && isReady && (
            <div className="mt-4 rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-4">
              <p className="text-sm font-semibold text-emerald-200">
                Модель готова. Это демонстрационный прототип UX.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm text-slate-200 hover:bg-black/40 transition"
                >
                  <Download className="h-4 w-4" />
                  Скачать .glb
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm text-slate-200 hover:bg-black/40 transition"
                >
                  <Download className="h-4 w-4" />
                  Скачать .usdz
                </button>
                <Link
                  href="/experience"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20 transition"
                >
                  Открыть в шоуруме
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
