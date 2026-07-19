/**
 * Find query words in tab content and if found return object
 */
export default function findInTabContent(
  { tabId, title, favIconUrl, content }: {
    tabId: number
    title: string
    favIconUrl: string
    content: string
  },
  searchText: string,
  snippetTextSize = 100
) {
  content =
    title +
    " " +
    content
      .replace(/(<(noscript|script|style)\b[^>]*>).*?(<\/\2>)/gis, "$1$3")
      .replace(/\r?\n|\r/g, " ")
      .replace(/<style(.|\n)+?\/style>/gi, "")
      .replace(/<noscript(.|\n)+?\/noscript>/gi, "")
      .replace(/<script(.|\n)+?\/script>/gi, "")
      .replace(/<(.|\n)+?>/gi, " ")

  // Search to find all words in tab content
  let foundAllWords = true
  const searchSplit = searchText
    .toLowerCase()
    .trim()
    .split(" ")
    .filter((x) => x.length > 1)

  if (searchSplit.length === 0) return

  for (const word of searchSplit) {
    if (word.length > 0 && content.toLowerCase().indexOf(word) === -1) {
      foundAllWords = false
    }
  }

  if (!foundAllWords) return

  const lastSearchWord = searchSplit[searchSplit.length - 1]

  if (title.length > 45) title = title.substr(0, 45) + "\u2026"

  const indexStartWord = lastSearchWord
    ? content.toLowerCase().indexOf(lastSearchWord)
    : 0
  const indexEndWord = indexStartWord + (lastSearchWord?.length || 0)

  const dispString =
    content.substring(Math.max(indexStartWord - snippetTextSize, 0), indexStartWord) +
    "<b>" +
    content.substring(indexStartWord, indexEndWord) +
    "</b>" +
    content.substring(indexEndWord, indexEndWord + snippetTextSize)

  return {
    dispString,
    id: tabId,
    title,
    favIconUrl,
    lastSearchWord
  }
}
