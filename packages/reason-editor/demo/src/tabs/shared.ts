/**
 * Shared extension sets and default content reused across the demo tabs. Avoids duplicating editor configuration between the examples.
 */

import { Document } from '@tiptap/extension-document'
import { Text } from '@tiptap/extension-text'
import { Paragraph } from '@tiptap/extension-paragraph'
import { HardBreak } from '@tiptap/extension-hard-break'
import { Dropcursor, Gapcursor, Placeholder } from '@tiptap/extensions'
import { TextStyle } from '@tiptap/extension-text-style'
import { ListItem } from '@tiptap/extension-list'
import { Bold } from 'react-reason-editor/bold'
import { Italic } from 'react-reason-editor/italic'
import { TextUnderline } from 'react-reason-editor/textunderline'
import { Strike } from 'react-reason-editor/strike'
import { Link } from 'react-reason-editor/link'
import { History } from 'react-reason-editor/history'
import { BulletList } from 'react-reason-editor/bulletlist'
import { OrderedList } from 'react-reason-editor/orderedlist'
import { Heading } from 'react-reason-editor/heading'
import { Blockquote } from 'react-reason-editor/blockquote'
import { Code } from 'react-reason-editor/code'
import { Clear } from 'react-reason-editor/clear'
import { Highlight } from 'react-reason-editor/highlight'
import { Color } from 'react-reason-editor/color'

export const DEFAULT_CONTENT = `<p>Start typing here…</p>`

export const basicExtensions = [
  Document,
  Text,
  Paragraph,
  HardBreak,
  TextStyle,
  Dropcursor,
  Gapcursor,
  Placeholder.configure({ placeholder: 'Write something…' }),
  History,
  Bold,
  Italic,
  TextUnderline,
  Strike,
  Highlight,
  Color,
  Link,
  ListItem,
  BulletList,
  OrderedList,
  Heading.configure({ levels: [1, 2, 3] }),
  Blockquote,
  Code,
  Clear,
]
