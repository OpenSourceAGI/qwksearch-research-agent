<p align="center">
    <img src="https://i.imgur.com/VRk5cbE.png" />
    <br />
    <a href="https://qwksearch.com/api"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Stars" /></a>
    <a href="https://www.npmjs.com/package/extract-name"><img src="https://img.shields.io/npm/dm/extract-name.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/extract-name"><img src="https://img.shields.io/npm/v/extract-name.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/extract-name"><img src="https://img.shields.io/npm/dt/extract-name.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/extract-name"><img src="https://img.shields.io/npm/types/extract-name" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=extract-name"><img src="https://packagephobia.com/badge?p=extract-name" alt="Install size" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/qwksearch-research-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/qwksearch-research-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <a href="https://stackblitz.com/github/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/extract-name"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
</p>


# extract-name

Extracts, characterizes, and structures human author names from arbitrary text. Tells a person ("Dr. John Doe") from an organization ("The New York Times"), parses a name into its parts, splits multi-author bylines, and formats APA-style citations — no network, no model, no browser.

```bash
bun add extract-name
```

Formerly published as `extract-human-name`; the API is unchanged, only the package name and import path moved. The source lives in `src/`.

```ts
import { extractHumanName } from "extract-name";

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

## Recognized titles, honorifics and prefixes

These are the exact word lists in [`src/constants.ts`](src/constants.ts). Matching ignores case and a trailing period, so `Dr`, `dr.` and `DR.` are the same word.

```ts
extractHumanNameParts("Rev. Martin Luther King Jr.");
// { title: "Rev.", firstname: "Martin", middle: "Luther", lastname: "King", honorific: "Jr." }

extractHumanNameParts("Sir Ludwig van Beethoven III");
// { title: "Sir", firstname: "Ludwig", middle: "", lastname: "van Beethoven", honorific: "III" }
```

**Titles** (`PARSE_LISTS.title`, 11) — the first matching word anywhere in the name becomes `title`:

`mr`, `mrs`, `ms`, `miss`, `dr`, `rev`, `prof`, `sir`, `madam`, `lord`, `lady`

**Honorifics and suffixes** (`PARSE_LISTS.honorific`, 19) — generational suffixes, degrees and post-nominals. The first match and every word after it become `honorific`, joined with `, `. Titles are pulled out first, so a leading `Dr.` is a title and a trailing one is an honorific:

`esq`, `esquire`, `jr`, `sr`, `ii`, `iii`, `iv`, `v`, `phd`, `md`, `ms`, `mrs`, `mr`, `miss`, `dr`, `dds`, `dvm`, `jd`, `cpa`

**Family-name prefixes** (`PARSE_LISTS.prefix`, 15) — joined to the word that follows them, so they stay part of `lastname` (`van Beethoven`, `da Silva`):

`de`, `van`, `von`, `der`, `den`, `vel`, `le`, `la`, `da`, `di`, `del`, `della`, `do`, `dos`, `das`

**Stripped by `cleanProfessionalQualifications`** (`PROFESSIONAL_PATTERNS`) — removed before a byline is parsed:

- Titles and degrees: `professor`, `prof`, `dr`, `doctor`, `phd`, `md`, `ms`, `mrs`, `mr`, `miss`
- Rank + role pairs: `senior`, `associate`, `assistant`, `visiting`, `emeritus` or `distinguished` followed by `professor`, `fellow`, `lecturer`, `researcher`, `scientist`, `analyst`, `director`, `editor`, `writer`, `author`, `correspondent`, `reporter` or `journalist`
- Field + role pairs such as `political scientist`, `energy analyst` or `health correspondent`, optionally led by a nationality or region (`Norwegian political scientist`)
- Career verbs (`worked`, `served`, `founded`, `reported`, …) and affiliation phrases (`at the university`, `for the institute`, …)
- Everything after the first `,`/`;`, ` & ` or ` and `, so only the first name in a byline survives

<details>
<summary><b>Person signals</b> (<code>TERMS_QUALIFICATIONS</code>, 78 words): checked after the organization terms; if none of those decided it, any one of these makes <code>isOrganization</code> answer "person"</summary>

`is`, `senior`, `associate`, `professor`, `fellow`, `assistant`, `lecturer`, `ceo`, `staff`, `strategist`, `specialist`, `worked`, `directed`, `correspondent`, `president`, `author`, `director`, `prof`, `asst`, `editor`, `analyst`, `degree`, `administrator`, `served`, `member`, `institute`, `economist`, `reporter`, `head`, `heads`, `newspaper`, `deputy`, `advocate`, `colonel`, `officer`, `founder`, `founded`, `visiting`, `journalist`, `former`, `retired`, `expert`, `executive`, `manager`, `doctoral`, `candidate`, `chief`, `contributor`, `student`, `blogger`, `chair`, `chairman`, `major`, `general`, `ambassador`, `phd`, `secretary`, `physicist`, `engineer`, `research`, `office`, `school`, `department`, `writer`, `teacher`, `advisor`, `award`, `center`, `commentator`, `rand`, `brookings`, `heritage`, `cato`, `un`, `aei`, `forbes`, `nyt`, `cbo`

</details>

<details>
<summary><b>Organization terms</b> (<code>TERMS_ORG</code>, 334 words): one term that is not also a known given name or surname marks an organization; ambiguous ones (<code>doe</code>, <code>jones</code>, <code>morgan</code>) only count in pairs, like <code>Morgan Stanley</code></summary>

`aaas`, `abc`, `academy`, `accountability`, `advancement`, `advisors`, `aei`, `affairs`, `african`, `ag`, `agency`, `agriculture`, `airbnb`, `amazon`, `america`, `american`, `ap`, `apple`, `asean`, `asian`, `assembly`, `associated`, `association`, `atlantic`, `atomic`, `attorneys`, `authority`, `aviation`, `axel`, `ban`, `bank`, `baptiste`, `bbc`, `bertelsmann`, `blackrock`, `bloomberg`, `bmw`, `boston`, `broadcasting`, `brookings`, `budget`, `bureau`, `business`, `buzzfeed`, `cambridge`, `capital`, `cato`, `cbo`, `cbs`, `cdc`, `center`, `cfr`, `chase`, `chemical`, `chicago`, `china`, `church`, `cia`, `citigroup`, `civil`, `clinic`, `club`, `cnas`, `cnn`, `coca-cola`, `college`, `commerce`, `commission`, `communications`, `comprehensive`, `condé`, `congressional`, `consulting`, `corp`, `corporation`, `corps`, `costco`, `council`, `countries`, `court`, `criminal`, `csis`, `ctbto`, `cultural`, `daily`, `defense`, `department`, `der`, `deutsche`, `development`, `division`, `dod`, `doe`, `dow`, `economics`, `economist`, `education`, `eight`, `energy`, `enterprise`, `enterprises`, `epa`, `eu`, `european`, `exchange`, `exporting`, `fabrication`, `facebook`, `fao`, `fargo`, `fbi`, `fda`, `fed`, `federal`, `ferrari`, `financial`, `food`, `forbes`, `ford`, `foreign`, `foundation`, `fox`, `france`, `ftc`, `fund`, `g20`, `g7`, `g8`, `gannett`, `gao`, `general`, `global`, `globe`, `gm`, `gmbh`, `goldman`, `google`, `government`, `group`, `guardian`, `harvard`, `health`, `hearst`, `herald`, `heritage`, `hill`, `holdings`, `home`, `homeland`, `honda`, `hospital`, `housing`, `huffington`, `human`, `iaea`, `ibm`, `icao`, `icc`, `icj`, `ilo`, `imf`, `imo`, `inc`, `industries`, `institute`, `institution`, `intel`, `interior`, `international`, `investments`, `ipcc`, `itu`, `japan`, `jazeera`, `jones`, `jpmorgan`, `justice`, `labor`, `laboratories`, `lancet`, `law`, `legal`, `linkedin`, `llc`, `los`, `ltd`, `macy's`, `management`, `manufacturing`, `maritime`, `mcdonald's`, `media`, `medical`, `mercedes-benz`, `meta`, `meteorological`, `microsoft`, `ministry`, `mit`, `monetary`, `morgan`, `mosque`, `msnbc`, `nas`, `nasa`, `nast`, `national`, `nations`, `nato`, `nbc`, `netflix`, `new`, `news`, `newsweek`, `nih`, `nike`, `noaa`, `nordstrom`, `north`, `npr`, `nsa`, `nuclear`, `ny`, `oecd`, `office`, `omb`, `opcw`, `opec`, `organization`, `oxford`, `partners`, `país`, `pbs`, `pentagon`, `peterson`, `petroleum`, `plc`, `politico`, `porsche`, `post`, `preparatory`, `press`, `productions`, `prohibition`, `r&d`, `rand`, `regiment`, `relations`, `research`, `reserve`, `retail`, `reuters`, `rt`, `sachs`, `school`, `science`, `sciences`, `scientific`, `sec`, `securities`, `security`, `services`, `seven`, `solutions`, `south`, `southeast`, `spacex`, `spiegel`, `springer`, `stanford`, `stanley`, `starbucks`, `state`, `straits`, `strategic`, `studios`, `sydney`, `synagogue`, `systems`, `target`, `team`, `tech`, `techcrunch`, `telecommunication`, `temple`, `tesla`, `test`, `the`, `thomson`, `times`, `toronto`, `toyota`, `trade`, `transportation`, `treasury`, `treaty`, `trust`, `twenty`, `twitter`, `uber`, `un`, `undp`, `unep`, `unesco`, `unicef`, `union`, `united`, `university`, `urban`, `usa`, `usgs`, `valley`, `vanguard`, `veterans`, `vice`, `volkswagen`, `volvo`, `vox`, `wall`, `walmart`, `weapons`, `welle`, `wells`, `white`, `who`, `wired`, `wmo`, `works`, `world`, `worldwide`, `wsj`, `wto`, `york`, `yorker`

</details>

`ORG_PATTERNS` adds three regexes on top: corporate and institutional words (`inc`, `ltd`, `llc`, `corp`, `foundation`, `institute`, `committee`, …), `United States` / `European Union`-style phrases, and sector + body pairs such as `research council` or `intergovernmental panel`.

## The names database: slim default vs. `/full`

The default entry is slim: it does **not** bundle the 92k-entry names JSON (`human-names-92k.json`, ~1.1 MB). Person-vs-organization detection runs on a compact built-in list of ~5,000 given names and 5,000 common surnames plus word heuristics. The full database is loaded **only when needed**, one of two ways:

```ts
// Lazy-load it from the jsDelivr CDN (one shared request, cached;
// resolves null on failure, so a CDN outage never breaks extraction)
import { extractHumanName, loadHumanNamesDB } from "extract-name";
await loadHumanNamesDB(); // or { url, fetch } to self-host

// Or bundle it: same API, names database registered on import
import { extractHumanName } from "extract-name/full";
```

`setHumanNamesDB(db)` registers a copy you already hold, and `getHumanNamesDB()` reads the current one. Both entries share one database, so importing `extract-name/full` once enables it for the slim import too.

With the database loaded, a name whose words are outside the compact list is still recognized as a person:

```ts
await loadHumanNamesDB();
extractHumanName("Zephyr Quill Xylo").author_type; // 1 (person), not 4 (organization)
```

## Demo

The Citation tab of the [extract-pdf site](../extract-pdf/site) (`/demo#cite`) runs name recognition against news, journal, organization and blog URLs.

## Tests

```bash
cd packages/extract-name && bun run test
```

Covers name parsing, byline splitting, organization detection (with and without the database), the `extractHumanName` citation forms, and the lazy loader (single shared request, failure fallback, retry, `/full` registration).
