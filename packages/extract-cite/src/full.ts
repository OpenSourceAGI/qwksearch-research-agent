/**
 * @fileoverview extract-cite/full: the same API as `extract-cite`, with the
 * 92k human-names database bundled and registered on import, so person vs.
 * organization detection works offline without `loadHumanNamesDB()`.
 * Adds ~1 MB; prefer the default slim entry plus lazy loading in browsers.
 */
import dataHumanNames from "./html-to-cite/human-names-92k.json";
import { setHumanNamesDB } from "./html-to-cite/human-names-db";

setHumanNamesDB(dataHumanNames as Record<string, number>);

export * from "./index";
