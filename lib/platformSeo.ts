export type SeoPlatformId =
  | 'all'
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'twitter'
  | 'pinterest'
  | 'threads'
  | 'capcut';

export interface PlatformSeoConfig {
  id: SeoPlatformId;
  slug: string;
  label: string;
  title: string;
  description: string;
  keywords: string[];
  h2Title: string;
  seoSummary: string;
  highlights: string[];
  sampleUrlFormat: string;
}

export const PLATFORM_SEO_LIST: PlatformSeoConfig[] = [
  {
    id: 'all',
    slug: '/',
    label: 'Semua Sosial Media',
    title: 'ZoneSaveALL – Downloader Video HD Tanpa Watermark Gratis',
    description:
      'Unduh video TikTok tanpa watermark, Instagram Reels, Facebook, YouTube, X, Pinterest, Threads & CapCut kualitas HD 100% gratis dan cepat.',
    keywords: [
      'video downloader gratis',
      'download tiktok tanpa watermark',
      'download reels instagram hd',
      'download capcut tanpa watermark',
      'zonesaveall',
    ],
    h2Title: 'Pengunduh Video & Audio Semua Sosial Media Gratis',
    seoSummary:
      'ZoneSaveALL memungkinkan Anda menyimpan video kualitas HD asli hingga 1080p tanpa tanda air serta audio MP3 dari delapan platform populer langsung melalui browser tanpa instalasi tambahan.',
    highlights: [
      'Mendukung TikTok, Instagram, Facebook, YouTube, X, Pinterest, Threads, dan CapCut.',
      'Kualitas 100% HD asli tanpa watermark dan konversi audio MP3 instan.',
      'Fitur antrean multi-link, simpan ke Google Drive, dan pemasangan PWA.',
    ],
    sampleUrlFormat: 'https://www.tiktok.com/... atau https://www.instagram.com/reel/...',
  },
  {
    id: 'tiktok',
    slug: '/tiktok-downloader',
    label: 'TikTok Downloader',
    title: 'Download Video TikTok Tanpa Watermark HD & MP3 – ZoneSaveALL',
    description:
      'Unduh video TikTok tanpa watermark kualitas Full HD 1080p dan ekstrak audio MP3 secara gratis, cepat, tanpa batas langsung dari browser.',
    keywords: [
      'download video tiktok tanpa watermark',
      'tiktok downloader hd',
      'unduh tiktok mp3',
      'simpan video tiktok gratis',
    ],
    h2Title: 'Cara Download Video TikTok Tanpa Watermark Kualitas HD',
    seoSummary:
      'Simpan video TikTok favorit Anda bersih tanpa logo atau ID kreator dalam format MP4 Full HD 1080p maupun 720p, lengkap dengan opsi unduhan slide foto ZIP dan audio MP3.',
    highlights: [
      'Hapus watermark TikTok otomatis dengan kualitas asli jernih.',
      'Mendukung video pendek, TikTok Slide/Carousel ZIP, serta musik MP3.',
      'Bisa langsung disimpan ke perangkat atau ke folder Google Drive Anda.',
    ],
    sampleUrlFormat: 'https://www.tiktok.com/@username/video/7123456789012345678',
  },
  {
    id: 'instagram',
    slug: '/instagram-downloader',
    label: 'Instagram Downloader',
    title: 'Download Reels, Video & Foto Instagram HD – ZoneSaveALL',
    description:
      'Simpan video Instagram Reels, postingan video, dan slide foto carousel kualitas HD asli tanpa watermark secara gratis dan cepat di HP atau PC.',
    keywords: [
      'download reels instagram',
      'instagram video downloader hd',
      'unduh foto carousel ig',
      'save ig reels gratis',
    ],
    h2Title: 'Pengunduh Instagram Reels, Video & Carousel Kualitas Asli',
    seoSummary:
      'Ekstrak tautan Instagram Reels, postingan feed, dan carousel multi-slide dalam resolusi tertinggi tanpa menurunkan ketajaman gambar atau audio.',
    highlights: [
      'Mendukung link /reel/, /p/, maupun tautan berbagi Instagram terbaru.',
      'Simpan seluruh foto dan video carousel sekaligus dalam satu arsip ZIP.',
      'Tidak perlu login akun Instagram untuk mengunduh konten publik.',
    ],
    sampleUrlFormat: 'https://www.instagram.com/reel/C8xYzAbCdEf/',
  },
  {
    id: 'facebook',
    slug: '/facebook-downloader',
    label: 'Facebook Downloader',
    title: 'Download Video & Reels Facebook HD MP4 Gratis – ZoneSaveALL',
    description:
      'Unduh video Facebook Watch, FB Reels, dan postingan publik format MP4 kualitas Full HD 1080p tanpa watermark secara gratis dan mudah.',
    keywords: [
      'download video facebook hd',
      'fb reels downloader',
      'unduh video fb watch mp4',
      'save video facebook gratis',
    ],
    h2Title: 'Simpan Video Facebook Watch & FB Reels Resolusi HD',
    seoSummary:
      'Konversi tautan video Facebook publik, fb.watch, dan Facebook Reels menjadi file MP4 HD yang siap diputar offline di galeri ponsel maupun komputer.',
    highlights: [
      'Mendukung format link facebook.com/watch, /reel/, /share/, dan fb.watch.',
      'Pilihan kualitas video HD jernih tanpa perlu memasang ekstensi browser.',
      'Proses cepat langsung dari browser mobile maupun desktop.',
    ],
    sampleUrlFormat: 'https://www.facebook.com/watch/?v=123456789012345',
  },
  {
    id: 'youtube',
    slug: '/youtube-downloader',
    label: 'YouTube Downloader',
    title: 'Download Video YouTube 1080p HD, Shorts & MP3 – ZoneSaveALL',
    description:
      'Unduh video YouTube dan YouTube Shorts hingga resolusi 1080p Full HD atau ekstrak audio MP3 jernih secara gratis langsung lewat browser.',
    keywords: [
      'download video youtube hd',
      'youtube shorts downloader',
      'convert youtube ke mp3',
      'unduh youtube 1080p gratis',
    ],
    h2Title: 'Unduh Video YouTube 1080p, Shorts & Ekstrak Audio MP3',
    seoSummary:
      'Pilih resolusi video YouTube mulai dari 360p, 480p, 720p HD, hingga 1080p Full HD sesuai ruang penyimpanan perangkat Anda, atau simpan audionya saja dalam format MP3.',
    highlights: [
      'Filter pilihan resolusi 1080p, 720p, 480p, dan 360p langsung di kartu hasil.',
      'Mendukung video reguler youtube.com/watch, youtu.be, dan YouTube Shorts.',
      'Tersedia pratinjau audio dan tombol unduh MP3 terpisah.',
    ],
    sampleUrlFormat: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  },
  {
    id: 'twitter',
    slug: '/twitter-downloader',
    label: 'X / Twitter Downloader',
    title: 'Download Video & GIF X (Twitter) HD MP4 Gratis – ZoneSaveALL',
    description:
      'Simpan video dan GIF dari postingan X atau Twitter dalam format MP4 resolusi tertinggi tanpa watermark secara gratis dan instan.',
    keywords: [
      'download video twitter hd',
      'x video downloader',
      'unduh gif twitter mp4',
      'save video x gratis',
    ],
    h2Title: 'Pengunduh Video & GIF Postingan X (Twitter) Kualitas Terbaik',
    seoSummary:
      'Tempel tautan x.com atau twitter.com untuk mengekstrak aliran video MP4 dengan bitrate tertinggi agar tetap tajam saat dibagikan ulang atau disimpan offline.',
    highlights: [
      'Otomatis memilih varian resolusi video tertinggi dari server X.',
      'Mendukung link x.com dan twitter.com termasuk video serta GIF animasi.',
      'Bisa dipratinjau langsung sebelum diunduh atau disimpan ke Google Drive.',
    ],
    sampleUrlFormat: 'https://x.com/username/status/1800000000000000000',
  },
  {
    id: 'pinterest',
    slug: '/pinterest-downloader',
    label: 'Pinterest Downloader',
    title: 'Download Video & Gambar Pinterest HD Asli – ZoneSaveALL',
    description:
      'Unduh video Idea Pin dan gambar Pinterest resolusi penuh tanpa pecah secara gratis menggunakan tautan pinterest.com atau pin.it.',
    keywords: [
      'download video pinterest hd',
      'pinterest image downloader',
      'unduh pin.it gratis',
      'save foto pinterest asli',
    ],
    h2Title: 'Simpan Video Pin & Gambar Pinterest Resolusi Penuh',
    seoSummary:
      'Ambil file video MP4 maupun gambar resolusi asli dari Pinterest dan tautan pendek pin.it tanpa tanda air atau penurunan kualitas kompresi.',
    highlights: [
      'Mendukung tautan panjang pinterest.com/pin/ maupun tautan pendek pin.it.',
      'Mendeteksi otomatis apakah Pin berupa video MP4 atau gambar resolusi tinggi.',
      'Cocok untuk menyimpan referensi desain, resep, dan inspirasi kreatif.',
    ],
    sampleUrlFormat: 'https://www.pinterest.com/pin/123456789012345678/',
  },
  {
    id: 'threads',
    slug: '/threads-downloader',
    label: 'Threads Downloader',
    title: 'Download Video & Foto Threads HD Gratis – ZoneSaveALL',
    description:
      'Simpan video dan foto postingan Threads dalam kualitas HD jernih tanpa watermark secara gratis dan cepat langsung dari browser.',
    keywords: [
      'download video threads',
      'threads downloader hd',
      'unduh foto threads gratis',
      'save threads video mp4',
    ],
    h2Title: 'Unduh Video, Foto & Carousel Threads Tanpa Aplikasi',
    seoSummary:
      'Ekstrak postingan video dan gambar dari threads.net atau threads.com ke file MP4 dan JPG resolusi asli tanpa perlu memasang aplikasi pihak ketiga.',
    highlights: [
      'Mendukung video tunggal, foto resolusi asli, dan carousel multi-item.',
      'Kompatibel dengan domain threads.net dan threads.com.',
      'Salin caption dan hashtag postingan dengan satu klik.',
    ],
    sampleUrlFormat: 'https://www.threads.net/@username/post/C8xYzAbCdEf',
  },
  {
    id: 'capcut',
    slug: '/capcut-downloader',
    label: 'CapCut Downloader',
    title: 'Download Video & Template CapCut Tanpa Watermark – ZoneSaveALL',
    description:
      'Unduh video dan pratinjau template CapCut 100% bersih tanpa watermark logo CapCut dalam kualitas HD MP4 secara gratis dan cepat.',
    keywords: [
      'download capcut tanpa watermark',
      'capcut video downloader hd',
      'unduh template capcut no wm',
      'hapus watermark capcut gratis',
    ],
    h2Title: 'Download Video & Template CapCut 100% Tanpa Watermark',
    seoSummary:
      'ZoneSaveALL mengekstrak aliran video sumber asli dari tautan template CapCut sehingga hasil unduhan MP4 Anda bersih dari logo watermark CapCut maupun akhir layar.',
    highlights: [
      'Mengambil aliran video asli tanpa watermark CapCut dalam kualitas HD.',
      'Mendukung tautan pendek capcut.com/t/... dan capcut.com/template-detail/...',
      'Dilengkapi filter kualitas serta opsi simpan langsung ke Google Drive.',
    ],
    sampleUrlFormat: 'https://www.capcut.com/t/Zs8abcXYZ/',
  },
];

export function getPlatformSeoById(id: SeoPlatformId): PlatformSeoConfig {
  return PLATFORM_SEO_LIST.find((item) => item.id === id) || PLATFORM_SEO_LIST[0];
}

export function getPlatformSeoByPath(pathname: string): PlatformSeoConfig | null {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return PLATFORM_SEO_LIST.find((item) => item.slug === clean) || null;
}

export function buildStructuredDataJson(seo: PlatformSeoConfig, baseUrl: string): string {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const pageUrl = seo.slug === '/' ? `${normalizedBase}/` : `${normalizedBase}${seo.slug}`;

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: 'ZoneSaveALL',
        url: pageUrl,
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'All',
        inLanguage: 'id',
        description: seo.description,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: `Apakah ${seo.label} di ZoneSaveALL gratis digunakan?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Ya, seluruh layanan pengunduh video HD tanpa watermark dan audio MP3 di ZoneSaveALL gratis tanpa registrasi.',
            },
          },
          {
            '@type': 'Question',
            name: 'Apakah hasil unduhan memiliki watermark?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Tidak. ZoneSaveALL mengekstrak aliran video asli tanpa watermark hingga kualitas HD 1080p.',
            },
          },
        ],
      },
    ],
  };

  return JSON.stringify(schema);
}
