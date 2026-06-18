import type { Difficulty, Locale } from "./types";

/** UI string dictionary, keyed by locale. */
export const ui = {
  en: {
    brand: "Distributed Systems Lab",
    brandShort: "DS Lab",
    nav_modules: "Modules",
    nav_about: "About",
    theme_toLight: "Light mode",
    theme_toDark: "Dark mode",
    lang_switch: "العربية",

    hero_kicker: "Interactive Distributed Systems",
    hero_title: "Learn distributed systems by playing with them.",
    hero_subtitle:
      "A hands-on lab that turns every concept from the course — load balancing, fault tolerance, sharding, replication, RPC and more — into a live, interactive simulation you can run in your browser.",
    hero_cta_primary: "Explore the modules",
    hero_cta_secondary: "What is this?",
    hero_stat_modules: "Modules",
    hero_stat_ready: "Ready now",
    hero_stat_topics: "Course topics",

    modules_heading: "Lab Modules",
    modules_sub:
      "Each module maps directly to a lecture from the course. Start anywhere.",

    badge_ready: "Ready",
    badge_soon: "Coming soon",
    open_module: "Open module",
    lecture_label: "Maps to",

    about_heading: "About this project",
    about_body:
      "The course teaches distributed systems with Java RMI examples. Since Java RMI can't run on the web, this lab re-creates the same ideas as interactive browser simulations — so you can see latency, failures, routing and consensus happen in real time. Built with Next.js, TypeScript and Tailwind, deployed on Vercel.",

    footer_built: "Built for the Distributed Systems course",
    footer_tagline: "Concepts you can click.",

    difficulty: {
      Beginner: "Beginner",
      Intermediate: "Intermediate",
      Advanced: "Advanced",
      Expert: "Expert",
    } as Record<Difficulty, string>,
  },

  ar: {
    brand: "مختبر الأنظمة الموزّعة",
    brandShort: "مختبر الموزّعة",
    nav_modules: "الوحدات",
    nav_about: "حول",
    theme_toLight: "الوضع الفاتح",
    theme_toDark: "الوضع الداكن",
    lang_switch: "English",

    hero_kicker: "أنظمة موزّعة تفاعلية",
    hero_title: "تعلّم الأنظمة الموزّعة عن طريق اللعب بها.",
    hero_subtitle:
      "مختبر عملي يحوّل كل مفهوم من المادة — موازنة الأحمال، تحمّل الأعطال، التقسيم، النسخ المتماثل، الاستدعاء عن بُعد وغيرها — إلى محاكاة حيّة تفاعلية تشغّلها من متصفّحك.",
    hero_cta_primary: "استكشف الوحدات",
    hero_cta_secondary: "شو هاد؟",
    hero_stat_modules: "وحدة",
    hero_stat_ready: "جاهزة الآن",
    hero_stat_topics: "مواضيع المادة",

    modules_heading: "وحدات المختبر",
    modules_sub: "كل وحدة مرتبطة مباشرةً بمحاضرة من المادة. ابدأ من أي مكان.",

    badge_ready: "جاهزة",
    badge_soon: "قريباً",
    open_module: "افتح الوحدة",
    lecture_label: "مرتبطة بـ",

    about_heading: "حول هذا المشروع",
    about_body:
      "المادة تشرح الأنظمة الموزّعة بأمثلة Java RMI. وبما أن Java RMI لا تعمل على الويب، يعيد هذا المختبر بناء الأفكار نفسها كمحاكاة تفاعلية في المتصفّح — لتشاهد التأخير والأعطال والتوزيع والتوافق وهي تحدث مباشرةً. مبني بـ Next.js و TypeScript و Tailwind، ومرفوع على Vercel.",

    footer_built: "صُنع لمادة الأنظمة الموزّعة",
    footer_tagline: "مفاهيم يمكنك النقر عليها.",

    difficulty: {
      Beginner: "مبتدئ",
      Intermediate: "متوسّط",
      Advanced: "متقدّم",
      Expert: "خبير",
    } as Record<Difficulty, string>,
  },
} as const;

export type Dict = (typeof ui)[Locale];
