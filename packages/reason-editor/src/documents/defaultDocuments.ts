/**
 * @module defaultDocuments
 * @description Provides the seed document list used to pre-populate the editor
 * in a fresh environment with example content, folders, and nested notes.
 */
import type { Document } from "./DocumentTree";

/**
 * Initial set of example documents shown to first-time users.
 * Includes a welcome note, two folder nodes (Projects, Research), and
 * several child notes with sample HTML content.
 */
export const defaultDocuments: Document[] = [
  {
    id: "1",
    title: "Welcome to REASON",
    content:
      '<h1>Welcome to REASON</h1><p>A powerful note-taking app with nested documents.</p><h2>Features</h2><ul><li><p><strong>Rich text editing</strong> with WYSIWYG editor</p></li><li><p><strong>Nested documents</strong> for better organization</p></li><li><p><strong>Full-text search</strong> to find notes quickly</p></li><li><p><strong>Drag and drop</strong> to reorganize notes</p></li><li><p><strong>Right-click menus</strong> for quick actions</p></li><li><p><strong>Document outline</strong> view</p></li><li><p><strong>Local storage</strong> - your notes stay private</p></li><li><p><strong>Mobile-friendly</strong> with responsive drawer navigation</p></li></ul><h2>Getting Started</h2><p>On mobile, tap the menu icon to access your notes.</p><p>Click the "New Note" button to create your first note, or select this note to start editing.</p><p>You can also create child notes by right-clicking a note.</p><h3>Drag and Drop</h3><p>Drag notes to reorder them or move them under different parent notes.</p><h3>Outline View</h3><p>Click the outline icon to see all headings in the current document.</p><p>Press the search icon (or Ctrl+K) to quickly find any note.</p>',
    parentId: null,
    children: [],
    isExpanded: true,
    tags: [],
  },
  {
    id: "2",
    title: "Projects",
    content: "",
    parentId: null,
    children: [],
    isExpanded: true,
    isFolder: true,
    tags: [],
  },
  {
    id: "3",
    title: "Website Redesign",
    content:
      "<h1>Website Redesign</h1><p>Planning for the new website design.</p><h2>Goals</h2><ul><li><p>Modern, clean interface</p></li><li><p>Mobile-first approach</p></li><li><p>Improved accessibility</p></li></ul>",
    parentId: "2",
    children: [],
    isExpanded: false,
    tags: ["design", "web"],
  },
  {
    id: "4",
    title: "API Integration",
    content:
      "<h1>API Integration</h1><p>Notes on integrating the new REST API.</p><h2>Endpoints</h2><ul><li><p>GET /api/documents</p></li><li><p>POST /api/documents</p></li><li><p>PUT /api/documents/:id</p></li></ul>",
    parentId: "2",
    children: [],
    isExpanded: false,
    tags: ["development", "api"],
  },
  {
    id: "5",
    title: "Research",
    content: "",
    parentId: null,
    children: [],
    isExpanded: true,
    isFolder: true,
    tags: [],
  },
  {
    id: "6",
    title: "Market Analysis",
    content:
      "<h1>Market Analysis</h1><p>Research findings on market trends.</p><h2>Key Insights</h2><ul><li><p>Growing demand for productivity tools</p></li><li><p>Users prefer cloud-based solutions</p></li><li><p>Mobile access is essential</p></li></ul>",
    parentId: "5",
    children: [],
    isExpanded: false,
    tags: ["research", "business"],
  },
  {
    id: "7",
    title: "Competitor Review",
    content:
      "<h1>Competitor Review</h1><p>Analysis of competitor products.</p><h2>Top Competitors</h2><ul><li><p>Notion - Versatile but complex</p></li><li><p>Obsidian - Great for developers</p></li><li><p>Roam Research - Powerful linking</p></li></ul>",
    parentId: "5",
    children: [],
    isExpanded: false,
    tags: ["research", "competition"],
  },
  {
    id: "8",
    title: "Meeting Notes",
    content:
      "<h1>Meeting Notes</h1><p>Quick notes from today's team meeting.</p><h2>Action Items</h2><ul><li><p>Review PRs by EOD</p></li><li><p>Update documentation</p></li><li><p>Schedule next sprint planning</p></li></ul>",
    parentId: null,
    children: [],
    isExpanded: false,
    tags: ["meetings"],
  },
];
