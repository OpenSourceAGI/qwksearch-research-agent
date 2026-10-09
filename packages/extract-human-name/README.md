# extract-human-name

Extracts, characterizes, and structures human author names from arbitrary text. Tells a person ("Dr. John Doe") from an organization ("The New York Times"), parses a name into its parts, splits multi-author bylines, and formats APA-style citations — no network, no model, no browser.

```bash
bun add extract-human-name
```

```ts
import { extractHumanName } from "extract-human-name";

extractHumanName("by: Dr. John Q. Public Jr.");
// {
//   author_cite: "Public, John Q., Jr.",
//   author_short: "Public",
//   author_type: 1
// }

extractHumanName("John Doe and Jane Smith");
// { author_cite: "Doe, John & Smith, Jane", author_short: "Doe & Smith", author_type: 2 }

extractHumanName("The New York Times");
// { author_cite: "The New York Times", author_short: "The New York Times", author_type: 4 }
```

## API

### `extractHumanName(author, options?)`

The main entry. Sanitizes the input (strips `by:` prefixes, collapses whitespace), splits a byline into individual authors, classifies each one as a person or an organization, and compiles citation forms.

| Option | Default | |
| --- | --- | --- |
| `formatCiteShortenAuthor` | `false` | Abbreviate given names to initials: `"John Quincy Doe"` → `"Doe, J. Q."` |
| `maxAuthorsBeforeEtAl` | `2` | List this many authors in full before collapsing to `"First et al."` |

`author_type` values:

| Value | Meaning |
| --- | --- |
| `0` | Empty or unparseable input |
| `1` | A single person |
| `2` | Exactly two authors |
| `3` | Three or more authors |
| `4` | A single organization |

### `extractHumanNameParts(input)`

Parses one name into `{ title, firstname, middle, lastname, honorific }`. Handles `"Last, First"` inversion, multi-word family prefixes (`Ludwig van Beethoven` → lastname `"van Beethoven"`), quoted aliases (`John "The Rocket" Doe`), and fixes the case of all-upper/all-lower input.

### `cleanProfessionalQualifications(authorName)`

Strips honorifics, titles, and professional qualifications (`"Dr. John Smith, Professor"` → `"John Smith"`).

### `splitMultipleAuthors(authorString)`

Partitions a byline into individual names. Handles `"Last, First & Last, First"`, comma series with a trailing `and`, `&`/`and`/semicolon separators, and drops `et al.`.

### `isOrganization(nameString)`

The person-vs-organization heuristic: rigid acronyms (`WHO`), an organization dictionary (decisive terms, or ambiguous terms in pairs like `Morgan Stanley`), qualification counter-terms (`Professor …`), `"Last, First"` inversion, organizational phrases, word count, and the names database.

## The names database: slim default vs. `/full`

The default entry is slim: it does **not** bundle the 92k-entry names JSON (`human-names-92k.json`, ~1.1 MB). Person-vs-organization detection runs on a compact built-in list of ~5,000 given names and 5,000 common surnames plus word heuristics. The full database is loaded **only when needed**, one of two ways:

```ts
// Lazy-load it from the jsDelivr CDN (one shared request, cached;
// resolves null on failure, so a CDN outage never breaks extraction)
import { extractHumanName, loadHumanNamesDB } from "extract-human-name";
await loadHumanNamesDB(); // or { url, fetch } to self-host

// Or bundle it: same API, names database registered on import
import { extractHumanName } from "extract-human-name/full";
```

`setHumanNamesDB(db)` registers a copy you already hold, and `getHumanNamesDB()` reads the current one. Both entries share one database, so importing `extract-human-name/full` once enables it for the slim import too.

With the database loaded, a name whose words are outside the compact list is still recognized as a person:

```ts
await loadHumanNamesDB();
extractHumanName("Zephyr Quill Xylo").author_type; // 1 (person), not 4 (organization)
```

## Demo

The Citation tab of the [extract-pdf site](../extract-pdf/site) (`/demo#cite`) runs name recognition against news, journal, organization and blog URLs.

## Tests

```bash
cd packages/extract-human-name && bun run test
```

Covers name parsing, byline splitting, organization detection (with and without the database), the `extractHumanName` citation forms, and the lazy loader (single shared request, failure fallback, retry, `/full` registration).
