# Memory Types - Visual Guide

## Visual Reference

### Memory Type Color Scheme

```
┌─────────────────────────────────────────────────────────────────┐
│                      MEMORY TYPES                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🔵  USER PROFILE           (Blue)                             │
│  ├─ Color: bg-blue-500/10, text-blue-600                       │
│  ├─ Badge: "User Profile"                                      │
│  └─ Icon: Person/Circle                                        │
│                                                                 │
│  🟠  FEEDBACK               (Amber)                             │
│  ├─ Color: bg-amber-500/10, text-amber-600                     │
│  ├─ Badge: "Feedback"                                          │
│  └─ Icon: MessageCircle/Check                                  │
│                                                                 │
│  🟣  PROJECT                (Purple)                            │
│  ├─ Color: bg-purple-500/10, text-purple-600                   │
│  ├─ Badge: "Project"                                           │
│  └─ Icon: Briefcase/Target                                     │
│                                                                 │
│  🟢  REFERENCE              (Green)                             │
│  ├─ Color: bg-green-500/10, text-green-600                     │
│  ├─ Badge: "Reference"                                         │
│  └─ Icon: Link/BookOpen                                        │
│                                                                 │
│  ⚪  CONVERSATION           (Gray)                              │
│  ├─ Color: bg-gray-500/10, text-gray-600                       │
│  ├─ Badge: "Conversation"                                      │
│  ├─ Icon: MessageCircle                                        │
│  └─ Auto-stored per thread                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Memory Card Structure

### Collapsed View

```
┌─────────────────────────────────────────────────────────────────┐
│  📌 Memory Name              [Type Badge]  ⭐ (if importance≥8) │
│  Short description of the memory content here...                │
│  ▼ (expand chevron)                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Expanded View

```
┌─────────────────────────────────────────────────────────────────┐
│  📌 Memory Name              [Type Badge]  ⭐                   │
│  Short description here...                                      │
│  ▲ (collapse chevron)                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CONTENT                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Full memory content goes here, can be multiple          │   │
│  │ paragraphs and contain detailed information...          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  TAGS                                                           │
│  [tag1] [tag2] [tag3]                                           │
│                                                                 │
│  STATS                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │Importance    │  │Used          │  │Updated       │          │
│  │8/10          │  │5 times       │  │07/20/2026    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ACTIONS                                                        │
│  [💙 Use Now] [✏️ Edit] [🗑️ Delete]                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Importance Scoring Scale

### Visual Scale

```
IMPORTANCE SCALE (1-10):

⭐☆☆☆☆☆☆☆☆☆   (1) - Barely relevant
⭐⭐☆☆☆☆☆☆☆☆   (2) - Very low importance
⭐⭐⭐☆☆☆☆☆☆☆   (3) - Low importance
⭐⭐⭐⭐☆☆☆☆☆☆   (4) - Below average
⭐⭐⭐⭐⭐☆☆☆☆☆   (5) - Average importance
⭐⭐⭐⭐⭐⭐☆☆☆☆   (6) - Above average
⭐⭐⭐⭐⭐⭐⭐☆☆☆   (7) - High importance
⭐⭐⭐⭐⭐⭐⭐⭐☆☆   (8) - Very high importance ⭐ (highlighted in UI)
⭐⭐⭐⭐⭐⭐⭐⭐⭐☆   (9) - Critical importance
⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐  (10) - Essential information
```

### Typical Ranges by Type

```
User Profile        [8-10]  ████████░░ Very important for personalization
Feedback            [7-9]   ███████░░░ Affects agent behavior
Project             [6-8]   ██████░░░░ Relevant to current work
Reference           [4-6]   ████░░░░░░ Reference material
Conversation        [1-5]   ░░░░░░░░░░ Decays over time
```

---

## Skills Categories Layout

### Information Retrieval

```
┌──────────────────────────────────────────────────┐
│ 📊 INFORMATION RETRIEVAL              (3/3 enabled)  │
├──────────────────────────────────────────────────┤
│                                                  │
│ ⚡ Web Search                                   │
│   Search across the internet in real-time      │
│   [━━━━━━━━━━] OFF                             │
│                                                  │
│ ⚡ Document Fetching                           │
│   Retrieve and analyze web content             │
│   [━━━━━━━━━━] ON                              │
│                                                  │
│ ⚡ PDF Analysis                                 │
│   Extract and understand PDF documents         │
│   [━━━━━━━━━━] ON                              │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Skill Toggle Button States

```
ENABLED STATE:                DISABLED STATE:
┌──────────┐                  ┌──────────┐
│ 🔵       │ (Blue bg)        │          │ (Gray bg)
│   ●●●●   │ (White dot)      │    ●●    │ (White dot, left)
│ MOVE TO ─→  RIGHT            │         │ MOVE TO LEFT ←─
└──────────┘                  └──────────┘

Animation: Slide dot 4px to right / left
Duration: 200ms ease-out
```

---

## Dashboard Statistics

```
┌─────────────────────────────────────────────────────────────────┐
│                    MEMORY STATISTICS                            │
├──────────────┬──────────────┬──────────────┬──────────────┐
│ Total        │ Active       │ High         │ Total        │
│ Memories     │ Skills       │ Importance   │ Accesses     │
│              │              │              │              │
│      42      │    10/12     │      7       │    156       │
│              │              │              │              │
│ (gray bg)    │ (blue bg)    │ (amber bg)   │ (green bg)   │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

---

## Search & Filter Interface

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 Search memories...                                           │
├─────────────────────────────────────────────────────────────────┤
│ Filter by type:                                                 │
│ [All Types] [👤 User] [💬 Feedback] [📋 Project] [🔗 Ref]     │
│              (gray)   (blue)     (amber)    (purple)  (green)   │
└─────────────────────────────────────────────────────────────────┘

STATES:
- Active filter: Blue bg, white text
- Inactive filter: Gray bg, dark text
- Hover: Darker shade
```

---

## Memory Type Examples

### User Profile Example

```
┌─────────────────────────────────────────────────────┐
│ 👤 Developer Profile              [User Profile]   │
│ Full-stack engineer focusing on React              │
│ ▼                                                   │
├─────────────────────────────────────────────────────┤
│ CONTENT                                             │
│ Full-stack engineer with 5 years React experience. │
│ Familiar with Node.js backend. Using Cloudflare    │
│ Workers. Prefers TypeScript. Working on qwksearch. │
│                                                     │
│ TAGS: [developer] [fullstack] [react]              │
│                                                     │
│ STATS:                                              │
│ Importance: 9/10  Used: 8 times  Updated: 07/20    │
│                                                     │
│ [💙 Use] [✏️ Edit] [🗑️ Delete]                    │
└─────────────────────────────────────────────────────┘
```

### Feedback Example

```
┌─────────────────────────────────────────────────────┐
│ 💬 API Client Usage              [Feedback]         │
│ Use qwksearch-api-client for all API calls         │
│ ▼                                                   │
├─────────────────────────────────────────────────────┤
│ CONTENT                                             │
│ All API calls must use the qwksearch-api-client    │
│ library instead of direct fetch calls. This        │
│ ensures consistent error handling and              │
│ authentication. Do not bypass with fetch().        │
│                                                     │
│ TAGS: [api] [best-practices] [important]           │
│                                                     │
│ STATS:                                              │
│ Importance: 8/10  Used: 12 times  Updated: 07/18   │
│                                                     │
│ [💙 Use] [✏️ Edit] [🗑️ Delete]                    │
└─────────────────────────────────────────────────────┘
```

### Project Example

```
┌─────────────────────────────────────────────────────┐
│ 📋 Kokoro TTS Integration         [Project]         │
│ Speech synthesis feature implementation             │
│ ▼                                                   │
├─────────────────────────────────────────────────────┤
│ CONTENT                                             │
│ Kokoro.js TTS has been integrated into the         │
│ settings panel with support for voice selection    │
│ and audio playback controls. Client-side only.     │
│ Deployed to production. Next: cloud-based option.  │
│                                                     │
│ TAGS: [tts] [audio] [feature] [kokoro]             │
│                                                     │
│ STATS:                                              │
│ Importance: 7/10  Used: 5 times  Updated: 07/19    │
│                                                     │
│ [💙 Use] [✏️ Edit] [🗑️ Delete]                    │
└─────────────────────────────────────────────────────┘
```

### Reference Example

```
┌─────────────────────────────────────────────────────┐
│ 🔗 Linear INGEST Project          [Reference]       │
│ Pipeline bugs tracked in Linear project             │
│ ▼                                                   │
├─────────────────────────────────────────────────────┤
│ CONTENT                                             │
│ Pipeline bugs are tracked in Linear INGEST project │
│ https://linear.app/projects/INGEST                 │
│ Check there for current issues and status updates. │
│ Project lead: @platform-team                       │
│                                                     │
│ TAGS: [external] [tracking] [linear] [pipeline]    │
│                                                     │
│ STATS:                                              │
│ Importance: 5/10  Used: 3 times  Updated: 07/15    │
│                                                     │
│ [💙 Use] [✏️ Edit] [🗑️ Delete]                    │
└─────────────────────────────────────────────────────┘
```

---

## Responsive Behavior

### Desktop (1024px+)
- 2-column layout (sidebar + content)
- Full card expansion
- All features visible
- 240px sidebar

### Tablet (768px - 1023px)
- Single column
- Dropdown selector for sections
- Cards stack vertically
- Full width content

### Mobile (< 768px)
- Single column, full width
- Vertical scroll
- Stacked statistics
- Touch-optimized buttons
- Larger tap targets

---

## Dark Mode Support

All colors have dark mode variants:

```
Light Mode                    Dark Mode
──────────────────────────────────────────
bg-light-200                  dark:bg-dark-200
text-black                    dark:text-white
border-light-200/50           dark:border-dark-200/50
bg-blue-500/10                dark:bg-blue-500/10
text-blue-600                 dark:text-blue-400
```

---

## Animation Timings

```
Skill Toggle      200ms ease-out     (dot slide animation)
Card Expand       smooth default      (chevron rotation, content fade)
Hover Effects     200ms transition    (background color changes)
Loading State     infinite spin       (Loader2 icon)
Toast Messages    300ms fade-in       (from Sonner)
```

---

## Accessibility Features

- ✅ Semantic HTML (buttons, nav, sections)
- ✅ ARIA labels for icons
- ✅ Keyboard navigation (Tab/Enter)
- ✅ Color-blind safe palette
- ✅ Sufficient contrast ratios
- ✅ Focus states on interactive elements

---

## File Size Estimates

```
Component Files:
- SkillsAndMemory.tsx        ~8 KB
- API routes (combined)      ~6 KB
- Documentation              ~30 KB
- Total                      ~44 KB
```

---

**Visual Guide Version:** 1.0
**Last Updated:** 2026-07-20

