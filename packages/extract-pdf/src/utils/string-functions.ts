/**
 * @description Character-level string utilities for the PDF text pipeline:
 * digit and number detection, leading/trailing whitespace trimming, list-item
 * character and pattern matching (bullet chars, numbered items), word-overlap
 * scoring (`wordMatch`), char-code normalisation for headline matching
 * (`normalizedCharCodeArray`), and camel-case detection
 * (`hasUpperCaseCharacterInMiddleOfWord`).
 */
const MIN_DIGIT_CHAR_CODE = 48
const MAX_DIGIT_CHAR_CODE = 57
const WHITESPACE_CHAR_CODE = 32
const TAB_CHAR_CODE = 9
const DOT_CHAR_CODE = 46

export function removeLeadingWhitespaces(string: string): string {
  while (string.charCodeAt(0) === WHITESPACE_CHAR_CODE) {
    string = string.substring(1, string.length)
  }
  return string
}

export function removeTrailingWhitespaces(string: string): string {
  while (string.charCodeAt(string.length - 1) === WHITESPACE_CHAR_CODE) {
    string = string.substring(0, string.length - 1)
  }
  return string
}

export function isDigit(charCode: number): boolean {
  return charCode >= MIN_DIGIT_CHAR_CODE && charCode <= MAX_DIGIT_CHAR_CODE
}

export function isNumber(string: string): boolean {
  for (var i = 0; i < string.length; i++) {
    const charCode = string.charCodeAt(i)
    if (!isDigit(charCode)) {
      return false
    }
  }
  return true
}

export function hasOnly(string: string, char: string): boolean {
  const charCode = char.charCodeAt(0)
  for (var i = 0; i < string.length; i++) {
    const aCharCode = string.charCodeAt(i)
    if (aCharCode !== charCode) {
      return false
    }
  }
  return true
}

export function hasUpperCaseCharacterInMiddleOfWord(text: string): boolean {
  var beginningOfWord = true
  for (var i = 0; i < text.length; i++) {
    const character = text.charAt(i)
    if (character === ' ') {
      beginningOfWord = true
    } else {
      if (!beginningOfWord && isNaN(character as any * 1) && character === character.toUpperCase() && character.toUpperCase() !== character.toLowerCase()) {
        return true
      }
      beginningOfWord = false
    }
  }
  return false
}

// Remove whitespace/dots + to uppercase
export function normalizedCharCodeArray(string: string): number[] {
  string = string.toUpperCase()
  return charCodeArray(string).filter(charCode => charCode !== WHITESPACE_CHAR_CODE && charCode !== TAB_CHAR_CODE && charCode !== DOT_CHAR_CODE)
}

export function charCodeArray(string: string): number[] {
  const charCodes: number[] = []
  for (var i = 0; i < string.length; i++) {
    charCodes.push(string.charCodeAt(i))
  }
  return charCodes
}

export function prefixAfterWhitespace(prefix: string, string: string): string {
  if (string.charCodeAt(0) === WHITESPACE_CHAR_CODE) {
    string = removeLeadingWhitespaces(string)
    return ' ' + prefix + string
  } else {
    return prefix + string
  }
}

export function suffixBeforeWhitespace(string: string, suffix: string): string {
  if (string.charCodeAt(string.length - 1) === WHITESPACE_CHAR_CODE) {
    string = removeTrailingWhitespaces(string)
    return string + suffix + ' '
  } else {
    return string + suffix
  }
}

export function isListItemCharacter(string: string): boolean {
  if (string.length > 1) {
    return false
  }
  const char = string.charAt(0)
  return char === '-' || char === '•' || char === '–'
}

export function isListItem(string: string): boolean {
  return /^[\s]*[-•–][\s].*$/g.test(string)
}

export function isNumberedListItem(string: string): boolean {
  return /^[\s]*[\d]*[.][\s].*$/g.test(string)
}

export function wordMatch(string1: string, string2: string): number {
  const words1 = new Set(string1.toUpperCase().split(' '))
  const words2 = new Set(string2.toUpperCase().split(' '))
  const intersection = new Set(
    [...words1].filter(x => words2.has(x)))
  return intersection.size / Math.max(words1.size, words2.size)
}
