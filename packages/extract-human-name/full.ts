/**
 * @fileoverview extract-human-name/full: the same API as
 * `extract-human-name`, with the 92k human-names database
 * (`human-names-92k.json`, ~1.1 MB) bundled and registered on
 * import, so person vs. organization detection works offline
 * without `loadHumanNamesDB()`. Prefer the default slim entry
 * plus lazy loading in browsers.
 */
import dataHumanNames from "./human-names-92k.json";
import { setHumanNamesDB } from "./human-names-db";

setHumanNamesDB(dataHumanNames as Record<string, number>);

export * from "./index";
