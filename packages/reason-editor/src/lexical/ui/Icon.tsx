import type { JSX } from 'react';
import { memo } from 'react';

// Import all icons statically (bundler will handle tree-shaking)
import columns3 from '../icons/3-columns.svg';
import addSign from '../icons/add-sign.svg';
import arrowClockwise from '../icons/arrow-clockwise.svg';
import arrowCounterclockwise from '../icons/arrow-counterclockwise.svg';
import bgColor from '../icons/bg-color.svg';
import calendar from '../icons/calendar.svg';
import camera from '../icons/camera.svg';
import cardChecklist from '../icons/card-checklist.svg';
import caretRightFill from '../icons/caret-right-fill.svg';
import chatLeftText from '../icons/chat-left-text.svg';
import chatRightDots from '../icons/chat-right-dots.svg';
import chatRight from '../icons/chat-right.svg';
import chatRightText from '../icons/chat-right-text.svg';
import chatSquareQuote from '../icons/chat-square-quote.svg';
import chevronDown from '../icons/chevron-down.svg';
import iconThemes from '../icons/icon-themes.svg';
import clipboard from '../icons/clipboard.svg';
import clockHistory from '../icons/clock-history.svg';
import close from '../icons/close.svg';
import code from '../icons/code.svg';
import comments from '../icons/toggle-comments.svg';
import addComment from '../icons/add-comment.svg';
import copy from '../icons/copy.svg';
import diagram2 from '../icons/diagram-2.svg';
import download from '../icons/download.svg';
import draggableBlockMenu from '../icons/draggable-block-menu.svg';
import dropdownMore from '../icons/dropdown-more.svg';
import emojiSmile from '../icons/emoji-smile.svg';
import figma from '../icons/figma.svg';
import fileEarmarkText from '../icons/file-earmark-text.svg';
import fileImage from '../icons/file-image.svg';
import filetypeGif from '../icons/filetype-gif.svg';
import filterLeft from '../icons/filter-left.svg';
import fontColor from '../icons/font-color.svg';
import fontFamily from '../icons/font-family.svg';
import gear from '../icons/gear.svg';
import highlighter from '../icons/highlighter.svg';
import highlighterColor from '../icons/highlighter-color.svg';
import highlightingRemove from '../icons/highlighting-remove.svg';
import horizontalRule from '../icons/horizontal-rule.svg';
import imageBroken from '../icons/image-broken.svg';
import indent from '../icons/indent.svg';
import journalCode from '../icons/journal-code.svg';
import journalText from '../icons/journal-text.svg';
import justify from '../icons/justify.svg';
import link from '../icons/link.svg';
import listOl from '../icons/list-ol.svg';
import listUl from '../icons/list-ul.svg';
import lockFill from '../icons/lock-fill.svg';
import lock from '../icons/lock.svg';
import markdown from '../icons/markdown.svg';
import mic from '../icons/mic.svg';
import minusSign from '../icons/minus-sign.svg';
import outdent from '../icons/outdent.svg';
import paintBucket from '../icons/paint-bucket.svg';
import palette from '../icons/palette.svg';
import pencilFill from '../icons/pencil-fill.svg';
import plugFill from '../icons/plug-fill.svg';
import pastePlain from '../icons/paste-plain.svg';
import plug from '../icons/plug.svg';
import plusSlashMinus from '../icons/plus-slash-minus.svg';
import plus from '../icons/plus.svg';
import scissors from '../icons/scissors.svg';
import send from '../icons/send.svg';
import squareCheck from '../icons/square-check.svg';
import sticky from '../icons/sticky.svg';
import successAlt from '../icons/success-alt.svg';
import success from '../icons/success.svg';
import table from '../icons/table.svg';
import textCenter from '../icons/text-center.svg';
import textLeft from '../icons/text-left.svg';
import textParagraph from '../icons/text-paragraph.svg';
import textRight from '../icons/text-right.svg';
import trash3 from '../icons/trash3.svg';
import trash from '../icons/trash.svg';
import typeBold from '../icons/type-bold.svg';
import typeCapitalize from '../icons/type-capitalize.svg';
import typeH1 from '../icons/type-h1.svg';
import typeH2 from '../icons/type-h2.svg';
import typeH3 from '../icons/type-h3.svg';
import typeH4 from '../icons/type-h4.svg';
import typeH5 from '../icons/type-h5.svg';
import typeH6 from '../icons/type-h6.svg';
import typeItalic from '../icons/type-italic.svg';
import typeLowercase from '../icons/type-lowercase.svg';
import typeStrikethrough from '../icons/type-strikethrough.svg';
import typeSubscript from '../icons/type-subscript.svg';
import typeSuperscript from '../icons/type-superscript.svg';
import typeUnderline from '../icons/type-underline.svg';
import typeUppercase from '../icons/type-uppercase.svg';
import upload from '../icons/upload.svg';
import user from '../icons/user.svg';
import userPlus from '../icons/user-plus.svg';
import emphasis from '../icons/emphasis.svg';
import verticalBottom from '../icons/vertical-bottom.svg';
import verticalMiddle from '../icons/vertical-middle.svg';
import verticalTop from '../icons/vertical-top.svg';
import x from '../icons/x.svg';
import youtube from '../icons/youtube.svg';

// Next.js SVG imports sometimes return an object ({ src, width, height }),
// not plain strings. Extract the src URL from each import.
type SvgImport = string | { src: string };
function resolveSrc(imported: SvgImport): string {
  return typeof imported === 'string' ? imported : imported.src;
}

// Icon registry - initialized once at module load time
const icons: Record<string, string> = {
  '3-columns': resolveSrc(columns3),
  'columns': resolveSrc(columns3),
  'add-sign': resolveSrc(addSign),
  'add-comment': resolveSrc(addComment),
  'arrow-clockwise': resolveSrc(arrowClockwise),
  'undo': resolveSrc(arrowCounterclockwise),
  'arrow-counterclockwise': resolveSrc(arrowCounterclockwise),
  'redo': resolveSrc(arrowClockwise),
  'bg-color': resolveSrc(bgColor),
  'calendar': resolveSrc(calendar),
  'camera': resolveSrc(camera),
  'card-checklist': resolveSrc(cardChecklist),
  'poll': resolveSrc(cardChecklist),
  'caret-right-fill': resolveSrc(caretRightFill),
  'caret-right': resolveSrc(caretRightFill),
  'chat-left-text': resolveSrc(chatLeftText),
  'chat-right-dots': resolveSrc(chatRightDots),
  'chat-right': resolveSrc(chatRight),
  'chat-right-text': resolveSrc(chatRightText),
  'chat-square-quote': resolveSrc(chatSquareQuote),
  'quote': resolveSrc(chatSquareQuote),
  'chevron-down': resolveSrc(chevronDown),
  'icon-themes': resolveSrc(iconThemes),
  'clipboard': resolveSrc(clipboard),
  'clock-history': resolveSrc(clockHistory),
  'close': resolveSrc(close),
  'code': resolveSrc(code),
  'comments': resolveSrc(comments),
  'copy': resolveSrc(copy),
  'diagram-2': resolveSrc(diagram2),
  'download': resolveSrc(download),
  'draggable-block-menu': resolveSrc(draggableBlockMenu),
  'dropdown-more': resolveSrc(dropdownMore),
  'emoji-smile': resolveSrc(emojiSmile),
  'emoji': resolveSrc(emojiSmile),
  'figma': resolveSrc(figma),
  'file-earmark-text': resolveSrc(fileEarmarkText),
  'file-image': resolveSrc(fileImage),
  'image': resolveSrc(fileImage),
  'filetype-gif': resolveSrc(filetypeGif),
  'gif': resolveSrc(filetypeGif),
  'filter-left': resolveSrc(filterLeft),
  'font-color': resolveSrc(fontColor),
  'font-family': resolveSrc(fontFamily),
  'gear': resolveSrc(gear),
  'highlighter': resolveSrc(highlighter),
  'highlight': resolveSrc(highlighter),
  'highlighter-color': resolveSrc(highlighterColor),
  'highlighting-remove': resolveSrc(highlightingRemove),
  'horizontal-rule': resolveSrc(horizontalRule),
  'image-broken': resolveSrc(imageBroken),
  'indent': resolveSrc(indent),
  'journal-code': resolveSrc(journalCode),
  'journal-text': resolveSrc(journalText),
  'justify': resolveSrc(justify),
  'justify-align': resolveSrc(justify),
  'link': resolveSrc(link),
  'list-ol': resolveSrc(listOl),
  'number': resolveSrc(listOl),
  'list-ul': resolveSrc(listUl),
  'bullet': resolveSrc(listUl),
  'lock-fill': resolveSrc(lockFill),
  'lock': resolveSrc(lock),
  'markdown': resolveSrc(markdown),
  'mic': resolveSrc(mic),
  'minus-sign': resolveSrc(minusSign),
  'outdent': resolveSrc(outdent),
  'paste-plain': resolveSrc(pastePlain),
  'paint-bucket': resolveSrc(paintBucket),
  'bucket': resolveSrc(paintBucket),
  'palette': resolveSrc(palette),
  'pencil-fill': resolveSrc(pencilFill),
  'plug-fill': resolveSrc(plugFill),
  'plug': resolveSrc(plug),
  'plus-slash-minus': resolveSrc(plusSlashMinus),
  'equation': resolveSrc(plusSlashMinus),
  'plus': resolveSrc(plus),
  'user-plus': resolveSrc(userPlus),
  'emphasis': resolveSrc(emphasis),
  'scissors': resolveSrc(scissors),
  'send': resolveSrc(send),
  'square-check': resolveSrc(squareCheck),
  'check': resolveSrc(squareCheck),
  'sticky': resolveSrc(sticky),
  'success-alt': resolveSrc(successAlt),
  'success': resolveSrc(success),
  'table': resolveSrc(table),
  'text-center': resolveSrc(textCenter),
  'center-align': resolveSrc(textCenter),
  'text-left': resolveSrc(textLeft),
  'left-align': resolveSrc(textLeft),
  'text-paragraph': resolveSrc(textParagraph),
  'paragraph': resolveSrc(textParagraph),
  'text-right': resolveSrc(textRight),
  'right-align': resolveSrc(textRight),
  'trash3': resolveSrc(trash3),
  'trash': resolveSrc(trash),
  'clear': resolveSrc(trash),
  'type-bold': resolveSrc(typeBold),
  'bold': resolveSrc(typeBold),
  'type-capitalize': resolveSrc(typeCapitalize),
  'capitalize': resolveSrc(typeCapitalize),
  'type-h1': resolveSrc(typeH1),
  'h1': resolveSrc(typeH1),
  'type-h2': resolveSrc(typeH2),
  'h2': resolveSrc(typeH2),
  'type-h3': resolveSrc(typeH3),
  'h3': resolveSrc(typeH3),
  'type-h4': resolveSrc(typeH4),
  'h4': resolveSrc(typeH4),
  'type-h5': resolveSrc(typeH5),
  'h5': resolveSrc(typeH5),
  'type-h6': resolveSrc(typeH6),
  'h6': resolveSrc(typeH6),
  'type-italic': resolveSrc(typeItalic),
  'italic': resolveSrc(typeItalic),
  'type-lowercase': resolveSrc(typeLowercase),
  'lowercase': resolveSrc(typeLowercase),
  'type-strikethrough': resolveSrc(typeStrikethrough),
  'strikethrough': resolveSrc(typeStrikethrough),
  'type-subscript': resolveSrc(typeSubscript),
  'subscript': resolveSrc(typeSubscript),
  'type-superscript': resolveSrc(typeSuperscript),
  'superscript': resolveSrc(typeSuperscript),
  'type-underline': resolveSrc(typeUnderline),
  'underline': resolveSrc(typeUnderline),
  'type-uppercase': resolveSrc(typeUppercase),
  'uppercase': resolveSrc(typeUppercase),
  'upload': resolveSrc(upload),
  'user': resolveSrc(user),
  'vertical-bottom': resolveSrc(verticalBottom),
  'vertical-middle': resolveSrc(verticalMiddle),
  'vertical-top': resolveSrc(verticalTop),
  'x': resolveSrc(x),
  'youtube': resolveSrc(youtube),
  'page-break': resolveSrc(horizontalRule),
};

export function getIconSrc(name: string): string | undefined {
  return icons[name];
}

interface IconProps {
  name: string;
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

/**
 * Component for rendering SVG icons with support for custom sizing and styling.
 * Heavily memoized to prevent unnecessary re-renders when parent components update.
 * Icon will only re-render if name, className, size, or style actually changes.
 */
const Icon = memo(
  function Icon({ name, className = '', size = 20, style = {} }: IconProps): JSX.Element | null {
    const src = icons[name];
    if (!src) {
      console.warn(`Icon "${name}" not found`);
      return null;
    }
    return (
      <img
        src={src}
        alt={name}
        className={`icon ${className}`}
        width={size}
        height={size}
        style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
      />
    );
  },
  // Custom comparison function for better memoization
  (prevProps, nextProps) => {
    return (
      prevProps.name === nextProps.name &&
      prevProps.className === nextProps.className &&
      prevProps.size === nextProps.size &&
      JSON.stringify(prevProps.style) === JSON.stringify(nextProps.style)
    );
  }
);

export default Icon;

// For backwards compatibility with <i className="icon name" /> pattern
export function IconI({ className = '' }: { className?: string }): JSX.Element | null {
  // Extract icon name from className like "icon bold" -> "bold"
  const classes = className.split(' ').filter(c => c && c !== 'icon');
  const name = classes[0];
  if (!name) return null;
  return <Icon name={name} className={classes.slice(1).join(' ')} />;
}
