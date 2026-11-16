import { useState } from 'react';
import { CheckCircle2, ChevronDown } from 'lucide-react';
import type { PlatformTab } from '../types/media';
import { PLATFORM_LIST, PlatformLogo } from './PlatformLogo';
import { getPlatformSeoById } from '../../lib/platformSeo';

interface InfoSectionsProps {
  activePlatform?: PlatformTab;
  onSelectPlatform: (platform: PlatformTab) => void;
}

const STEPS = [
  {
    number: '01.',
    title: 'Salin Tautan Sosial Media',
    description:
      'Buka aplikasi TikTok, Instagram, Facebook, YouTube, X, Pinterest, Threads, atau CapCut, lalu pilih Bagikan dan Salin Tautan.',
  },
  {
    number: '02.',
    title: 'Tempel & Deteksi Otomatis',
    description:
      'Tempel tautan ke kolom input ZoneSaveALL. Logo dan sistem pengunduh otomatis menyesuaikan platform dari tautan Anda.',
  },
  {
    number: '03.',
    title: 'Simpan MP4, HD, atau MP3',
    description:
      'Klik tombol hijau untuk menyimpan video MP4 tanpa watermark, kualitas HD asli (hingga 1080p), carousel ZIP, atau audio MP3.',
  },
];

const FEATURES = [
  {
    title: 'Satu Halaman Semua Sosial Media',
    description:
      'Mendukung TikTok, Instagram, Facebook, YouTube MP4/MP3, X/Twitter, Pinterest, Threads, dan CapCut dalam satu halaman ringkas.',
  },
  {
    title: 'Deteksi Logo & Link Otomatis',
    description:
      'Cukup tempel link apa saja — kolom input langsung menampilkan logo platform yang sesuai tanpa perlu berpindah situs.',
  },
  {
    title: 'Resolusi Asli 1080p/720p HD & ZIP',
    description:
      'Opsi HD selalu memilih aliran video bitrate tertinggi (1080p/720p), plus unduh seluruh slide carousel ke file ZIP sekaligus.',
  },
  {
    title: 'Berjalan di Semua Perangkat & PWA',
    description:
      'Bisa dipasang ke Layar Utama Android & PC serta mendukung Share Sheet langsung dari aplikasi sosial media Anda.',
  },
];

const FAQS = [
  {
    question: 'Platform sosial media apa saja yang bisa diunduh di ZoneSaveALL?',
    answer:
      'ZoneSaveALL mendukung pengunduhan video, foto, dan audio dari TikTok (tanpa watermark), Instagram (Reels, Post, Carousel), Facebook (Watch & Reels), YouTube (Video & Shorts MP4/MP3), X / Twitter, Pinterest, Threads, serta CapCut.',
  },
  {
    question: 'Apakah saya harus memilih tab platform secara manual sebelum menempel link?',
    answer:
      'Tidak wajib. Di mode Semua Media (maupun di halaman platform mana pun), sistem otomatis mendeteksi jenis tautan yang Anda tempel dan menampilkan logo platform yang sesuai.',
  },
  {
    question: 'Apakah tombol Kualitas HD benar-benar mengunduh video resolusi HD?',
    answer:
      'Ya. Opsi Kualitas HD mengekstrak aliran MP4 resolusi tertinggi (1080p Full HD atau 720p HD dengan bitrate terbaik sesuai sumber video asli) tanpa mengurangi kejernihan video.',
  },
  {
    question: 'Di mana file video MP4, gambar, atau audio MP3 tersimpan setelah diunduh?',
    answer:
      'File otomatis masuk ke folder Unduhan (Downloads) bawaan browser di HP Android, iPhone (aplikasi File), maupun komputer Windows dan Mac Anda.',
  },
  {
    question: 'Mengapa tombol Kualitas HD meminta menunggu 10 detik?',
    answer:
      'Opsi HD memakai pemrosesan tautan beresolusi penuh dan didukung oleh iklan banner selama 10 detik agar layanan tetap gratis untuk semua pengguna.',
  },
];

export default function InfoSections({
  activePlatform = 'all',
  onSelectPlatform,
}: InfoSectionsProps) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const socialPlatforms = PLATFORM_LIST.filter((p) => p.id !== 'all');
  const activeSeo = getPlatformSeoById(activePlatform);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-7 sm:py-10 space-y-9 sm:space-y-11">
      {/* Section: Dynamic Platform SEO Guide */}
      <section
        aria-label={activeSeo.h2Title}
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 transition-colors duration-200"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7">
            <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {activeSeo.h2Title}
            </h2>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {activeSeo.seoSummary}
            </p>
            <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400">
              Contoh format tautan:{' '}
              <code className="font-mono text-slate-700 dark:text-slate-300 break-all">
                {activeSeo.sampleUrlFormat}
              </code>
            </p>
          </div>

          <ul className="lg:col-span-5 space-y-2 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 pt-4 lg:pt-0 lg:pl-5">
            {activeSeo.highlights.map((point) => (
              <li
                key={point}
                className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
              >
                <CheckCircle2
                  className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Section: Supported Platforms Directory with Crawlable SEO Links */}
      <section
        id="platform-list"
        aria-label="Platform yang Didukung"
        className="scroll-mt-20"
      >
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Downloader Semua Sosial Media
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Pilih halaman platform di bawah ini atau langsung tempel tautan di atas.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
          {socialPlatforms.map((platform) => {
            const seoItem = getPlatformSeoById(platform.id);
            const isActive = activePlatform === platform.id;
            return (
              <a
                key={platform.id}
                href={seoItem.slug}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectPlatform(platform.id);
                }}
                className={`group flex flex-row sm:flex-col items-center sm:justify-center gap-2.5 rounded-xl border px-3.5 py-3 sm:p-4 text-left sm:text-center hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-sm transition-all cursor-pointer ${
                  isActive
                    ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <span
                  className={`inline-flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg shadow-xs transition-transform duration-200 group-hover:scale-105 ${platform.brandBg}`}
                >
                  <PlatformLogo platform={platform.id} className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>
                <span className="font-display text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap truncate">
                  {platform.shortName}
                </span>
              </a>
            );
          })}
        </div>
      </section>

      {/* Section: Cara Unduh */}
      <section
        id="cara-unduh"
        className="scroll-mt-20 border-t border-slate-200 dark:border-slate-800 pt-7 sm:pt-9"
      >
        <div className="max-w-2xl">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Cara Mengunduh Video &amp; Audio
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Tiga langkah praktis menyimpan konten favorit ke perangkat Anda.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-5">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 transition-colors duration-200"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 tabular-nums">
                  {step.number}
                </span>
                <h3 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  {step.title}
                </h3>
              </div>
              <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Section: Fitur Unggulan */}
      <section
        id="fitur"
        className="scroll-mt-20 border-t border-slate-200 dark:border-slate-800 pt-7 sm:pt-9"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          <div className="lg:col-span-4">
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Cepat, Bersih &amp; Lengkap
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Dukungan otomatis berbagai jaringan sosial media populer dengan kualitas HD asli.
            </p>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {FEATURES.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors duration-200"
              >
                <h3 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section: FAQ */}
      <section
        id="faq"
        className="scroll-mt-20 border-t border-slate-200 dark:border-slate-800 pt-7 sm:pt-9"
      >
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 text-center">
            Pertanyaan yang Sering Diajukan
          </h2>

          <div className="mt-5 divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors duration-200">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={faq.question}>
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 px-4 sm:px-5 py-3.5 text-left text-sm font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-3.5 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
