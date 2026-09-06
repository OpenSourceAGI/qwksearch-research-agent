/**
 * Engine Status — Re-exports the EngineStatusTracker class and the global
 * `engineStatusTracker` singleton from the canonical registry module.
 * The tracker records per-engine success/failure counts, response times,
 * and health status, and gates which engines are eligible to run.
 */
export * from "./registry/search-engine-status-tracker";
