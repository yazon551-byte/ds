/** UI strings (English). */
export const ui = {
  en: {
    brand: "Distributed Systems Lab",
    nav_modules: "Modules",
    theme_toLight: "Light mode",
    theme_toDark: "Dark mode",
    hero_title: "Distributed Systems Lab",
    hero_subtitle:
      "A set of interactive simulations for core distributed-systems concepts — load balancing, fault tolerance, sharding, replication, messaging, and consensus.",
    hero_cta: "Browse the modules",
    modules_heading: "Modules",
    footer_line: "Interactive simulations of distributed-systems concepts.",
  },
} as const;

export type Dict = typeof ui.en;
