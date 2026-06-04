import countryIndexData from "./country-index.json";
import newsDomainRankCsv from "./news-domain-rank.csv?raw";
import newsDomainRankData from "./news-domain-rank.json";

export type DomainRankCountryCode = number;
export type DomainRankPosition = number;

export type NewsDomainRankEntry = readonly [
  sourceName: string,
  countryCode: DomainRankCountryCode,
  rank: DomainRankPosition,
];

export type NewsDomainRankMap = Record<string, NewsDomainRankEntry>;
export type CountryIndexMap = Record<string, string>;

export {
  countryIndexData,
  newsDomainRankCsv,
  newsDomainRankData,
};
