/** UI strings (English). */
export const ui = {
  en: {
    brand: "Distributed Systems Lab",
    theme_toLight: "Light mode",
    theme_toDark: "Dark mode",
    hero_title: "Distributed Systems Lab",
    hero_subtitle:
      "A set of interactive simulations for core distributed-systems concepts — load balancing, fault tolerance, sharding, replication, messaging, and consensus.",
    hero_download: "Download project explanation (PDF)",
    hero_view: "or read it in the browser",
    modules_heading: "Modules",
    modules_intro:
      "New here? Start with The Three Horsemen — it shows the three problems every distributed system fights. Each module after it takes one problem and lets you play with a real solution: press play, work through the experiments pinned at the top, and read the “what just happened” notes as you go.",
    footer_line: "Interactive simulations of distributed-systems concepts.",
  },
} as const;

export type Dict = typeof ui.en;
