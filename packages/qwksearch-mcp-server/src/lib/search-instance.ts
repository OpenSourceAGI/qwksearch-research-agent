import { Search } from "search-web-api";

let instance: Search | null = null;

export function getSearchInstance(): Search {
  if (!instance) {
    instance = new Search();
  }
  return instance;
}
