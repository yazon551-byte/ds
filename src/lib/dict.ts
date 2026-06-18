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
      "A hands-on lab that turns core distributed-systems concepts — load balancing, fault tolerance, sharding, replication, RPC and more — into live, interactive simulations you can run in your browser.",
    hero_cta_primary: "Explore the modules",
    hero_cta_secondary: "What is this?",
    hero_stat_modules: "Modules",
    hero_stat_ready: "Ready now",
    hero_stat_topics: "Topics",

    modules_heading: "Lab Modules",
    modules_sub: "Each module is a self-contained, interactive simulation. Start anywhere.",

    badge_ready: "Ready",
    badge_soon: "Coming soon",
    open_module: "Open module",

    about_heading: "About this project",
    about_body:
      "Distributed Systems Lab turns abstract infrastructure ideas into interactive, visual simulations you can run right in your browser. Each module is a self-contained playground: change the parameters, inject failures, and watch how real systems behave under load. Built with Next.js, TypeScript and Tailwind.",

    footer_tagline: "Concepts you can click.",
    footer_built: "An interactive playground for distributed systems",

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
      "مختبر عملي يحوّل المفاهيم الأساسية للأنظمة الموزّعة — موازنة الأحمال، تحمّل الأعطال، التقسيم، النسخ المتماثل، الاستدعاء عن بُعد وغيرها — إلى محاكاة حيّة تفاعلية تشغّلها من متصفّحك.",
    hero_cta_primary: "استكشف الوحدات",
    hero_cta_secondary: "شو هاد؟",
    hero_stat_modules: "وحدة",
    hero_stat_ready: "جاهزة الآن",
    hero_stat_topics: "مواضيع",

    modules_heading: "وحدات المختبر",
    modules_sub: "كل وحدة محاكاة تفاعلية مستقلة. ابدأ من أي مكان.",

    badge_ready: "جاهزة",
    badge_soon: "قريباً",
    open_module: "افتح الوحدة",

    about_heading: "حول هذا المشروع",
    about_body:
      "يحوّل «مختبر الأنظمة الموزّعة» الأفكار التجريدية للبنية التحتية إلى محاكاة بصرية تفاعلية تشغّلها مباشرةً في متصفّحك. كل وحدة ساحة مستقلة: عدّل المعطيات، احقن الأعطال، وراقب كيف تتصرّف الأنظمة الحقيقية تحت الحِمل. مبني بـ Next.js و TypeScript و Tailwind.",

    footer_tagline: "مفاهيم يمكنك النقر عليها.",
    footer_built: "ساحة تفاعلية لمفاهيم الأنظمة الموزّعة",

    difficulty: {
      Beginner: "مبتدئ",
      Intermediate: "متوسّط",
      Advanced: "متقدّم",
      Expert: "خبير",
    } as Record<Difficulty, string>,
  },
} as const;

export type Dict = (typeof ui)[Locale];
