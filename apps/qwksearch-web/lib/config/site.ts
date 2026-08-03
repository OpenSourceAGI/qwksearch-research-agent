// Icon components are no longer imported - we use string names instead
// and resolve them dynamically in client components

export const /** App Name in title case */
  APP_NAME: string = "QwkSearch",
  NEXT_PUBLIC_BASE_URL = "https://prod.qwksearch.com",
  NEXT_PUBLIC_GOOGLE_CLIENT_ID =
    "921732917742-79ql1h9hek2qsdn9f5vnk6lg26jq0vi2.apps.googleusercontent.com",
  /** App Email for support */
  APP_EMAIL: string = "support@qwksearch.com",
  /** Terms & Privacy Last Revised Date */
  LAST_REVISED_DATE: string = "2026-01-15",
  /** Windows product ID for native & URL links */
  DOWNLOAD_WINDOWS_STORE_ID: string = "9PCGF9GNK460",
  /** Download Button URL for Chrome extension  */
  DOWNLOAD_CHROME_URL: string =
    "https://chromewebstore.google.com/detail/tab-manager-ai/manhemnhmipdhdpabojcplebckhckeko",
  /** Default prompt template for article */
  DEFAULT_SUMMARIZE_PROMPT: string =
    "Summarize in bullet points and bold topics",
  /** Max char length for article body sent to the LLM */
  MAX_ARTICLE_LENGTH: number = 1500;

export const listFooterLinks: FooterLink[] = [
  // {
  //   url: "https://airesearch.js.org/docs/functions",
  //   text: "Docs",
  //   icon: "HelpCircle",
  // },
  {
    url: "https://www.linkedin.com/company/104158840/admin/page-posts/published/",
    text: "Blog",
    icon: "Newspaper",
  },
  {
    url: "https://discord.gg/SJdBqBz3tV",
    text: "Support",
    icon: "MessageCircle",
  },
  { url: "/legal/privacy", text: "Privacy", icon: "Lock" },
  { url: "https://rights.institute/ethics", text: "Ethics", icon: "Bot" },
  { url: "/enterprise", text: "Enterprise", icon: "Building2" },
];

export const SubscriptionPlans: SubscriptionPlan[] = [
  {
    name: "Free",
    description: "For individuals  exploring the power of AI Research Agents.",
    url: "#",
    price: 0,
    features: [
      { text: "Access to cutting-edge LLMs", icon: "Brain" },
      { text: "Discover curated content feed", icon: "Compass" },
      { text: "Standard response times", icon: "Clock" },
      { text: "Community support forums", icon: "MessageCircleQuestion" },
    ],
  },
  {
    name: "Pro",
    description: "For professionals who want custom advanced AI Agents.",
    url: "https://buy.stripe.com/8wMdTmdi1asl1xe3cc",
    price: 5,
    features: [
      // { text: '1,000 queries / 24 hours', icon: "Rocket" },
      { text: "Custom dataset integration", icon: "Database" },
      { text: "Custom-trained LLM agents", icon: "Sparkles" },
      { text: "Priority server response times", icon: "Gauge" },

      { text: "Dedicated priority support", icon: "Headphones" },
      { text: "In-depth history analytics ", icon: "BarChart3" },
      {
        text: "Test new features, LLMs, and future pleasant surprises",
        icon: "SmilePlus",
      },
    ],
  },
  {
    name: "Team",
    description: "For organizations & teams who need custom solutions.",
    url: "https://buy.stripe.com/bIY4iM3HrfMF4Jq28a",
    callURL: "https://calendly.com/qwksearch/30min",
    price: 99,
    features: [
      {
        text: "Custom plan for API integration into your infrastructure",
        icon: "Cog",
      },
      { text: "AI-led team collaboration & content discovery ", icon: "Globe" },
      { text: "LLM suggestions curated to  team dataset", icon: "Target" },
      { text: "Customer metrics & search trend analysis", icon: "BarChart2" },
      { text: "Unlimited queries", icon: "Infinity" },
      // { text: 'Multi-user account & dataset management', icon: "UserPlus"  },
    ],
  },
];

export const SearchCategories: Category[] = [
  {
    code: "general",
    icon: "/icons/categories/icon-search-web.svg",
    name: "Web",
  },
  {
    code: "news",
    icon: "/icons/categories/icon-search-news.svg",
    name: "News",
  },
  {
    code: "videos",
    icon: "/icons/categories/icon-search-videos.svg",
    name: "Videos",
  },
  {
    code: "images",
    icon: "/icons/categories/icon-search-images.svg",
    name: "Images",
  },
  {
    code: "science",
    icon: "/icons/categories/icon-search-academic.svg",
    name: "Academic",
  },
  {
    code: "files",
    icon: "/icons/categories/icon-search-files.svg",
    name: "Files",
  },
  { code: "it", icon: "/icons/categories/icon-search-tech.svg", name: "Tech" },
  {
    code: "shopping",
    icon: "/icons/categories/icon-search-shopping.svg",
    name: "Shopping",
  },
  // {
  //   code: "music",
  //   icon: "/icons/categories/icon-search-music.svg",
  //   name: "Music",
  // },
];

export interface FooterLink {
  /** Webpage URL external or internal */
  url: string;
  /** Label text of the url link */
  text: string;
  /** Lucide icon name as string */
  icon?: string;
}

export interface SubscriptionPlan {
  /** Display name of the plan (e.g., "Free", "Pro", "Team") */
  name: string;
  /** Short marketing description of who the plan is for */
  description?: string;
  /** Stripe checkout URL or placeholder for the plan */
  url: string;
  /** Monthly price in USD */
  price: number;
  /** Optional calendar scheduling URL for sales calls */
  callURL?: string;
  /** List of features included in this plan */
  features: {
    /** Description of the feature */
    text: string;
    /** Lucide icon name as string */
    icon: string;
  }[];
}

export interface Category {
  /** Unique identifier used for API queries and routing */
  code: string;
  /** Path to the category's SVG icon */
  icon: string;
  /** Display name shown in the UI */
  name: string;
}
