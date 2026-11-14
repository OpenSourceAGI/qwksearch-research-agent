/**
 * @fileoverview Constants and dictionaries for human name parsing and organization detection.
 */

/**
 * Common organization terms used for heuristic detection.
 * Encoded as a `Set` for O(1) lookup performance.
 */
export const TERMS_ORG = new Set(
  ("abc,ag,ap,academy,advisors,agency,airbnb,amazon,america,american,apple,associated,association," +
    "atlantic,attorneys,authority,axel,bank,baptiste,bbc,bertelsmann,blackrock,bloomberg,bmw,boston," +
    "broadcasting,bureau,business,buzzfeed,cambridge,capital,cbs,center,chase,chicago,china,church,citigroup," +
    "clinic,club,cnn,coca-cola,college,commission,communications,condé,consulting,corp,corps,costco,daily," +
    "department,der,deutsche,division,dow,economist,enterprises,eu,european,fabrication,facebook,fargo," +
    "ferrari,financial,ford,forbes,fox,france,fund,gannett,general,global,globe,gm,gmbh,goldman,google," +
    "group,guardian,harvard,hearst,herald,hill,holdings,home,honda,hospital,huffington,ibm,inc,industries," +
    "institute,intel,international,investments,jazeera,japan,jones,jpmorgan,lancet,laboratories,law,legal," +
    "linkedin,llc,los,ltd,manufacturing,macy's,mcdonald's,media,medical,mercedes-benz,meta,microsoft,ministry," +
    "mit,morgan,mosque,msnbc,nast,national,nato,nbc,netflix,news,newsweek,new,nike,nordstrom,npr,ny,organization," +
    "oxford,país,partners,pbs,pentagon,plc,politico,porsche,post,press,productions,r&d,regiment,retail,reuters," +
    "research,rt,sachs,school,science,scientific,solutions,south,spacex,spiegel,springer,stanford,stanley," +
    "starbucks,straits,studios,sydney,synagogue,systems,target,team,tech,techcrunch,temple,tesla,the,thomson," +
    "times,toronto,toyota,trust,twitter,uber,union,united,university,usa,valley,vanguard,vice,volkswagen,volvo," +
    "vox,wall,walmart,welle,wells,who,white,wired,worldwide,works,world,wsj,york,yorker,ipcc,un,unep,undp,unicef," +
    "wto,imf,oecd,cia,fbi,nsa,epa,fda,cdc,nih,nasa,noaa,usgs,doe,dod,state,treasury,commerce,labor,education," +
    "energy,interior,agriculture,transportation,housing,urban,development,veterans,affairs,homeland,security," +
    "justice,defense,health,human,services,congressional,budget,office,cbo,government,accountability,gao,management," +
    "omb,federal,reserve,fed,securities,exchange,sec,trade,ftc,sciences,nas,advancement,aaas,brookings,institution," +
    "heritage,foundation,cato,aei,enterprise,rand,corporation,strategic,csis,peterson,economics,council,foreign," +
    "relations,cfr,cnas,monetary,petroleum,exporting,countries,opec,north,treaty,african,asean,southeast,asian," +
    "nations,g7,g8,g20,seven,eight,twenty,assembly,court,icj,criminal,icc,ilo,food,fao,unesco,cultural," +
    "telecommunication,itu,meteorological,wmo,maritime,imo,civil,aviation,icao,atomic,iaea,prohibition,chemical," +
    "weapons,opcw,comprehensive,nuclear,test,ban,ctbto,preparatory").split(","),
);

/**
 * Qualification terms that suggest a string refers to a person rather than an organization.
 * Encoded as a `Set` for O(1) lookup performance.
 */
export const TERMS_QUALIFICATIONS = new Set([
  "is",
  "senior",
  "associate",
  "professor",
  "fellow",
  "assistant",
  "lecturer",
  "ceo",
  "staff",
  "strategist",
  "specialist",
  "worked",
  "directed",
  "correspondent",
  "president",
  "author",
  "director",
  "prof",
  "asst",
  "editor",
  "analyst",
  "degree",
  "administrator",
  "served",
  "member",
  "institute",
  "economist",
  "reporter",
  "head",
  "heads",
  "newspaper",
  "deputy",
  "advocate",
  "colonel",
  "officer",
  "founder",
  "founded",
  "visiting",
  "journalist",
  "former",
  "retired",
  "expert",
  "executive",
  "manager",
  "doctoral",
  "candidate",
  "chief",
  "contributor",
  "student",
  "blogger",
  "chair",
  "chairman",
  "major",
  "general",
  "ambassador",
  "phd",
  "secretary",
  "physicist",
  "engineer",
  "research",
  "office",
  "school",
  "department",
  "writer",
  "teacher",
  "advisor",
  "award",
  "center",
  "commentator",
  "rand",
  "brookings",
  "heritage",
  "cato",
  "un",
  "aei",
  "forbes",
  "nyt",
  "cbo",
]);

/**
 * Professional qualification regex patterns to prune from author names before parsing.
 */
export const PROFESSIONAL_PATTERNS: RegExp[] = [
  /\b(professor|prof|dr|doctor|phd|md|ms|mrs|mr|miss)\b\.?\s*/gi,
  /\b(senior|associate|assistant|visiting|emeritus|distinguished)\s+(professor|fellow|lecturer|researcher|scientist|analyst|director|editor|writer|author|correspondent|reporter|journalist)\b\.?\s*/gi,
  /\b(political|economic|social|environmental|climate|energy|security|military|defense|foreign|international|public|health|medical|legal|business|financial|data|computer|software|artificial|intelligence|ai)\s+(scientist|analyst|expert|specialist|researcher|scholar|fellow|consultant|advisor|director|manager|officer|correspondent|reporter|journalist|writer|author|editor|commentator|blogger)\b\.?\s*/gi,
  /\b(norwegian|american|british|canadian|german|french|chinese|japanese|russian|indian|brazilian|australian|european|asian|african|latin|middle|eastern|western|northern|southern)\s+(political|economic|social|environmental|climate|energy|security|military|defense|foreign|international|public|health|medical|legal|business|financial|data|computer|software|artificial|intelligence|ai)\s+(scientist|analyst|expert|specialist|researcher|scholar|fellow|consultant|advisor|director|manager|officer|correspondent|reporter|journalist|writer|author|editor|commentator|blogger)\b\.?\s*/gi,
  /\b(worked|served|directed|founded|established|created|developed|designed|built|managed|led|headed|chaired|presided|authored|wrote|published|edited|reported|covered|analyzed|studied|researched|investigated|examined|evaluated|assessed|reviewed|critiqued|commented|blogged|tweeted|posted)\b\.?\s*/gi,
  /\b(at|in|for|with|from|to|of|the|a|an)\s+(university|college|institute|institution|organization|company|corporation|agency|department|ministry|government|congress|parliament|senate|house|assembly|council|board|committee|commission|foundation|center|centre|lab|laboratory|research|think|tank|policy|strategy|consulting|advisory|media|news|press|publication|journal|magazine|newspaper|website|blog|podcast|tv|television|radio|broadcast|network|channel|station|service|bureau|office|headquarters|hq|main|central|regional|local|national|international|global|worldwide|federal|state|provincial|municipal|city|town|village|community|society|association|union|federation|alliance|partnership|collaboration|cooperation|joint|shared|common|public|private|non-profit|nonprofit|ngo|charity|philanthropic|educational|academic|scholarly|scientific|technical|professional|commercial|business|corporate|industrial|financial|economic|political|social|cultural|environmental|climate|energy|security|military|defense|foreign|international|public|health|medical|legal|business|financial|data|computer|software|artificial|intelligence|ai)\b\.?\s*/gi,
  /[,;]\s*[^,;]*$/,
  /\s+&\s+[^&]*$/,
  /\s+and\s+[^and]*$/i,
  /\s+(political|economic|social|environmental|climate|energy|security|military|defense|foreign|international|public|health|medical|legal|business|financial|data|computer|software|artificial|intelligence|ai)\s+(scientist|analyst|expert|specialist|researcher|scholar|fellow|consultant|advisor|director|manager|officer|correspondent|reporter|journalist|writer|author|editor|commentator|blogger)\b.*$/gi,
];

/**
 * Common organizational regex patterns for detection.
 */
export const ORG_PATTERNS: RegExp[] = [
  /\b(inc|ltd|llc|corp|corporation|company|co\.?|group|associates|partners|consulting|services|solutions|systems|technologies|international|global|worldwide|national|federal|state|local|department|ministry|agency|bureau|office|commission|committee|council|board|institute|foundation|center|centre|organization|association|society|union|federation|alliance|coalition)\b/i,
  /\b(united|american|british|canadian|european|international|world|global|national|federal|state|local)\s+(states|kingdom|nations|organization|union|federation|government|department|ministry|agency|bureau|office|commission|committee|council|board|institute|foundation|center|centre|association|society)\b/i,
  /\b(intergovernmental|governmental|non-governmental|nonprofit|non-profit|charitable|philanthropic|educational|academic|research|scientific|technical|professional|commercial|business|corporate|industrial|financial|economic|political|social|cultural|environmental|climate|energy|security|military|defense|foreign|international|public|health|medical|legal|data|computer|software|artificial|intelligence|ai)\s+(panel|committee|commission|council|board|institute|foundation|center|centre|organization|association|society|union|federation|alliance|coalition|partnership|collaboration|cooperation|joint|shared|common|public|private|ngo|charity|philanthropic|educational|academic|scholarly|scientific|technical|professional|commercial|business|corporate|industrial|financial|economic|political|social|cultural|environmental|climate|energy|security|military|defense|foreign|international|public|health|medical|legal|data|computer|software|artificial|intelligence|ai)\b/i,
];

/**
 * Pre-compiled dictionary lists for standard parsing extraction.
 */
export const PARSE_LISTS = {
  honorific: new Set([
    "esq",
    "esquire",
    "jr",
    "sr",
    "ii",
    "iii",
    "iv",
    "v",
    "phd",
    "md",
    "ms",
    "mrs",
    "mr",
    "miss",
    "dr",
    "dds",
    "dvm",
    "jd",
    "cpa",
  ]),
  prefix: new Set([
    "de",
    "van",
    "von",
    "der",
    "den",
    "vel",
    "le",
    "la",
    "da",
    "di",
    "del",
    "della",
    "do",
    "dos",
    "das",
  ]),
  title: new Set([
    "mr",
    "mrs",
    "ms",
    "miss",
    "dr",
    "rev",
    "prof",
    "sir",
    "madam",
    "lord",
    "lady",
  ]),
};
