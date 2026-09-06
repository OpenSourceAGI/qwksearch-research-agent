/**
 * Search Engine Status Tracker — Monitors the health of every search engine
 * adapter at runtime. It records success and failure events, computes running
 * failure rates, and automatically marks an engine as "failed" when more than
 * 70 % of its recent requests have errored. Engines recover automatically once
 * their success rate exceeds twice their failure count.
 */

import { EngineStatus, EngineLog } from "../types/search-result-types";

export class EngineStatusTracker {
  private statusMap: Map<string, EngineStatus> = new Map();
  private logs: EngineLog[] = [];
  private maxLogs: number = 1000;

  /**
   * Initialise tracking state for an engine (no-op if already initialised).
   */
  initEngine(name: string, categories: string[] = []): void {
    if (!this.statusMap.has(name)) {
      this.statusMap.set(name, {
        name,
        status: "active",
        lastCheck: new Date(),
        lastSuccess: null,
        lastFailure: null,
        failureCount: 0,
        successCount: 0,
        totalRequests: 0,
        averageResponseTime: 0,
        categories,
      });
    }
  }

  /**
   * Record a successful engine execution and update rolling averages.
   */
  recordSuccess(
    engineName: string,
    responseTime: number,
    query?: string,
  ): void {
    const status = this.statusMap.get(engineName);
    if (!status) {
      this.initEngine(engineName);
      return this.recordSuccess(engineName, responseTime, query);
    }

    const now = new Date();
    status.lastCheck = now;
    status.lastSuccess = now;
    status.successCount++;
    status.totalRequests++;

    const totalTime =
      status.averageResponseTime * (status.successCount - 1) + responseTime;
    status.averageResponseTime = totalTime / status.successCount;

    if (status.failureCount > 0 && status.successCount > status.failureCount * 2) {
      status.status = "active";
    }

    this.addLog({ timestamp: now, engineName, status: "success", responseTime, query });
  }

  /**
   * Record a failed engine execution and escalate status if failure rate exceeds 70 %.
   */
  recordFailure(
    engineName: string,
    error: string,
    responseTime: number = 0,
    query?: string,
  ): void {
    const status = this.statusMap.get(engineName);
    if (!status) {
      this.initEngine(engineName);
      return this.recordFailure(engineName, error, responseTime, query);
    }

    const now = new Date();
    status.lastCheck = now;
    status.lastFailure = now;
    status.failureCount++;
    status.totalRequests++;
    status.lastError = error;

    if (status.totalRequests >= 5) {
      const failureRate = status.failureCount / status.totalRequests;
      if (failureRate > 0.7) {
        status.status = "failed";
      }
    }

    this.addLog({
      timestamp: now,
      engineName,
      status: "failure",
      responseTime,
      error,
      query,
    });
  }

  /**
   * Get the current status record for a specific engine.
   */
  getStatus(engineName: string): EngineStatus | undefined {
    return this.statusMap.get(engineName);
  }

  /**
   * Get status records for all tracked engines.
   */
  getAllStatuses(): EngineStatus[] {
    return Array.from(this.statusMap.values());
  }

  /**
   * Get status records filtered to a specific category.
   */
  getStatusesByCategory(category: string): EngineStatus[] {
    return Array.from(this.statusMap.values()).filter((status) =>
      status.categories.includes(category),
    );
  }

  /**
   * Get the most recent log entries (default: last 100).
   */
  getRecentLogs(limit: number = 100): EngineLog[] {
    return this.logs.slice(-limit);
  }

  /**
   * Get log entries for a specific engine (default: last 50).
   */
  getEngineLogs(engineName: string, limit: number = 50): EngineLog[] {
    return this.logs.filter((log) => log.engineName === engineName).slice(-limit);
  }

  /**
   * Return the failure rate (0–1) for an engine. Returns 0 for unknown engines.
   */
  getFailureRate(engineName: string): number {
    const status = this.statusMap.get(engineName);
    if (!status || status.totalRequests === 0) return 0;
    return status.failureCount / status.totalRequests;
  }

  /**
   * Return true if the engine is active (not failed or disabled).
   * Unknown engines are assumed healthy.
   */
  isEngineHealthy(engineName: string): boolean {
    const status = this.statusMap.get(engineName);
    if (!status) return true;
    return status.status === "active";
  }

  /**
   * Manually disable an engine so it is skipped during searches.
   */
  disableEngine(engineName: string): void {
    const status = this.statusMap.get(engineName);
    if (status) status.status = "disabled";
  }

  /**
   * Manually re-enable an engine and reset its failure count.
   */
  enableEngine(engineName: string): void {
    const status = this.statusMap.get(engineName);
    if (status) {
      status.status = "active";
      status.failureCount = 0;
    }
  }

  /**
   * Reset all counters and status for an engine back to a clean active state.
   */
  resetEngine(engineName: string): void {
    const status = this.statusMap.get(engineName);
    if (status) {
      status.failureCount = 0;
      status.successCount = 0;
      status.totalRequests = 0;
      status.averageResponseTime = 0;
      status.status = "active";
      status.lastError = undefined;
    }
  }

  /**
   * Clear all stored log entries.
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get a high-level summary of engine health across all tracked engines.
   */
  getStatsSummary(): {
    total: number;
    active: number;
    failed: number;
    disabled: number;
    averageFailureRate: number;
  } {
    const statuses = this.getAllStatuses();
    const total = statuses.length;
    const active = statuses.filter((s) => s.status === "active").length;
    const failed = statuses.filter((s) => s.status === "failed").length;
    const disabled = statuses.filter((s) => s.status === "disabled").length;

    const failureRates = statuses
      .filter((s) => s.totalRequests > 0)
      .map((s) => s.failureCount / s.totalRequests);

    const averageFailureRate =
      failureRates.length > 0
        ? failureRates.reduce((a, b) => a + b, 0) / failureRates.length
        : 0;

    return { total, active, failed, disabled, averageFailureRate };
  }

  private addLog(log: EngineLog): void {
    this.logs.push(log);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }
}

/** Global singleton instance used throughout the application. */
export const engineStatusTracker = new EngineStatusTracker();
