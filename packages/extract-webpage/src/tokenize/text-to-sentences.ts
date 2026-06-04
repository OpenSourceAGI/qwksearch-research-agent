/**
 * @fileoverview 
 * Splits text into sentences, handling 220+ common abbreviations,
 * and inferring acronyms, numbers, URLs, times, names, etc.
 *
 * @param inputText - The text to be split into sentences.
 * @param options - Configuration options for sentence splitting.
 * @returns An array of sentences.
 * @author [vtempest (2025)](https://github.com/vtempest)
 * @license MIT
 * @example
 * ```ts
 * const text = "Dr. Smith went to the U.S. He met Mr. Jones.";
 * const sentences = splitTextToSentences(text);
 * ["Dr. Smith went to the U.S.", "He met Mr. Jones."]
 * ```
 */
export function splitTextToSentences(
  inputText: string,
  options: SplitSentencesOptions = {},
): string[] {
  const { splitOnHtmlTags = true, minSize = 20, maxSize = 500 } = options;

  // Validate input
  if (!isValidInput(inputText)) {
    return [];
  }

  // Preprocess and tokenize
  const LINEBREAK_MARKER = " @~@ ";
  const processedText = preprocessText(
    inputText,
    splitOnHtmlTags,
    LINEBREAK_MARKER,
  );
  const tokens = tokenizeText(processedText);

  if (!tokens || tokens.length === 0) {
    return [];
  }

  // Detect sentence boundaries
  const sentenceGroups = detectSentenceBoundaries(
    tokens,
    LINEBREAK_MARKER.trim(),
  );

  // Post-process and merge short abbreviations
  const mergedGroups = mergeSplitAbbreviations(sentenceGroups);

  // Apply size constraints and convert to strings
  return applySizeConstraints(mergedGroups, minSize, maxSize);
}

export type SplitSentencesOptions = {
  /**
   * Split on HTML tags like P, DIV, UL, OL.
   * @default true
   */
  splitOnHtmlTags?: boolean;
  /**
   * Minimum size for a sentence.
   * @default 20
   */
  minSize?: number;
  /**
   * Maximum size for a sentence.
   * @default 500
   */
  maxSize?: number;
};

/**
 * Validates if the input text is non-empty and contains non-whitespace characters.
 *
 * @param text - The text to validate.
 * @returns True if the text is valid, false otherwise.
 */
function isValidInput(text: string): boolean {
  const NON_EMPTY_REGEX = /\S/;
  return (
    !!text &&
    typeof text === "string" &&
    text.length > 0 &&
    NON_EMPTY_REGEX.test(text)
  );
}

/**
 * Preprocesses text by replacing line breaks and optionally splitting on HTML tags.
 *
 * @param text - The text to preprocess.
 * @param splitOnHtmlTags - Whether to split on HTML tags.
 * @param linebreakMarker - The marker to use for line breaks.
 * @returns The preprocessed text.
 */
function preprocessText(
  text: string,
  splitOnHtmlTags: boolean,
  linebreakMarker: string,
): string {
  const LINEBREAK_BOUNDARY_REGEX = /\n+|[-#=_+*]{4,}/g;
  let processed = text.replace(LINEBREAK_BOUNDARY_REGEX, linebreakMarker);

  if (splitOnHtmlTags) {
    const htmlTagsToSplit = ["p", "div", "ul", "ol"];
    const htmlSplitRegex = new RegExp(
      `(<br\\s*\\/?>|<\\/(${htmlTagsToSplit.join("|")})>)`,
      "g",
    );
    processed = processed.replace(htmlSplitRegex, `$1${linebreakMarker}`);
  }

  return processed;
}

/**
 * Tokenizes text into words and newlines.
 *
 * @param text - The text to tokenize.
 * @returns Array of tokens.
 */
function tokenizeText(text: string): string[] | null {
  const WORD_TOKENIZE_REGEX = /\S+|\n/g;
  return text.trim().match(WORD_TOKENIZE_REGEX);
}

/**
 * Detects sentence boundaries in a token array.
 *
 * @param tokens - Array of tokens to process.
 * @param linebreakMarker - The marker used for line breaks.
 * @returns Array of sentence groups (each group is an array of tokens).
 */
function detectSentenceBoundaries(
  tokens: string[],
  linebreakMarker: string,
): string[][] {
  const sentenceGroups: string[][] = [];
  let currentGroup: string[] = [];
  let wordCounter = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    wordCounter++;
    currentGroup.push(token);

    if (token.includes(",")) {
      wordCounter = 0;
    }

    // Check for definite sentence endings
    if (shouldEndSentence(token, linebreakMarker)) {
      if (token === linebreakMarker) {
        currentGroup.pop();
      }
      sentenceGroups.push(currentGroup);
      currentGroup = [];
      wordCounter = 0;
      continue;
    }

    // Handle quotes at end of token
    if (hasEndPunctuation(token, '"') || hasEndPunctuation(token, "'")) {
      tokens[i] = token.slice(0, -1);
    }

    // Handle periods
    if (hasEndPunctuation(token, ".")) {
      const shouldContinue = shouldContinueAfterPeriod(
        token,
        tokens,
        i,
        wordCounter,
      );

      if (!shouldContinue) {
        sentenceGroups.push(currentGroup);
        currentGroup = [];
        wordCounter = 0;
        continue;
      } else {
        continue;
      }
    }

    // Check for periods within tokens (decimals, URLs, etc.)
    const periodIndex = token.indexOf(".");
    if (periodIndex > -1) {
      if (
        isNumeric(token, periodIndex) ||
        isComplexAbbreviation(token) ||
        isValidUrl(token) ||
        isPhoneNumber(token)
      ) {
        continue;
      }
    }

    // Handle punctuation within words (e.g., "word.Another")
    const maybeSplit = maybeSplitAtInternalPunctuation(
      token,
      currentGroup,
      sentenceGroups,
    );
    if (maybeSplit) {
      currentGroup = maybeSplit.currentGroup;
      wordCounter = 0;
    }
  }

  if (currentGroup.length > 0) {
    sentenceGroups.push(currentGroup);
  }

  return sentenceGroups;
}

/**
 * Checks if a token should end the current sentence.
 *
 * @param token - The token to check.
 * @param linebreakMarker - The marker used for line breaks.
 * @returns True if the sentence should end, false otherwise.
 */
function shouldEndSentence(token: string, linebreakMarker: string): boolean {
  return (
    [".", "!", "?"].includes(token) ||
    hasEndPunctuation(token, "?!") ||
    token === linebreakMarker
  );
}

/**
 * Determines if processing should continue after encountering a period.
 *
 * @param token - The current token.
 * @param tokens - All tokens.
 * @param index - Current index in tokens array.
 * @param wordCounter - Current word count in sentence.
 * @returns True if should continue (not end sentence), false if should end sentence.
 */
function shouldContinueAfterPeriod(
  token: string,
  tokens: string[],
  index: number,
  wordCounter: number,
): boolean {
  if (index + 1 >= tokens.length) {
    return false; // End of tokens, should end sentence
  }

  // Special case: single letter abbreviations
  if (token.length === 2 && isNaN(Number(token.charAt(0)))) {
    return true;
  }

  // Check common abbreviations
  if (isInCommonAbbreviationList(token)) {
    return true;
  }

  const nextToken = tokens[index + 1];

  if (isBeginsNewSentence(nextToken)) {
    // Could be start of new sentence
    if (isAbbreviatedTime(token, nextToken)) {
      return true;
    }

    if (isAbbreviatedName(wordCounter, tokens.slice(index, index + 6))) {
      return true;
    }

    if (isNumeric(nextToken) && isCustomAbbreviation(token)) {
      return true;
    }
  } else {
    // Doesn't look like new sentence
    if (token.endsWith("..")) {
      return true; // Ellipsis
    }

    if (isComplexAbbreviation(token)) {
      return true;
    }

    if (isAbbreviatedName(wordCounter, tokens.slice(index, index + 5))) {
      return true;
    }
  }

  return false; // Default: end the sentence
}

/**
 * Attempts to split a token that contains punctuation followed by a letter.
 *
 * @param token - The token to potentially split.
 * @param currentGroup - The current sentence group.
 * @param sentenceGroups - All sentence groups.
 * @returns Object with new currentGroup if split occurred, null otherwise.
 */
function maybeSplitAtInternalPunctuation(
  token: string,
  currentGroup: string[],
  sentenceGroups: string[][],
): { currentGroup: string[] } | null {
  const boundaryIndex = token.search(/[.!?]/);

  if (boundaryIndex > -1 && boundaryIndex < token.length - 1) {
    const nextChar = token.charAt(boundaryIndex + 1);
    if (nextChar.match(/[a-zA-Z]/)) {
      const splitResult = [
        token.slice(0, boundaryIndex + 1),
        token.slice(boundaryIndex + 1),
      ];

      currentGroup.pop();
      currentGroup.push(splitResult[0]);
      sentenceGroups.push(currentGroup);

      return { currentGroup: [splitResult[1]] };
    }
  }

  return null;
}

/**
 * Merges sentence groups that were incorrectly split on short abbreviations.
 *
 * @param sentenceGroups - Array of sentence groups to process.
 * @returns Merged sentence groups.
 */
function mergeSplitAbbreviations(sentenceGroups: string[][]): string[][] {
  return sentenceGroups
    .filter((group) => group.length > 0)
    .reduce((output, group, index) => {
      if (index === 0) {
        output.push(group);
        return output;
      }

      const previousGroup = output[output.length - 1];

      // Check for short abbreviations that might have been split incorrectly
      if (
        previousGroup.length === 1 &&
        /^.{1,2}[.]$/.test(previousGroup[0]) &&
        !/[.]/.test(group[0])
      ) {
        output[output.length - 1] = previousGroup.concat(group);
      } else {
        output.push(group);
      }

      return output;
    }, [] as string[][]);
}

/**
 * Applies minimum and maximum size constraints to sentence groups.
 *
 * @param sentenceGroups - Array of sentence groups (token arrays).
 * @param minSize - Minimum sentence length.
 * @param maxSize - Maximum sentence length.
 * @returns Array of final sentences as strings.
 */
function applySizeConstraints(
  sentenceGroups: string[][],
  minSize: number,
  maxSize: number,
): string[] {
  return sentenceGroups
    .map((group, index) => {
      let sentence = group.join(" ");

      // Apply minSize constraint
      if (sentence.length < minSize) {
        if (index < sentenceGroups.length - 1) {
          // Merge with next sentence
          sentenceGroups[index + 1] = group.concat(sentenceGroups[index + 1]);
          return null;
        }
      }
      // Apply maxSize constraint
      else if (sentence.length > maxSize) {
        const lastPunctuation = sentence.lastIndexOf(".", maxSize);

        if (lastPunctuation === -1) {
          return sliceIntoChunks(sentence, maxSize);
        }

        if (lastPunctuation > minSize) {
          // Split sentence and add remainder to next position
          sentenceGroups.splice(
            index + 1,
            0,
            sentence
              .slice(lastPunctuation + 1)
              .trim()
              .split(" "),
          );
          return sentence.slice(0, lastPunctuation + 1);
        }
      }

      return sentence;
    })
    .flat()
    .filter(Boolean) as string[];
}

/**
 * Slices a string into chunks of a maximum size, attempting to split at word
 * boundaries within a 20-character window of the maximum size.
 *
 * @param str - The string to be sliced.
 * @param maxSize - The maximum length of each chunk.
 * @returns An array of string chunks.
 */
function sliceIntoChunks(str: string, maxSize: number): string[] {
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < str.length) {
    let endIndex = startIndex + maxSize;

    if (endIndex < str.length) {
      // Look for the last space within the last 20 characters
      const lastSpaceIndex = str.lastIndexOf(" ", endIndex);
      const searchStartIndex = Math.max(startIndex, endIndex - 20);

      if (lastSpaceIndex >= searchStartIndex) {
        endIndex = lastSpaceIndex;
      }
    } else {
      endIndex = str.length;
    }

    chunks.push(str.slice(startIndex, endIndex).trim());
    startIndex = endIndex + 1; // Skip the space
  }

  return chunks;
}

/**
 * Checks if a word ends with a specific character or characters.
 *
 * @param word - The word to check.
 * @param char - The character(s) to check for at the end of the word.
 * @returns True if the word ends with the specified character(s), false otherwise.
 */
function hasEndPunctuation(word: string, char: string): boolean {
  return char.length > 1
    ? char.includes(word.slice(-1))
    : word.slice(-1) === char;
}

/**
 * Checks if a string is capitalized or a number.
 *
 * @param str - The string to check.
 * @returns True if the string is capitalized or a number, false otherwise.
 */
function isCapitalizedOrNumeric(str: string): boolean {
  return /^[A-Z][a-z].*/.test(str) || isNumeric(str);
}

/**
 * Checks if a string is likely to begin a new sentence.
 *
 * @param str - The string to check.
 * @returns True if the string is likely to begin a new sentence, false otherwise.
 */
function isBeginsNewSentence(str: string): boolean {
  return isCapitalizedOrNumeric(str) || /``|"|'/.test(str.substring(0, 2));
}

/**
 * Checks if a word is in the list of 222 common abbreviations for various categories.
 *
 * @param str - The word to check, which gets cleaned and lowercased.
 * @returns True if the string is a common abbreviation, false otherwise.
 */
function isInCommonAbbreviationList(str: string): boolean {
  const COMMON_ABBR_LIST = (
    "adj,adm,adv,al,ala,alta,apr,arc,ariz,ark,art,assn,asst,attys,aug,ave,ba," +
    "bart,bld,bldg,blvd,brig,bros,bsc,btw,cal,calif,capt,cc,cell,ch,cl,cmdr,co,col,colo,comdr,con," +
    "conn,corp,cpl,cres,ct,dak,dec,del,dem,dept,det,dist,dphil,dr,drs,ed,eg,ens,eq,eqs,esp,esq,est," +
    "etc,ex,exp,expy,ext,feb,fed,fig,figs,fla,fri,ft,fwy,fy,ga,gen,gov,hon,hosp,hr,hrs,hway,hwy,ia,id," +
    "ida,ie,ill,inc,ind,ing,insp,is,jan,jr,jul,jun,kan,kans,ken,kg,km,kmph,ky,la,lt,ltd,ma,maj,man," +
    "mar,mass,may,md,me,med,messrs,mex,mfg,mi,mich,min,minn,miss,mlle,mm,mme,mo,mol,mont,mr,mrs,ms," +
    "msc,msgr,mssrs,mt,mtn,neb,nebr,nev,no,nos,nov,nr,oct,ok,okla,ont,op,ord,ore,p,pa,pd,pde,penn," +
    "penna,pfc,ph,phd,pl,plz,pop,pp,prof,pvt,que,rd,ref,refs,rep,repr,reps,res,rev,rs,rt,sask,sat," +
    "sec,secs,sen,sens,sep,sept,sfc,sgt,sr,st,sun,supt,surg,tce,tenn,tex,th,thu,thur,thurs,trans,tu," +
    "tue,tues,univ,us,usafa,ut,v,va,ver,viz,vol,vs,vt,wash,wed,wis,wisc,wy,wyo"
  ).split(",");

  const cleaned = str
    .toLowerCase()
    .replace(/[-'`~!@#$%^&*()_|+=?;:'",.<>\{\}\[\]\\\/]/gi, "");
  return COMMON_ABBR_LIST.includes(cleaned);
}

/**
 * Checks if a word is an abbreviated time (a.m. or p.m.) followed by 'day'.
 *
 * @param word - The current word.
 * @param nextWord - The next word in the sequence.
 * @returns True if it's an abbreviated time followed by 'day', false otherwise.
 */
function isAbbreviatedTime(word: string, nextWord: string): boolean {
  if (word === "a.m." || word === "p.m.") {
    const nextWordEnd = nextWord.replace(/\W+/g, "").slice(-3).toLowerCase();
    return nextWordEnd === "day";
  }
  return false;
}

/**
 * Checks if a word or phrase is a complex abbreviation (e.g., U.S., U.K., Ph.D.).
 *
 * @param word - The word or phrase to check.
 * @returns True if it's a complex abbreviation, false otherwise.
 */
function isComplexAbbreviation(word: string): boolean {
  // Check for common multi-part abbreviations like U.S. or U.K.
  if (/^([A-Za-z]\.){2,}[A-Za-z]?\.?(\s*\([^)]+\))?$/.test(word)) {
    return true;
  }

  const cleaned = word.replace(/[\(\)\[\]\{\}]/g, "");
  const matches = cleaned.match(/(.\.)*/);
  return matches !== null && matches[0].length > 0;
}

/**
 * Checks if a string is a custom abbreviation (short or capitalized).
 *
 * @param str - The string to check.
 * @returns True if it's a custom abbreviation, false otherwise.
 */
function isCustomAbbreviation(str: string): boolean {
  return str.length <= 3 || isCapitalizedOrNumeric(str);
}

/**
 * Checks if a sequence of words represents an abbreviated name (e.g., J. R. R. Tolkien).
 *
 * @param wordCount - The current word count in the sentence.
 * @param words - A sequence of words to check.
 * @returns True if the sequence represents an abbreviated name, false otherwise.
 */
function isAbbreviatedName(wordCount: number, words: string[]): boolean {
  if (words.length > 0) {
    if (
      wordCount < 5 &&
      words[0].length < 6 &&
      isCapitalizedOrNumeric(words[0])
    ) {
      return true;
    }
    const capitalizedCount = words.filter((str) =>
      /[A-Z]/.test(str.charAt(0)),
    ).length;
    return capitalizedCount >= 3;
  }
  return false;
}

/**
 * Checks if a string is numeric, optionally starting from a specific position.
 *
 * @param str - The string to check.
 * @param startPos - The position to start checking from (optional).
 * @returns True if the string is numeric, false otherwise.
 */
function isNumeric(str: string, startPos?: number): boolean {
  if (startPos != null) {
    str = str.slice(startPos - 1, startPos + 2);
  }
  return !isNaN(Number(str));
}

/**
 * Checks if a string matches a phone number pattern.
 *
 * @param str - The string to check.
 * @returns True if the string matches a phone number pattern, false otherwise.
 */
function isPhoneNumber(str: string): boolean {
  return new RegExp(
    "^(?:(?:\\+?1\\s*(?:[.-]\\s*)?)?(?:(\\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8]" +
    "[02-9])\\s*)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\\s*(?:[.-]\\s*)?)?([2-9]1" +
    "[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\\s*(?:[.-]\\s*)?([0-9]{4})(?:\\s*(?:#|x\\.?|ext\\.?" +
    "|extension)\\s*(\\d+))?$",
  ).test(str);
}

/**
 * Checks if a string is a valid URL.
 *
 * @param str - The string to check.
 * @returns True if the string is a valid URL, false otherwise.
 */
function isValidUrl(str: string): boolean {
  return /[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/.test(
    str,
  );
}
