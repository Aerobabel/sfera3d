'use client';

import Link from 'next/link';
import { ChangeEvent, DragEvent, FormEvent, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  Loader2,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageProvider';

type PreviewImage = {
  file: File;
  url: string;
};

type QualityPreset = 'standard' | 'hq' | 'ultra';

const copy = {
  en: {
    lab: '3DSFERA LAB',
    title: 'Prototype: Photo to 3D',
    subtitle:
      'Upload imperfect photos and let the pipeline reconstruct a clean 3D-ready model.',
    back: 'Back to Home',
    step1: '1) Upload Photos',
    step1Hint: 'Minimum 3 angles. Blur, noise, or imperfect lighting are acceptable.',
    uploadMain: 'Click to choose files or drag photos here',
    uploadHint: 'JPG / PNG / WEBP, up to 12 photos',
    step2: '2) Generation Settings',
    quality: 'Target Quality',
    qualityLabels: {
      standard: 'Standard (Fast)',
      hq: 'High Quality',
      ultra: 'Ultra (Maximum Detail)',
    } as Record<QualityPreset, string>,
    notes: 'Order Notes (Optional)',
    notesPlaceholder: 'Example: need GLB for web with clean PBR textures',
    generating: 'Generating...',
    generateButton: 'Generate 3D Model',
    step3: '3) Result',
    uploadWarning: 'Upload photos first to run the prototype.',
    cloudProcess: 'Cloud Processing',
    readyTitle: 'Model is ready. This is a UX prototype demo.',
    downloadGlb: 'Download .glb',
    downloadUsdz: 'Download .usdz',
    openShowroom: 'Open in Showroom',
  },
  ru: {
    lab: '3DSFERA LAB',
    title: 'Прототип: Фото в 3D',
    subtitle:
      'Загрузите даже неидеальные фото, а система восстановит качественную 3D-модель.',
    back: 'На главную',
    step1: '1) Загрузка фотографий',
    step1Hint: 'Минимум 3 ракурса. Можно размытые, шумные или с неидеальным освещением.',
    uploadMain: 'Нажмите для выбора файлов или перетащите фото сюда',
    uploadHint: 'JPG / PNG / WEBP, до 12 фото',
    step2: '2) Параметры генерации',
    quality: 'Целевое качество',
    qualityLabels: {
      standard: 'Стандарт (быстро)',
      hq: 'Высокое качество',
      ultra: 'Ultra (максимум деталей)',
    } as Record<QualityPreset, string>,
    notes: 'Комментарий к заказу (опционально)',
    notesPlaceholder: 'Например: нужен GLB для Web с чистыми PBR-текстурами',
    generating: 'Генерация...',
    generateButton: 'Сгенерировать 3D-модель',
    step3: '3) Результат',
    uploadWarning: 'Сначала загрузите фото для запуска прототипа.',
    cloudProcess: 'Обработка в облаке',
    readyTitle: 'Модель готова. Это демонстрационный прототип UX.',
    downloadGlb: 'Скачать .glb',
    downloadUsdz: 'Скачать .usdz',
    openShowroom: 'Открыть в шоуруме',
  },
  zh: {
    lab: '3DSFERA LAB',
    title: '原型：照片转 3D',
    subtitle: '上传不完美照片，系统也能重建高质量 3D 模型。',
    back: '返回首页',
    step1: '1) 上传照片',
    step1Hint: '至少 3 个角度。模糊、噪点或光线不理想也可处理。',
    uploadMain: '点击选择文件或将照片拖拽到此处',
    uploadHint: 'JPG / PNG / WEBP，最多 12 张',
    step2: '2) 生成参数',
    quality: '目标质量',
    qualityLabels: {
      standard: '标准（更快）',
      hq: '高质量',
      ultra: 'Ultra（最高细节）',
    } as Record<QualityPreset, string>,
    notes: '订单备注（可选）',
    notesPlaceholder: '例如：需要用于 Web 的 GLB，包含干净的 PBR 贴图',
    generating: '生成中...',
    generateButton: '生成 3D 模型',
    step3: '3) 结果',
    uploadWarning: '请先上传照片再运行原型。',
    cloudProcess: '云端处理中',
    readyTitle: '模型已生成。这是一个 UX 演示原型。',
    downloadGlb: '下载 .glb',
    downloadUsdz: '下载 .usdz',
    openShowroom: '在展厅中打开',
  },
} as const;

export default function PhotoTo3DPrototypePage() {
  const { language } = useLanguage();
  const t = copy[language];

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
        url: URL.createObjectURL(file),
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
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">{t.lab}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h1>
            <p className="mt-2 text-sm text-slate-400 sm:text-base">{t.subtitle}</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.back}
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-6">
            <h2 className="text-lg font-semibold">{t.step1}</h2>
            <p className="mt-1 text-sm text-slate-400">{t.step1Hint}</p>

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
              <p className="mt-3 text-sm font-medium">{t.uploadMain}</p>
              <p className="mt-1 text-xs text-slate-400">{t.uploadHint}</p>
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
                    <p className="truncate px-2 py-1 text-[11px] text-slate-400">{image.file.name}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-6">
            <h2 className="text-lg font-semibold">{t.step2}</h2>

            <form className="mt-4 space-y-5" onSubmit={handleGenerate}>
              <div>
                <p className="text-sm font-medium text-slate-300">{t.quality}</p>
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
                      <span>{t.qualityLabels[preset]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300" htmlFor="notes">
                  {t.notes}
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={t.notesPlaceholder}
                  className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm outline-none ring-cyan-300/40 focus:ring"
                />
              </div>

              <button
                type="submit"
                disabled={!hasImages || isProcessing}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.generating}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {t.generateButton}
                  </>
                )}
              </button>
            </form>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-6">
          <h2 className="text-lg font-semibold">{t.step3}</h2>

          {!hasImages && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              {t.uploadWarning}
            </div>
          )}

          {hasImages && isProcessing && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-300">{t.cloudProcess}</span>
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
              <p className="text-sm font-semibold text-emerald-200">{t.readyTitle}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm text-slate-200 transition hover:bg-black/40"
                >
                  <Download className="h-4 w-4" />
                  {t.downloadGlb}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm text-slate-200 transition hover:bg-black/40"
                >
                  <Download className="h-4 w-4" />
                  {t.downloadUsdz}
                </button>
                <Link
                  href="/experience"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/20"
                >
                  {t.openShowroom}
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
