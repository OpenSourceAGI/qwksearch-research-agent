/**
 * Static array of search category metadata (code, SVG icon, display name) shared across CategoriesMenu,
 * FileUploadDropdown, and SearchSpotlight components.
 */
import iconSearchWeb from '@/components/ResearchAgent/icons/icon-search-web.svg';
import iconSearchNews from '@/components/ResearchAgent/icons/icon-search-news.svg';
import iconSearchVideos from '@/components/ResearchAgent/icons/icon-search-videos.svg';
import iconSearchImages from '@/components/ResearchAgent/icons/icon-search-images.svg';
import iconSearchAcademic from '@/components/ResearchAgent/icons/icon-search-academic.svg';
import iconSearchFiles from '@/components/ResearchAgent/icons/icon-search-files.svg';
import iconSearchTech from '@/components/ResearchAgent/icons/icon-search-tech.svg';

export const categories = [
  {
    code: "general",
    icon: iconSearchWeb,
    name: "Web",
  },
  {
    code: "news",
    icon: iconSearchNews,
    name: "News",
  },
  {
    code: "videos",
    icon: iconSearchVideos,
    name: "Videos",
  },
  {
    code: "images",
    icon: iconSearchImages,
    name: "Images",
  },
  {
    code: "science",
    icon: iconSearchAcademic,
    name: "Academic",
  },
  {
    code: "files",
    icon: iconSearchFiles,
    name: "Files",
  },
  { code: "it", icon: iconSearchTech, name: "Tech" },
];
