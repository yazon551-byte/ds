export type Locale = "en" | "ar";

export type Localized = Record<Locale, string>;

export type Status = "ready" | "soon";

export type Difficulty =
  | "Beginner"
  | "Intermediate"
  | "Advanced"
  | "Expert";

export type CategoryId =
  | "foundations"
  | "load-balancing"
  | "resilience"
  | "data"
  | "communication"
  | "advanced";

export interface CategoryMeta {
  id: CategoryId;
  name: Localized;
  icon: string;
}

export interface ModuleMeta {
  /** URL slug, e.g. "load-balancer" -> /labs/load-balancer */
  slug: string;
  title: Localized;
  tagline: Localized;
  category: CategoryId;
  difficulty: Difficulty;
  /** Which lecture(s) this maps to. */
  lecture: Localized;
  /** Emoji icon (no extra dependency needed). */
  icon: string;
  status: Status;
}
