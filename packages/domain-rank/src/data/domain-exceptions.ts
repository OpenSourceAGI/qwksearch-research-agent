/**
 * @fileoverview Manual overrides mapping domains to display titles.
 *
 * Covers domains whose auto-formatted or scraped title would be inaccurate
 * or inconsistent (e.g. government agencies, universities, organizations),
 * keyed by domain and consulted before falling back to `formatDomainAsTitle`.
 */
export const domainExceptions: Record<string, string> = {
  "pepsico.com": "PepsiCo",
  "doc.gov": "U.S. Department of Commerce",
  "wustl.edu": "Washington University in St. Louis",
  "unwomen.org": "UN Women",
  "gatech.edu": "Georgia Tech",
  "instructure.com": "Instructure",
  "usembassy.gov": "U.S. Embassy",
  "digitaljournal.com": "Digital Journal",
  "ico.org.uk": "Information Commissioner's Office",
  "colorado.edu": "University of Colorado",
  "anu.edu.au": "Australian National University",
  "syr.edu": "Syracuse University",
  "ucsb.edu": "UC Santa Barbara",
  "imperial.ac.uk": "Imperial College London",
  "grist.org": "Grist",
  "iucn.org": "IUCN",
  "corporatefinanceinstitute.com": "Corporate Finance Institute",
  "aph.gov.au": "Australian Parliament House",
  "reference.com": "Reference.com",
  "timeshighereducation.com": "Times Higher Education",
  "hopkinsmedicine.org": "Johns Hopkins Medicine",
  "ustr.gov": "United States Trade Representative",
};
