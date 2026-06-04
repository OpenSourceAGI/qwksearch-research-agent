/**
 * @fileoverview Transformer for converting raw text queries into topic-weighted phrase tokens.
 * Handles phrase detection, typo correction, and root word stemming.
 */
import { stemWordToRoot } from "./word-to-root-stem";
import { isWordCommonIgnored } from "./word-is-ignored";

/**
 * Topic token tuple shape used by downstream ranking logic:
 * [term, termCategory, uniqueness, metadata]
 */
export type TopicToken = [string, number, number, string];

/**
 * Trie structure for phrase completion lookup keyed by first two letters, then full token.
 */
type PhraseEntry = [string | null, number, number];

export type PhrasesModel = Record<string, Record<string, PhraseEntry[]>>;

export interface ConvertTextToTokensOptions {
  phrasesModel: PhrasesModel;
  typosModel?: Record<string, string>;
  checkTypos?: 0 | 1;
  ignoreStopWords?: 0 | 1;
  checkRootWords?: 0 | 1;
}
/**
 * @typedef {Object} Token
 * @property {number} termCategory - The category of the term
 * @property {number} uniqueness - The uniqueness score of the term
 * @property {string} term - The actual term or phrase
 */
/**
 * ### Convert Text Query to Topic Phrase Tokens
 * <img width="350px"  src="https://i.imgur.com/NDrmSRQ.png" />
 *
 * Returns a list of phrases that are found in Wiki Titles/ dictionary phrases World Model
 * that match the input phrase, or just the single word if found. Search results will be
 *  more accurate if we infer likely phrases and search for those words occuring together and
 *  not just split into words and find frequency. Examples are "white house" or "state of the art"
 *  which should be searched as a phrase but would return different context if split into words.
 *  As Led Zeppelin famously put it: \u266b "'Cause you know sometimes words have two meanings."
 *
 * @param {string} phrase
 * @param {Object} [options]
 * @param {Object} options.phrasesModel - remote model
 * @param {Object} options.typosModel - remote model
 * @param {number} options.checkTypos - check for typos
 * @param {number} options.ignoreStopWords - ignore 300+ overused words
 * @param {number} options.checkRootWords - check for word's root stem
 * @returns {Array<{termCategory: number, uniqueness: number, term: string}>}
 * @example
 *   const result = convertTextToTokens("The president of the united states is in the white house", { phrasesModel, typosModel });
 *   console.log(result);
 *
 * @author [vtempest (2025)](https://github.com/vtempest)
 * @category Topics
 */
export function convertTextToTokens(
  phrase: string,
  options: Partial<ConvertTextToTokensOptions> = {},
): TopicToken[] {
  let {
    phrasesModel, //pass in remote model
    typosModel,
    checkTypos = 0,
    checkRootWords = 1,
    ignoreStopWords = 1,
  } = options;

  if (!phrasesModel) throw new Error("Missing phrasesModel ");

  if (!phrase) throw new Error("Missing  phrase");

  //strip non-alphanumeric characters from query an keep -'/
  phrase = phrase.replace(/[^a-zA-Z0-9\s\-\'\/]/g, " ");

  //split into words
  var words = phrase.toLowerCase().split(/\W+/);

  //check for typos

  if (checkTypos && typosModel)
    words = words.map((word) => typosModel[word] || word);

  const topics: TopicToken[] = [];
  for (var i = 0; i < words.length; i++) {
    var word = words[i];

    //ignore 300+ common stop words
    if (ignoreStopWords && isWordCommonIgnored(word)) {
      //todo include as ignored
      topics.push([word, 0, 0, ""]);
      continue;
    }

    //Find next word phrase completion list
    var firstTwoLetters = word.slice(0, 2);
    var possiblePhrases = phrasesModel[firstTwoLetters]
      ? phrasesModel[firstTwoLetters][word]
      : null;

    //check for root words like "gaming" -> "game"
    if (!possiblePhrases && checkRootWords) {
      var rootWord = stemWordToRoot(word);
      if (rootWord !== word)
        possiblePhrases = phrasesModel[rootWord.slice(0, 2)]
          ? phrasesModel[rootWord.slice(0, 2)][rootWord]
          : null;

      //TODO add label "root word"
    }

    //if word still not in dict, add it as a single word
    if (!possiblePhrases) topics.push([word, 0, 0, ""]);

    if (possiblePhrases) {
      var maxPhraseLength = 1;
      let singleWordObj: TopicToken | null = null;
      var isPhraseFound = false;

      //calculate max possible length of phrase of next words
      for (var p of possiblePhrases)
        if (p[0]?.length > maxPhraseLength) maxPhraseLength = p[0].length;

      //grab that length of text from next words
      var nextWords = "";
      for (var j = 1; j < words.length - i; j++) {
        nextWords += (words[i + j] || "") + " ";

        if (nextWords.length >= maxPhraseLength) break;
      }

      for (const phraseEntry of possiblePhrases) {
        //if no next phrase, preserve the single word
        //it culd also be not in the dict first word
        if (!phraseEntry[0] && !singleWordObj) {
          const nextPhrase = phraseEntry.slice(1, 3) as [number, number];
          singleWordObj = [word, nextPhrase[0], nextPhrase[1], ""];
        } else {
          //add next word to the phrase up to maxPhraseLength
          const nextPhrasePart = phraseEntry[0];
          if (
            !isPhraseFound &&
            typeof nextPhrasePart === "string" &&
            nextWords.startsWith(nextPhrasePart)
          ) {
            var fullPhrase = word + " " + nextPhrasePart;
            const nextPhrase = phraseEntry.slice(1, 3) as [number, number];
            topics.push([fullPhrase, nextPhrase[0], nextPhrase[1], ""]); // remove first which is next words

            //skip looping thru the next words added to phrase
            i += nextPhrasePart.split(" ").length; //TODO fi

            //suppress single-word "red" if "red wine" is found
            isPhraseFound = true;

            break;
          }
        }
      }

      //if no phrases then add the single word
      if (!isPhraseFound) {
        if (singleWordObj) {
          // Could be starter token for phrases; keep it as standalone suggestion.
          topics.push(singleWordObj);
        }
      }
    }
  }

  return topics.filter(Boolean);
}
