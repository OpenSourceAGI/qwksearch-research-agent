/**
 * @fileoverview Lower-level date extraction primitives and regex patterns.
 * Provides specialized extractors for URLs, JSON-LD, and idiosyncratic text patterns.
 */
import { convert_date, is_valid_date } from './date-validators';


var DEBUG = 0;

const LOGGER = DEBUG ? console : { debug: () => { }, error: () => { } };


const TEI_VALID_TAGS = new Set(['ab', 'body', 'cell', 'code', 'del', 'div', 'graphic', 'head', 'hi',
    'item', 'lb', 'list', 'p', 'quote', 'ref', 'row', 'table']);
const TEI_VALID_ATTRS = new Set(['rend', 'rendition', 'role', 'target', 'type']);
const TEI_REMOVE_TAIL = new Set(["ab", "p"]);
const TEI_DIV_SIBLINGS = new Set(["p", "list", "table", "quote", "ab"]);

const NEWLINE_ELEMS = new Set(['code', 'graphic', 'head', 'lb', 'list', 'p', 'quote', 'row', 'table']);
const SPECIAL_FORMATTING = new Set(['del', 'head', 'hi', 'ref']);
const WITH_ATTRIBUTES = new Set(['cell', 'row', 'del', 'graphic', 'head', 'hi', 'item', 'list', 'ref']);
const NESTING_WHITELIST = new Set(["cell", "figure", "item", "note", "quote"]);

const META_ATTRIBUTES = [
    'sitename', 'title', 'author', 'date', 'url', 'hostname',
    'description', 'categories', 'tags', 'license', 'id',
    'fingerprint', 'language'
];

const HI_FORMATTING = { '#b': '**', '#i': '*', '#u': '__', '#t': '`' };

const MAX_TABLE_WIDTH = 1000;
// Note: FAST_PREPEND would need to be defined separately
const FAST_PREPEND = ''; // Define your FAST_PREPEND value here

// Segment length constraints
const MIN_SEGMENT_LEN = 6;
const MAX_SEGMENT_LEN = 52;

const DISCARD_EXPRESSIONS = './/div[@id="wm-ipp-base" or @id="wm-ipp"]';


// Alternative JavaScript-based selector approach (faster in some browsers)
const DATE_EXPRESSIONS = [
    '[id*="date" i]',
    '[class*="date" i]',
    '[itemprop*="date" i]',
    '[id*="datum" i]',
    '[class*="datum" i]',
    '[itemprop*="datum" i]',
    '[id*="meta" i]',
    '[class*="meta" i]',
    '[id*="time" i]',
    '[class*="time" i]',
    '[id*="publish" i]',
    '[class*="publish" i]',
    '[id*="footer" i]',
    '[class*="footer" i]',
    '[class*="info" i]',
    '[class*="post_detail" i]',
    '[class*="block-content" i]',
    '[class*="byline" i]',
    '[class*="subline" i]',
    '[class*="posted" i]',
    '[class*="submitted" i]',
    '[class*="created-post" i]',
    '[class*="publication" i]',
    '[class*="author" i]',
    '[class*="autor" i]',
    '[class*="field-content" i]',
    '[class*="fa-clock-o" i]',
    '[class*="fa-calendar" i]',
    '[class*="fecha" i]',
    '[class*="parution" i]'
].join(',');

// XPath-style expressions
const SLOW_PREPEND = "";

const DAY_RE = "[0-3]?[0-9]";
const MONTH_RE = "[0-1]?[0-9]";
const YEAR_RE = "199[0-9]|20[0-3][0-9]";

const FREE_TEXT_EXPRESSIONS = ".//*[self::div or self::h2 or self::h3 or self::h4 or self::li or self::p or self::span or self::time or self::ul]/text()";

// Core regex patterns
const THREE_COMP_REGEX_A = new RegExp(`(${DAY_RE})[/.-](${MONTH_RE})[/.-](${YEAR_RE})`);
const THREE_COMP_REGEX_B = new RegExp(`(${DAY_RE})/(${MONTH_RE})/([0-9]{2})|(${DAY_RE})[.-](${MONTH_RE})[.-]([0-9]{2})`);
const TWO_COMP_REGEX = new RegExp(`(${MONTH_RE})[/.-](${YEAR_RE})`);

// Search patterns
const YEAR_PATTERN = new RegExp(`^\\D?(${YEAR_RE})`);
const COPYRIGHT_PATTERN = new RegExp(`(?:\u00a9|\\&copy;|Copyright|\\(c\\))\\D*(?:${YEAR_RE})?-?(${YEAR_RE})\\D`);
const THREE_PATTERN = new RegExp("/([0-9]{4}/[0-9]{2}/[0-9]{2})[01/]");
const THREE_CATCH = new RegExp("([0-9]{4})/([0-9]{2})/([0-9]{2})");
const THREE_LOOSE_PATTERN = new RegExp("\\D([0-9]{4}[/.-][0-9]{2}[/.-][0-9]{2})\\D");
const THREE_LOOSE_CATCH = new RegExp("([0-9]{4})[/.-]([0-9]{2})[/.-]([0-9]{2})");
const SELECT_YMD_PATTERN = new RegExp("\\D([0-3]?[0-9][/.-][01]?[0-9][/.-][0-9]{4})\\D");
const SELECT_YMD_YEAR = new RegExp(`(${YEAR_RE})\\D?$`);
const YMD_YEAR = new RegExp(`^(${YEAR_RE})`);
const DATESTRINGS_PATTERN = new RegExp("\\D(?:19[0-9]{2}|20[0-9]{2})[01][0-9][0-3][0-9]\\D");
const DATESTRINGS_CATCH = new RegExp(`(${YEAR_RE})([01][0-9])([0-3][0-9])`);
const SLASHES_PATTERN = new RegExp("\\D([0-3]?[0-9]/[01]?[0-9]/[0129][0-9]|[0-3][0-9]\\.[01][0-9]\\.[0129][0-9])\\D");
const SLASHES_YEAR = new RegExp("([0-9]{2})$");
const YYYYMM_PATTERN = new RegExp("\\D([12][0-9]{3}[/.-](?:1[0-2]|0[1-9]))\\D");
const YYYYMM_CATCH = new RegExp(`(${YEAR_RE})[/.-](1[0-2]|0[1-9]|)`);
const MMYYYY_PATTERN = new RegExp("\\D([01]?[0-9][/.-][12][0-9]{3})\\D");
const MMYYYY_YEAR = new RegExp(`(${YEAR_RE})\\D?$`);
const SIMPLE_PATTERN = new RegExp(`(?<!w3.org)\\D(${YEAR_RE})\\D`);


const YMD_NO_SEP_PATTERN = /\b(\d{8})\b/;
const YMD_PATTERN = new RegExp(
    `(?:\\D|^)(?:(?<year>${YEAR_RE})[\-/.](?<month>${MONTH_RE})[\-/.](?<day>${DAY_RE})|` +
    `(?<day2>${DAY_RE})[\-/.](?<month2>${MONTH_RE})[\-/.](?<year2>\\d{2,4}))(?:\\D|$)`
);
const YM_PATTERN = new RegExp(
    `(?:\\D|^)(?:(?<year>${YEAR_RE})[\-/.](?<month>${MONTH_RE})|` +
    `(?<month2>${MONTH_RE})[\-/.](?<year2>${YEAR_RE}))(?:\\D|$)`
);

const REGEX_MONTHS = `
January?|February?|March|A[pv]ril|Ma[iy]|Jun[ei]|Jul[iy]|August|September|O[ck]tober|November|De[csz]ember|
Jan|Feb|M[a\u00e4]r|Apr|Jun|Jul|Aug|Sep|O[ck]t|Nov|De[cz]|
Januari|Februari|Maret|Mei|Agustus|
J\u00e4nner|Feber|M\u00e4rz|
janvier|f\u00e9vrier|mars|juin|juillet|aout|septembre|octobre|novembre|d\u00e9cembre|
Ocak|\u015eubat|Mart|Nisan|May\u0131s|Haziran|Temmuz|A\u011fustos|Eyl\u00fcl|Ekim|Kas\u0131m|Aral\u0131k|
Oca|\u015eub|Mar|Nis|Haz|Tem|A\u011fu|Eyl|Eki|Kas|Ara
`.replace(/\n/g, '');

const LONG_TEXT_PATTERN = new RegExp(
    `(?<month>${REGEX_MONTHS})\\s` +
    `(?<day>${DAY_RE})(?:st|nd|rd|th)?,? (?<year>${YEAR_RE})|` +
    `(?<day2>${DAY_RE})(?:st|nd|rd|th|\\.)? (?:of )?` +
    `(?<month2>${REGEX_MONTHS})[,.]? (?<year2>${YEAR_RE})`,
    'i'
);

const COMPLETE_URL = new RegExp(`\\D(${YEAR_RE})[/_-](${MONTH_RE})[/_-](${DAY_RE})(?:\\D|$)`);

const JSON_MODIFIED = new RegExp(`"dateModified": ?"(${YEAR_RE}-${MONTH_RE}-${DAY_RE})"`, 'i');
const JSON_PUBLISHED = new RegExp(`"datePublished": ?"(${YEAR_RE}-${MONTH_RE}-${DAY_RE})"`, 'i');
const TIMESTAMP_PATTERN = new RegExp(`(${YEAR_RE}-${MONTH_RE}-${DAY_RE}).[0-9]{2}:[0-9]{2}:[0-9]{2}`);

const MONTHS = [
    ["jan", "januar", "j\u00e4nner", "january", "januari", "janvier", "ocak", "oca"],
    ["feb", "februar", "feber", "february", "februari", "f\u00e9vrier", "\u015fubat", "\u015fub"],
    ["mar", "m\u00e4r", "m\u00e4rz", "march", "maret", "mart", "mars"],
    ["apr", "april", "avril", "nisan", "nis"],
    ["may", "mai", "mei", "may\u0131s"],
    ["jun", "juni", "june", "juin", "haziran", "haz"],
    ["jul", "juli", "july", "juillet", "temmuz", "tem"],
    ["aug", "august", "agustus", "a\u011fustos", "a\u011fu", "aout"],
    ["sep", "september", "septembre", "eyl\u00fcl", "eyl"],
    ["oct", "oktober", "october", "octobre", "okt", "ekim", "eki"],
    ["nov", "november", "kas\u0131m", "kas", "novembre"],
    ["dec", "dez", "dezember", "december", "desember", "d\u00e9cembre", "aral\u0131k", "ara"],
];

const TEXT_MONTHS = {};
MONTHS.forEach((monthList, index) => {
    monthList.forEach(month => {
        TEXT_MONTHS[month] = index + 1;
    });
});

const TEXT_DATE_PATTERN = /[.:,_/ -]|^\d+$/;

const DISCARD_PATTERNS = new RegExp(
    "^\\d{2}:\\d{2}(?: |:|$)|" +
    "^\\D*\\d{4}\\D*$|" +
    "[$\u20ac\u00a5\u04b0\u00a3\u00a2\u20bd\u20b1\u0e3f#\u20b9]|" +
    "[A-Z]{3}[^A-Z]|" +
    "(?:^|\\D)(?:\\+\\d{2}|\\d{3}|\\d{5})\\D|" +
    "ftps?|https?|sftp|" +
    "\\.(?:com|net|org|info|gov|edu|de|fr|io)\\b|" +
    "IBAN|[A-Z]{2}[0-9]{2}|" +
    "\u00ae"
);

const TEXT_PATTERNS = new RegExp(
    '(?:date[^0-9"]{,20}|updated|published|on)(?:[ :])*?([0-9]{1,4})[./]([0-9]{1,2})[./]([0-9]{2,4})|' +
    "(?:Datum|Stand|Ver\u00f6ffentlicht am):? ?([0-9]{1,2})\\.([0-9]{1,2})\\.([0-9]{2,4})|" +
    "(?:g\u00fcncellen?me|yay\u0131(?:m|n)lan?ma) *?(?:tarihi)? *?:? *?([0-9]{1,2})[./]([0-9]{1,2})[./]([0-9]{2,4})|" +
    "([0-9]{1,2})[./]([0-9]{1,2})[./]([0-9]{2,4}) *?(?:'de|'da|'te|'ta|'de|'da|'te|'ta|tarihinde) *(?:g\u00fcncellendi|yay\u0131(?:m|n)land\u0131)",
    "i"
);

function discard_unwanted(tree) {
    const myDiscarded = [];
    const discardElements = tree.querySelectorAll('#wm-ipp-base, #wm-ipp');
    discardElements.forEach(element => {
        myDiscarded.push(element);
        element.parentNode.removeChild(element);
    });
    return [tree, myDiscarded];
}

function extract_url_date(testurl, options) {
    if (testurl) {
        const match = COMPLETE_URL.exec(testurl);
        if (match) {
            LOGGER.debug(`found date in URL: ${match[0]}`);
            try {
                const dateObject = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
                if (is_valid_date(dateObject, options.format, options.min, options.max)) {
                    return dateObject.toISOString().slice(0, 10);
                }
            } catch (err) {
                LOGGER.debug(`conversion error: ${match[0]} ${err}`);
            }
        }
    }
    return null;
}

function correct_year(year) {
    if (year < 100) {
        return year + (year >= 90 ? 1900 : 2000);
    }
    return year;
}

function try_swap_values(day, month) {
    return month > 12 && day <= 12 ? [month, day] : [day, month];
}

function regex_parse(string) {
    const match = LONG_TEXT_PATTERN.exec(string);
    if (!match) {
        return null;
    }
    const groups = match.groups.year ? ['day', 'month', 'year'] : ['day2', 'month2', 'year2'];
    try {
        let [day, month, year] = [
            parseInt(match.groups[groups[0]]),
            TEXT_MONTHS[match.groups[groups[1]]?.toLowerCase().replace(/\.$/, '')],
            parseInt(match.groups[groups[2]])
        ];
        year = correct_year(year);
        [day, month] = try_swap_values(day, month);
        const dateObject = new Date(year, month - 1, day);
        LOGGER.debug(`multilingual text found: ${dateObject}`);
        return dateObject;
    } catch (err) {
        return null;
    }
}

function custom_parse(string, outputformat, min_date, max_date) {
    LOGGER.debug(`custom parse test: ${string}`);

    if (string.slice(0, 4).match(/^\d{4}$/)) {
        let candidate = null;
        if (string.slice(4, 8).match(/^\d{4}$/)) {
            try {
                candidate = new Date(parseInt(string.slice(0, 4)), parseInt(string.slice(4, 6)) - 1, parseInt(string.slice(6, 8)));
            } catch (err) {
                LOGGER.debug(`8-digit error: ${string.slice(0, 8)}`);
            }
        } else {
            try {
                candidate = new Date(string);
            } catch (err) {
                LOGGER.debug(`not an ISO date string: ${string}`);
                try {
                    candidate = new Date(Date.parse(string));
                } catch (err) {
                    LOGGER.debug(`dateutil parsing error: ${string}`);
                }
            }
        }
        if (candidate && is_valid_date(candidate, outputformat, min_date, max_date)) {
            LOGGER.debug(`parsing result: ${candidate}`);
            return candidate.toISOString().slice(0, 10);
        }
    }

    const match = YMD_NO_SEP_PATTERN.exec(string);
    if (match) {
        try {
            const [year, month, day] = [parseInt(match[1].slice(0, 4)), parseInt(match[1].slice(4, 6)), parseInt(match[1].slice(6, 8))];
            const candidate = new Date(year, month - 1, day);
            if (is_valid_date(candidate, '%Y-%m-%d', min_date, max_date)) {
                LOGGER.debug(`YYYYMMDD match: ${candidate}`);
                return candidate.toISOString().slice(0, 10);
            }
        } catch (err) {
            LOGGER.debug(`YYYYMMDD value error: ${match[0]}`);
        }
    }

    const ymdMatch = YMD_PATTERN.exec(string);
    if (ymdMatch) {
        try {
            let year, month, day;
            if (ymdMatch.groups.day) {
                [year, month, day] = [parseInt(ymdMatch.groups.year), parseInt(ymdMatch.groups.month), parseInt(ymdMatch.groups.day)];
            } else {
                [day, month, year] = [parseInt(ymdMatch.groups.day2), parseInt(ymdMatch.groups.month2), parseInt(ymdMatch.groups.year2)];
                year = correct_year(year);
                [day, month] = try_swap_values(day, month);
            }
            const candidate = new Date(year, month - 1, day);
            if (is_valid_date(candidate, '%Y-%m-%d', min_date, max_date)) {
                LOGGER.debug(`regex match: ${candidate}`);
                return candidate.toISOString().slice(0, 10);
            }
        } catch (err) {
            LOGGER.debug(`regex value error: ${ymdMatch[0]}`);
        }
    }

    const ymMatch = YM_PATTERN.exec(string);
    if (ymMatch) {
        try {
            let year, month;
            if (ymMatch.groups.month) {
                [year, month] = [parseInt(ymMatch.groups.year), parseInt(ymMatch.groups.month)];
            } else {
                [year, month] = [parseInt(ymMatch.groups.year2), parseInt(ymMatch.groups.month2)];
            }
            const candidate = new Date(year, month - 1, 1);
            if (is_valid_date(candidate, '%Y-%m-%d', min_date, max_date)) {
                LOGGER.debug(`Y-M match: ${candidate}`);
                return candidate.toISOString().slice(0, 10);
            }
        } catch (err) {
            LOGGER.debug(`Y-M value error: ${ymMatch[0]}`);
        }
    }

    const dateObject = regex_parse(string);
    if (is_valid_date(dateObject, outputformat, min_date, max_date)) {
        try {
            LOGGER.debug(`custom parse result: ${dateObject}`);
            return dateObject.toISOString().slice(0, 10);
        } catch (err) {
            LOGGER.error(`value error during conversion: ${string} ${err}`);
        }
    }

    return null;
}
function external_date_parser(string, outputformat) {
    LOGGER.debug(`send to external parser: ${string}`);
    try {
        const target = new Date(string);
        if (isNaN(target.getTime())) {
            return null;
        }
        return target.toISOString().slice(0, 10);
    } catch (err) {
        LOGGER.error(`external parser error: ${string} ${err}`);
        return null;
    }
}

function try_date_expr(string, outputformat, extensive_search, min_date, max_date) {
    if (!string) {
        return null;
    }

    string = string.trim().slice(0, MAX_SEGMENT_LEN);

    const digitCount = string.split('').filter(char => /\d/.test(char)).length;
    if (!string || !(4 <= digitCount && digitCount <= 18)) {
        return null;
    }

    if (DISCARD_PATTERNS.test(string)) {
        return null;
    }

    const customresult = custom_parse(string, outputformat, min_date, max_date);
    if (customresult !== null) {
        return customresult;
    }

    if (extensive_search && TEXT_DATE_PATTERN.test(string)) {
        const dateparserResult = external_date_parser(string, outputformat);
        if (is_valid_date(dateparserResult, outputformat, min_date, max_date)) {
            return dateparserResult;
        }
    }

    return null;
}

function img_search(tree, options) {
    const element = tree.querySelector('meta[property="og:image"][content]');
    if (element !== null) {
        return extract_url_date(element.getAttribute("content"), options);
    }
    return null;
}

function pattern_search(text, date_pattern, options) {
    const match = date_pattern.exec(text);
    if (match && is_valid_date(match[1], "%Y-%m-%d", options.min, options.max)) {
        LOGGER.debug(`regex found: ${date_pattern} ${match[0]}`);
        return convert_date(match[1], "%Y-%m-%d", options.format);
    }
    return null;
}

function json_search(tree, options) {
    // const json_pattern = options.original ? JSON_PUBLISHED : JSON_MODIFIED;
    const json_pattern = JSON_MODIFIED;
    const elements = tree.querySelectorAll('script[type="application/ld+json"], script[type="application/settings+json"]');
    for (const elem of elements) {
        if (!elem.textContent || !elem.textContent.includes('"date')) {
            continue;
        }
        return pattern_search(elem.textContent, json_pattern, options);
    }
    return null;
}

function idiosyncrasies_search(htmlstring, options) {
    const match = TEXT_PATTERNS.exec(htmlstring);
    if (match) {
        const parts = match.slice(1).filter(Boolean);
        try {
            let candidate;
            if (parts[0].length === 4) {
                candidate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            } else {
                let [day, month] = try_swap_values(parseInt(parts[0]), parseInt(parts[1]));
                let year = correct_year(parseInt(parts[2]));
                candidate = new Date(year, month - 1, day);
            }
            if (is_valid_date(candidate, "%Y-%m-%d", options.min, options.max)) {
                return candidate.toISOString().slice(0, 10);
            }
        } catch (err) {
            LOGGER.debug(`cannot process idiosyncrasies: ${match[0]}`);
        }
    }
    return null;
}

export {
    discard_unwanted,
    extract_url_date,
    regex_parse,
    custom_parse,
    external_date_parser,
    try_date_expr,
    img_search,
    pattern_search,
    json_search,
    idiosyncrasies_search,
    DATE_EXPRESSIONS,
    FAST_PREPEND,
    SLOW_PREPEND,
    FREE_TEXT_EXPRESSIONS,
    MAX_SEGMENT_LEN,
    MIN_SEGMENT_LEN,
    YEAR_PATTERN,
    YMD_PATTERN,
    COPYRIGHT_PATTERN,
    TIMESTAMP_PATTERN,
    THREE_PATTERN,
    THREE_CATCH,
    THREE_LOOSE_PATTERN,
    THREE_LOOSE_CATCH,
    SELECT_YMD_PATTERN,
    SELECT_YMD_YEAR,
    YMD_YEAR,
    DATESTRINGS_PATTERN,
    DATESTRINGS_CATCH,
    SLASHES_PATTERN,
    SLASHES_YEAR,
    YYYYMM_PATTERN,
    YYYYMM_CATCH,
    MMYYYY_PATTERN,
    MMYYYY_YEAR,
    SIMPLE_PATTERN,
    THREE_COMP_REGEX_A,
    THREE_COMP_REGEX_B,
    TWO_COMP_REGEX,
};