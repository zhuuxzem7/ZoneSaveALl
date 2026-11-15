export type SocialPlatform =
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'twitter'
  | 'pinterest'
  | 'threads'
  | 'capcut';

export type PlatformTab = 'all' | SocialPlatform;

export interface MediaAuthor {
  nickname: string;
  uniqueId: string;
  avatar: string;
}

export interface MediaStats {
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
}

export interface MediaCarouselItem {
  type: 'video' | 'image';
  url: string;
  thumbnail?: string;
}

export interface MediaDownloadResult {
  platform: SocialPlatform;
  id: string;
  title: string;
  cover: string;
  play: string;
  hdplay: string;
  music: string;
  sdLabel?: string;
  hdLabel?: string;
  image?: string;
  mediaItems?: MediaCarouselItem[];
  duration: number;
  size: number;
  hdSize: number;
  stats: MediaStats;
  author: MediaAuthor;
}
