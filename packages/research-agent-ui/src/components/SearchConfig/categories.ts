/**
 * Static array of search category metadata (code, SVG icon, display name) shared across CategoriesMenu,
 * FileUploadDropdown, and SearchSpotlight components.
 */
import IconSearchWeb from '../../icons/IconSearchWeb';
import IconSearchNews from '../../icons/IconSearchNews';
import IconSearchVideos from '../../icons/IconSearchVideos';
import IconSearchImages from '../../icons/IconSearchImages';
import IconSearchAcademic from '../../icons/IconSearchAcademic';
import IconSearchFiles from '../../icons/IconSearchFiles';
import IconSearchTech from '../../icons/IconSearchTech';

export const categories = [
  {
    code: "general",
    icon: IconSearchWeb,
    name: "Web",
  },
  {
    code: "news",
    icon: IconSearchNews,
    name: "News",
  },
  {
    code: "videos",
    icon: IconSearchVideos,
    name: "Videos",
  },
  {
    code: "images",
    icon: IconSearchImages,
    name: "Images",
  },
  {
    code: "science",
    icon: IconSearchAcademic,
    name: "Academic",
  },
  {
    code: "files",
    icon: IconSearchFiles,
    name: "Files",
  },
  { code: "it", icon: IconSearchTech, name: "Tech" },
];
