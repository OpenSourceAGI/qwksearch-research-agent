# Extensions Reference

Complete reference guide for all available extensions in the ReactJS TipTap Editor. This document consolidates all extension documentation into a single, comprehensive reference.

## Quick Summary

**Total Extensions: 44**

- **Text Formatting (7)**: Bold, Italic, Strike, Underline, Code, Highlight, Color
- **Advanced Marks (1)**: MoreMark (subscript/superscript)
- **Layout & Structure (4)**: Heading, Column, HorizontalRule, Indent
- **Lists (3)**: BulletList, OrderedList, TaskList
- **Media (5)**: Image, ImageGif, Video, Iframe, Attachment
- **Code (3)**: Code, CodeBlock, CodeView
- **Rich Content (3)**: Table, Link, Blockquote
- **Embeds & Visualizations (4)**: Twitter, Excalidraw, Mermaid, Katex
- **Styling (5)**: FontFamily, FontSize, LineHeight, TextAlign, TextDirection
- **UI Components (3)**: Callout, Drawer, Emoji
- **Editor Features (4)**: History, SearchAndReplace, SlashCommand, Mention
- **Import/Export (3)**: ImportWord, ExportWord, ExportPdf
- **Utilities (1)**: Clear

### Dependencies Required
- `react-image-crop` - For Image extension (with cropping support)
- `highlight.js` & `lowlight` - For CodeBlock syntax highlighting
- `mammoth` - For ImportWord functionality

## Extensions Overview

All 44 extensions available in the ReactJS TipTap Editor, organized in a comprehensive table.

| Extension | Description | Component | Import Path | Keyboard Shortcut | Dependencies | Based On |
|-----------|-------------|-----------|-------------|-------------------|--------------|----------|
| [Attachment](extensions/Attachment/index.md) | Add file attachments to your editor | `RichTextAttachment` | `reactjs-tiptap-editor/attachment` | - | - | Custom |
| [Blockquote](extensions/Blockquote/index.md) | Add blockquotes to your editor | `RichTextBlockquote` | `reactjs-tiptap-editor/blockquote` | - | - | [@tiptap/extension-blockquote](https://tiptap.dev/docs/editor/extensions/nodes/blockquote) |
| [Bold](extensions/Bold/index.md) | Add bold text formatting | `RichTextBold` | `reactjs-tiptap-editor/bold` | `Cmd/Ctrl + B` | - | [@tiptap/extension-bold](https://tiptap.dev/docs/editor/extensions/marks/bold) |
| [BulletList](extensions/BulletList/index.md) | Add bullet lists to your editor | `RichTextBulletList` | `reactjs-tiptap-editor/bulletlist` | - | - | [@tiptap/bullet-list](https://tiptap.dev/docs/editor/extensions/nodes/bullet-list) |
| [Callout](extensions/Callout/index.md) | Add callout boxes with different styles (info, warning, success, error) | `RichTextCallout` | `reactjs-tiptap-editor/callout` | - | - | Custom |
| [Clear](extensions/Clear/index.md) | Clear all editor content | `RichTextClear` | `reactjs-tiptap-editor/clear` | - | - | Custom |
| [Code](extensions/Code/index.md) | Add inline code formatting to text | `RichTextCode` | `reactjs-tiptap-editor/code` | - | - | [@tiptap/extension-code](https://tiptap.dev/docs/editor/extensions/marks/code) |
| [CodeBlock](extensions/CodeBlock/index.md) | Add code blocks with syntax highlighting and language selection. Type ` ``` ` + Enter to create | `RichTextCodeBlock`, `RichTextBubbleCodeBlock` | `reactjs-tiptap-editor/codeblock` | - | `highlight.js`, `lowlight` | [code-block-lowlight](https://tiptap.dev/docs/editor/extensions/nodes/code-block-lowlight) |
| [CodeView](extensions/CodeView/index.md) | View and edit raw HTML/markdown source code | `RichTextCodeView` | `reactjs-tiptap-editor/codeview` | - | - | Custom |
| [Color](extensions/Color/index.md) | Add text color with custom colors, keyboard shortcuts, and synchronized color selection | `RichTextColor` | `reactjs-tiptap-editor/color` | - | - | [@tiptap/extension-text-style](https://tiptap.dev/docs/editor/extensions/functionality/color) |
| [Column](extensions/Column/index.md) | Create multi-column layouts in your editor | `RichTextColumn` | `reactjs-tiptap-editor/column` | - | - | Custom |
| [Drawer](extensions/Drawer/index.md) | Add collapsible drawer/accordion components | `RichTextDrawer` | `reactjs-tiptap-editor/drawer` | - | - | Custom |
| [Emoji](extensions/Emoji/index.md) | Add emoji picker and support | `RichTextEmoji` | `reactjs-tiptap-editor/emoji` | - | - | Custom |
| [Excalidraw](extensions/Excalidraw/index.md) | Embed Excalidraw drawings and sketches | `RichTextExcalidraw` | `reactjs-tiptap-editor/excalidraw` | - | - | [Excalidraw](https://excalidraw.com/) |
| [ExportPdf](extensions/ExportPdf/index.md) | Export editor content as PDF document | `RichTextExportPdf` | `reactjs-tiptap-editor/exportpdf` | - | - | Custom |
| [ExportWord](extensions/ExportWord/index.md) | Export editor content as Word document (.docx) | `RichTextExportWord` | `reactjs-tiptap-editor/exportword` | - | - | Custom |
| [FontFamily](extensions/FontFamily/index.md) | Change the font family of text | `RichTextFontFamily` | `reactjs-tiptap-editor/fontfamily` | - | - | [@tiptap/extension-font-family](https://tiptap.dev/docs/editor/extensions/functionality/fontfamily) |
| [FontSize](extensions/FontSize/index.md) | Change the font size of text | `RichTextFontSize` | `reactjs-tiptap-editor/fontsize` | - | - | Custom |
| [Heading](extensions/Heading/index.md) | Add headings (H1-H6) to your editor | `RichTextHeading` | `reactjs-tiptap-editor/heading` | `Alt + Cmd/Ctrl + [0-6]` | - | [@tiptap/extension-heading](https://tiptap.dev/docs/editor/extensions/nodes/heading) |
| [Highlight](extensions/Highlight/index.md) | Highlight text with multiple colors, keyboard shortcuts, and synchronized color selection | `RichTextHighlight` | `reactjs-tiptap-editor/highlight` | - | - | [@tiptap/extension-highlight](https://tiptap.dev/docs/editor/extensions/marks/highlight) |
| [History](extensions/History/index.md) | Add undo and redo functionality | `RichTextHistory` | `reactjs-tiptap-editor/history` | `Cmd/Ctrl + Z`, `Cmd/Ctrl + Shift + Z` | - | [@tiptap/extension-history](https://www.npmjs.com/package/@tiptap/extension-history) |
| [HorizontalRule](extensions/HorizontalRule/index.md) | Add horizontal rules/dividers to your editor | `RichTextHorizontalRule` | `reactjs-tiptap-editor/horizontalrule` | - | - | [@tiptap/extension-horizontal-rule](https://tiptap.dev/docs/editor/extensions/nodes/horizontal-rule) |
| [Iframe](extensions/Iframe/index.md) | Embed external content using iframes | `RichTextIframe` | `reactjs-tiptap-editor/iframe` | - | - | Custom |
| [Image](extensions/Image/index.md) | Add images with upload support, cropping, alt text, and inline/block display | `RichTextImage` | `reactjs-tiptap-editor/image` | - | `react-image-crop` | [@tiptap/extension-image](https://tiptap.dev/docs/editor/extensions/nodes/image) |
| [ImageGif](extensions/ImageGif/index.md) | Add animated GIF images to your editor | `RichTextImageGif` | `reactjs-tiptap-editor/imagegif` | - | - | Custom |
| [ImportWord](extensions/ImportWord/index.md) | Import Word documents (.docx) into the editor | `RichTextImportWord` | `reactjs-tiptap-editor/importword` | - | `mammoth` | Custom |
| [Indent](extensions/Indent/index.md) | Add indentation controls for text blocks | `RichTextIndent` | `reactjs-tiptap-editor/indent` | - | - | Custom |
| [Italic](extensions/Italic/index.md) | Add italic text formatting | `RichTextItalic` | `reactjs-tiptap-editor/italic` | `Cmd/Ctrl + I` | - | [@tiptap/extension-italic](https://tiptap.dev/docs/editor/extensions/marks/italic) |
| [Katex](extensions/Katex/index.md) | Add LaTeX/KaTeX math equations (inline and block) | `RichTextKatex` | `reactjs-tiptap-editor/katex` | - | - | [KaTeX](https://katex.org/) |
| [LineHeight](extensions/LineHeight/index.md) | Change the line height of text | `RichTextLineHeight` | `reactjs-tiptap-editor/lineheight` | - | - | Custom |
| [Link](extensions/Link/index.md) | Add hyperlinks to your editor content | `RichTextLink` | `reactjs-tiptap-editor/link` | - | - | [@tiptap/extension-link](https://tiptap.dev/docs/editor/extensions/marks/link) |
| [Mention](extensions/Mention/index.md) | Add @mention functionality for tagging users or entities | - | `reactjs-tiptap-editor/mention` | - | - | [@tiptap/extension-mention](https://tiptap.dev/docs/editor/extensions/nodes/mention) |
| [Mermaid](extensions/Mermaid/index.md) | Add Mermaid diagrams (flowcharts, sequence diagrams, etc.) | `RichTextMermaid` | `reactjs-tiptap-editor/mermaid` | - | - | [Mermaid](https://mermaid.js.org/) |
| [MoreMark](extensions/MoreMark/index.md) | Additional text formatting (subscript, superscript) | `RichTextMoreMark` | `reactjs-tiptap-editor/moremark` | - | - | [@tiptap/extension-subscript](https://tiptap.dev/docs/editor/extensions/marks/subscript), [@tiptap/extension-superscript](https://tiptap.dev/docs/editor/extensions/marks/superscript) |
| [OrderedList](extensions/OrderedList/index.md) | Add numbered/ordered lists to your editor | `RichTextOrderedList` | `reactjs-tiptap-editor/orderedlist` | - | - | [@tiptap/extension-ordered-list](https://tiptap.dev/docs/editor/extensions/nodes/ordered-list) |
| [SearchAndReplace](extensions/SearchAndReplace/index.md) | Add search and replace functionality | `RichTextSearchAndReplace` | `reactjs-tiptap-editor/searchandreplace` | - | - | Custom |
| [SlashCommand](extensions/SlashCommand/index.md) | Add slash command menu for quick access to features. Type `/` to trigger | `SlashCommandList` | `reactjs-tiptap-editor/slashcommand` | `/` | - | Custom |
| [Strike](extensions/Strike/index.md) | Add strikethrough text formatting | `RichTextStrike` | `reactjs-tiptap-editor/strike` | - | - | [@tiptap/extension-strike](https://tiptap.dev/docs/editor/extensions/marks/strike) |
| [Table](extensions/Table/index.md) | Add tables with full editing capabilities | `RichTextTable` | `reactjs-tiptap-editor/table` | - | - | [@tiptap/extension-table](https://tiptap.dev/docs/editor/extensions/nodes/table) |
| [TaskList](extensions/TaskList/index.md) | Add task/todo lists with checkboxes | `RichTextTaskList` | `reactjs-tiptap-editor/tasklist` | - | - | [@tiptap/extension-task-list](https://tiptap.dev/docs/editor/extensions/nodes/task-list) |
| [TextAlign](extensions/TextAlign/index.md) | Align text (left, center, right, justify) | `RichTextTextAlign` | `reactjs-tiptap-editor/textalign` | - | - | [@tiptap/extension-text-align](https://tiptap.dev/docs/editor/extensions/functionality/textalign) |
| [TextDirection](extensions/TextDirection/index.md) | Set text direction (LTR/RTL) for multilingual support | `RichTextTextDirection` | `reactjs-tiptap-editor/textdirection` | - | - | Custom |
| [TextUnderline](extensions/TextUnderline/index.md) | Add underline text formatting | `RichTextTextUnderline` | `reactjs-tiptap-editor/textunderline` | - | - | [@tiptap/extension-underline](https://tiptap.dev/docs/editor/extensions/marks/underline) |
| [Twitter](extensions/Twitter/index.md) | Embed Twitter/X posts in your editor | `RichTextTwitter` | `reactjs-tiptap-editor/twitter` | - | - | [react-tweet](https://react-tweet.vercel.app/) |
| [Video](extensions/Video/index.md) | Add videos with upload or embed support, fullscreen controls | `RichTextVideo` | `reactjs-tiptap-editor/video` | - | - | Custom |

## Extensions by Category

### Text Formatting
- [Bold](extensions/Bold/index.md) - Bold text
- [Italic](extensions/Italic/index.md) - Italic text
- [Strike](extensions/Strike/index.md) - Strikethrough
- [TextUnderline](extensions/TextUnderline/index.md) - Underline text
- [Code](extensions/Code/index.md) - Inline code
- [Highlight](extensions/Highlight/index.md) - Text highlighting
- [Color](extensions/Color/index.md) - Text color

### Advanced Text Marks
- [MoreMark](extensions/MoreMark/index.md) - Subscript and superscript

### Layout & Structure
- [Heading](extensions/Heading/index.md) - Headings (h1-h6)
- [Paragraph](extensions/Paragraph/index.md) - Paragraphs
- [Column](extensions/Column/index.md) - Multi-column layouts
- [HorizontalRule](extensions/HorizontalRule/index.md) - Horizontal dividers

### Lists
- [BulletList](extensions/BulletList/index.md) - Bullet lists
- [OrderedList](extensions/OrderedList/index.md) - Numbered lists
- [TaskList](extensions/TaskList/index.md) - Todo/task lists

### Rich Content
- [Image](extensions/Image/index.md) - Images with upload/crop
- [ImageGif](extensions/ImageGif/index.md) - GIF images
- [Video](extensions/Video/index.md) - Video embeds
- [Link](extensions/Link/index.md) - Hyperlinks
- [Table](extensions/Table/index.md) - Tables
- [CodeBlock](extensions/CodeBlock/index.md) - Code blocks with syntax highlighting

### Embeds & Integrations
- [Iframe](extensions/Iframe/index.md) - Generic iframe embeds
- [Twitter](extensions/Twitter/index.md) - Twitter/X post embeds
- [Excalidraw](extensions/Excalidraw/index.md) - Excalidraw drawings
- [Mermaid](extensions/Mermaid/index.md) - Mermaid diagrams
- [Katex](extensions/Katex/index.md) - LaTeX math equations

### Document Management
- [Attachment](extensions/Attachment/index.md) - File attachments
- [ImportWord](extensions/ImportWord/index.md) - Import Word documents
- [ExportWord](extensions/ExportWord/index.md) - Export to Word
- [ExportPdf](extensions/ExportPdf/index.md) - Export to PDF

### Editor Features
- [History](extensions/History/index.md) - Undo/redo
- [SearchAndReplace](extensions/SearchAndReplace/index.md) - Find and replace
- [SlashCommand](extensions/SlashCommand/index.md) - Slash commands
- [Mention](extensions/Mention/index.md) - @mentions
- [Emoji](extensions/Emoji/index.md) - Emoji picker

### Styling & Formatting
- [FontFamily](extensions/FontFamily/index.md) - Font family selection
- [FontSize](extensions/FontSize/index.md) - Font size control
- [LineHeight](extensions/LineHeight/index.md) - Line height adjustment
- [TextAlign](extensions/TextAlign/index.md) - Text alignment
- [TextDirection](extensions/TextDirection/index.md) - Text direction (LTR/RTL)
- [Indent](extensions/Indent/index.md) - Text indentation

### UI Components
- [Blockquote](extensions/Blockquote/index.md) - Blockquotes
- [Callout](extensions/Callout/index.md) - Callout boxes
- [Drawer](extensions/Drawer/index.md) - Drawer component

### Utilities
- [Clear](extensions/Clear/index.md) - Clear content
- [CodeView](extensions/CodeView/index.md) - HTML source view

## Installation Notes

### Extensions Requiring Additional Dependencies

Some extensions require additional npm packages to be installed:

#### CodeBlock
```bash
npm install highlight.js lowlight
```

#### Image
```bash
npm install react-image-crop
```

Also import the CSS:
```tsx
import 'react-image-crop/dist/ReactCrop.css';
```

#### ImportWord
```bash
npm install mammoth
```

### Base CSS Import

All extensions require the base CSS:
```tsx
import 'reactjs-tiptap-editor/style.css';
```

## Usage Pattern

The typical usage pattern for all extensions follows this structure:

```tsx
import { RichTextProvider } from 'reactjs-tiptap-editor'

// Base Kit
import { Document } from '@tiptap/extension-document'
import { Text } from '@tiptap/extension-text'
import { Paragraph } from '@tiptap/extension-paragraph'
// ... other base extensions

// Extension
import { ExtensionName, RichTextExtensionComponent } from 'reactjs-tiptap-editor/extension-path'

// Import CSS
import 'reactjs-tiptap-editor/style.css'

const extensions = [
  // Base Extensions
  Document,
  Text,
  Paragraph,
  // ... other extensions
  
  // Your Extension
  ExtensionName.configure({
    // Configuration options
  })
]

const RichTextToolbar = () => {
  return (
    <RichTextExtensionComponent />
  )
}

const App = () => {
  const editor = useEditor({
    textDirection: 'auto',
    extensions,
  })

  return (
    <RichTextProvider editor={editor}>
      <RichTextToolbar />
      <EditorContent editor={editor} />
    </RichTextProvider>
  )
}
```

## Extension Types

- **Mark Extensions**: Text formatting that can be applied to text ranges (Bold, Italic, Color, etc.)
- **Node Extensions**: Structural elements that represent blocks of content (Image, Table, CodeBlock, etc.)
- **Custom Extensions**: Extensions with unique functionality (History, SearchAndReplace, ExportPdf, etc.)

## Key Configuration Options

Many extensions support common configuration options:

### shortcutKeys
Keyboard shortcuts for the extension (e.g., `['mod', 'B']` for Bold)

### upload
Custom upload function for file-based extensions (Image, Attachment, Mermaid, Video)

```tsx
upload: (file: File) => Promise<string>
```

### HTMLAttributes
HTML attributes passed to the rendered element

### Custom Styling
Most extensions support custom CSS classes and styling through configuration options

## Browser Compatibility

All extensions are compatible with modern browsers that support:
- ES6+ JavaScript features
- CSS Grid and Flexbox
- Modern DOM APIs

For detailed documentation on each extension, click the extension name in the table above.
