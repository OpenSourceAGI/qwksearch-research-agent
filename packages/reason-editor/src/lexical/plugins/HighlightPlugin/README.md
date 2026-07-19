# HighlightPlugin

A Lexical plugin that implements text highlighting similar to TipTap's Mark extension. This plugin uses a custom `HighlightNode` that renders as semantic `<mark>` elements with customizable colors and IDs.

## Features

- **Semantic HTML**: Uses `<mark>` elements for proper accessibility
- **Custom colors**: Apply any CSS color value as background
- **Unique IDs**: Track individual highlights with generated or custom IDs
- **Markdown syntax**: Type `==text==` to create highlights
- **Auto-highlight mode**: Automatically highlight text on selection
- **Keyboard shortcut**: `Mod+Shift+H` to toggle highlighting
- **TipTap-compatible API**: Familiar commands for TipTap users

## Installation

### 1. Register HighlightNode

Add `HighlightNode` to your editor configuration:

```tsx
import { HighlightNode } from './nodes/HighlightNode';

const editorConfig = {
  nodes: [
    HighlightNode,
    // ... other nodes
  ],
  // ... other config
};
```

### 2. Add HighlightPlugin

```tsx
import HighlightPlugin from './plugins/HighlightPlugin';
import { AutoHighlightProvider } from './plugins/FloatingTextFormatToolbarPlugin/context/AutoHighlightContext';

function Editor() {
  return (
    <AutoHighlightProvider>
      <LexicalComposer initialConfig={editorConfig}>
        <RichTextPlugin ... />
        <HighlightPlugin />
        {/* other plugins */}
      </LexicalComposer>
    </AutoHighlightProvider>
  );
}
```

### 3. (Optional) Add Markdown Transformer

To enable `==text==` syntax, add the transformer to your markdown config:

```tsx
import { HIGHLIGHT } from './plugins/HighlightPlugin/HighlightMarkdownTransformer';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';

const TRANSFORMERS = [
  ...PLAYGROUND_TRANSFORMERS,
  HIGHLIGHT,
];

<MarkdownShortcutPlugin transformers={TRANSFORMERS} />
```

## Usage

### Commands

The plugin provides three main commands, matching TipTap's API:

#### SET_HIGHLIGHT_COMMAND

Apply highlighting to selected text.

```tsx
import { SET_HIGHLIGHT_COMMAND } from './plugins/HighlightPlugin';

editor.dispatchCommand(SET_HIGHLIGHT_COMMAND, {
  color: '#FFFF00',
  id: 'custom-id-123',
});
```

**Parameters:**
- `color` (optional): CSS color value (default: `#FFFF00`)
- `id` (optional): Unique identifier (auto-generated if not provided)

#### TOGGLE_HIGHLIGHT_COMMAND

Toggle highlighting on/off for selected text.

```tsx
import { TOGGLE_HIGHLIGHT_COMMAND } from './plugins/HighlightPlugin';

// Toggle with default yellow color
editor.dispatchCommand(TOGGLE_HIGHLIGHT_COMMAND, undefined);

// Toggle with custom color
editor.dispatchCommand(TOGGLE_HIGHLIGHT_COMMAND, {
  color: '#FF6B6B',
});
```

#### UNSET_HIGHLIGHT_COMMAND

Remove all highlighting from selected text.

```tsx
import { UNSET_HIGHLIGHT_COMMAND } from './plugins/HighlightPlugin';

editor.dispatchCommand(UNSET_HIGHLIGHT_COMMAND, undefined);
```

### Keyboard Shortcuts

- **Mod+Shift+H**: Toggle highlight (uses color from AutoHighlightContext)

### Markdown Syntax

Type `==text==` and it will automatically convert to highlighted text:

```
==This will be highlighted==
```

### Auto-Highlight Mode

When auto-highlight is enabled (via `AutoHighlightContext`), selecting text automatically applies highlighting:

```tsx
import { useAutoHighlight } from './plugins/FloatingTextFormatToolbarPlugin/context/AutoHighlightContext';

function HighlightControls() {
  const { isAutoHighlightEnabled, toggleAutoHighlight, setHighlightColor } = useAutoHighlight();

  return (
    <>
      <button onClick={toggleAutoHighlight}>
        Auto-Highlight: {isAutoHighlightEnabled ? 'ON' : 'OFF'}
      </button>
      <input
        type="color"
        value={highlightColor}
        onChange={(e) => setHighlightColor(e.target.value)}
      />
    </>
  );
}
```

## Component Examples

### Basic Highlight Button

```tsx
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { TOGGLE_HIGHLIGHT_COMMAND } from './plugins/HighlightPlugin';

function HighlightButton() {
  const [editor] = useLexicalComposerContext();

  return (
    <button
      onClick={() => {
        editor.dispatchCommand(TOGGLE_HIGHLIGHT_COMMAND, {
          color: '#FFFF00',
        });
      }}
    >
      Highlight
    </button>
  );
}
```

### Color Picker with Highlight

```tsx
import { useState } from 'react';
import { SET_HIGHLIGHT_COMMAND } from './plugins/HighlightPlugin';

function HighlightColorPicker() {
  const [editor] = useLexicalComposerContext();
  const [color, setColor] = useState('#FFFF00');

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    editor.dispatchCommand(SET_HIGHLIGHT_COMMAND, { color: newColor });
  };

  return (
    <input
      type="color"
      value={color}
      onChange={(e) => handleColorChange(e.target.value)}
    />
  );
}
```

### Remove Highlight Button

```tsx
import { UNSET_HIGHLIGHT_COMMAND } from './plugins/HighlightPlugin';

function RemoveHighlightButton() {
  const [editor] = useLexicalComposerContext();

  return (
    <button
      onClick={() => {
        editor.dispatchCommand(UNSET_HIGHLIGHT_COMMAND, undefined);
      }}
    >
      Remove Highlight
    </button>
  );
}
```

## API Reference

### HighlightNode

Custom Lexical node that represents highlighted text.

**Methods:**
- `getColor(): string` - Get the highlight color
- `setColor(color: string): void` - Set the highlight color
- `getId(): string` - Get the unique ID
- `setId(id: string): void` - Set the unique ID

**Factory Function:**
```tsx
import { $createHighlightNode } from './nodes/HighlightNode';

const node = $createHighlightNode(
  'text content',  // text
  '#FF6B6B',       // color (optional)
  'highlight-123'  // id (optional)
);
```

**Type Guard:**
```tsx
import { $isHighlightNode } from './nodes/HighlightNode';

if ($isHighlightNode(node)) {
  console.log(node.getColor());
}
```

### Serialization

HighlightNode serializes to JSON with this structure:

```json
{
  "type": "highlight",
  "version": 1,
  "text": "highlighted text",
  "color": "#FFFF00",
  "id": "highlight-1234567890-abc123def",
  "format": 0,
  "detail": 0,
  "mode": "normal",
  "style": ""
}
```

### HTML Import/Export

HighlightNode can import from:
- `<mark>` elements with `data-color` and `data-id` attributes
- `<span>` elements with `background-color` style

Example HTML:
```html
<mark data-color="#FFFF00" data-id="highlight-123" style="background-color: #FFFF00; color: inherit">
  highlighted text
</mark>
```

## Comparison with TipTap

This plugin closely matches TipTap's Mark extension API:

| Feature | TipTap | HighlightPlugin |
|---------|--------|-----------------|
| Set highlight | `editor.chain().setHighlight()` | `editor.dispatchCommand(SET_HIGHLIGHT_COMMAND, attrs)` |
| Toggle highlight | `editor.chain().toggleHighlight()` | `editor.dispatchCommand(TOGGLE_HIGHLIGHT_COMMAND, attrs)` |
| Remove highlight | `editor.chain().unsetHighlight()` | `editor.dispatchCommand(UNSET_HIGHLIGHT_COMMAND)` |
| Markdown syntax | `==text==` | `==text==` ✓ |
| Custom colors | ✓ | ✓ |
| Keyboard shortcut | `Mod+Shift+H` | `Mod+Shift+H` ✓ |
| Input rules | ✓ | ✓ |
| Paste rules | ✓ | ✓ (via HTML import) |

## Styling

The plugin renders highlights as `<mark>` elements. You can customize appearance with CSS:

```css
mark[data-color] {
  border-radius: 2px;
  padding: 2px 0;
  transition: background-color 0.15s ease;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  mark[data-color] {
    filter: brightness(0.7);
  }
}
```

## Integration with Existing HighlightButton

To integrate with the existing `HighlightButton` component:

```tsx
// In HighlightButton.tsx
import { SET_HIGHLIGHT_COMMAND } from '../HighlightPlugin';

const applyHighlight = () => {
  editor.dispatchCommand(SET_HIGHLIGHT_COMMAND, {
    color: highlightColor,
  });
};
```

## Migration from TextHighlightPlugin

If you're using the word-level `TextHighlightPlugin`:

**TextHighlightPlugin:**
- Splits text into individual words
- Applies inline background-color styles
- Good for word-by-word highlighting

**HighlightPlugin:**
- Uses semantic `<mark>` nodes
- Better for phrase/sentence highlighting
- Supports IDs and better serialization

Choose based on your use case:
- Use `HighlightPlugin` for general-purpose highlighting with markdown support
- Use `TextHighlightPlugin` for precise word-level control

## Troubleshooting

### "HighlightNode not registered" error

Make sure `HighlightNode` is in your editor's `initialConfig.nodes` array:

```tsx
const config = {
  nodes: [HighlightNode, /* other nodes */],
};
```

### Auto-highlight not working

Ensure your editor is wrapped in `AutoHighlightProvider`:

```tsx
<AutoHighlightProvider>
  <LexicalComposer ...>
    <HighlightPlugin />
  </LexicalComposer>
</AutoHighlightProvider>
```

### Markdown syntax not working

Add the `HIGHLIGHT` transformer to your markdown plugin:

```tsx
import { HIGHLIGHT } from './plugins/HighlightPlugin/HighlightMarkdownTransformer';

<MarkdownShortcutPlugin transformers={[...transformers, HIGHLIGHT]} />
```
