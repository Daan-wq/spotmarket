export interface IgDemographics {
  countries: Record<string, number>;
  genders: { male?: number; female?: number; unknown?: number };
  ages: {
    "13-17"?: number;
    "18-24"?: number;
    "25-34"?: number;
    "35-44"?: number;
    "45-54"?: number;
    "55-64"?: number;
    "65+"?: number;
  };
  cities?: Record<string, number>;
}

export interface IgMediaItem {
  id: string;
  caption: string | null;
  media_type: string;
  media_product_type: string;
  permalink: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
  media_url: string | null;
  thumbnail_url: string | null;
}

export interface ComputedCreatorStats {
  topCountry: string | null;
  topCountryPercent: number | null;
  malePercent: number | null;
  age18PlusPercent: number | null;
}
