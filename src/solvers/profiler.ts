// Profiling-based cost model for better strategy selection

import * as fs from 'fs';

export interface ProfileRecord {
  intentType: string;
  strategyName: string;
  inputSize: number;
  executionTimeMs: number;
  sampleCount: number;
}

export class PerformanceProfiler {
  private profileFile: string;
  private profiles: Map<string, ProfileRecord> = new Map();

  constructor(profileFile = '.ioc_profile.json') {
    this.profileFile = profileFile;
    this.loadProfiles();
  }

  /**
   * Load existing profile data from disk
   */
  private loadProfiles(): void {
    if (!fs.existsSync(this.profileFile)) {
      return;
    }

    try {
      const data = fs.readFileSync(this.profileFile, 'utf-8');
      const records: ProfileRecord[] = JSON.parse(data);

      for (const record of records) {
        const key = this.makeKey(record.intentType, record.strategyName, record.inputSize);
        this.profiles.set(key, record);
      }
    } catch (error) {
      // If file is corrupted, start fresh
      console.warn('Failed to load profiles:', error);
    }
  }

  /**
   * Save profile data to disk
   */
  saveProfiles(): void {
    try {
      const records = Array.from(this.profiles.values());
      fs.writeFileSync(this.profileFile, JSON.stringify(records, null, 2), 'utf-8');
    } catch (error) {
      // Fail silently if can't save
      console.warn('Failed to save profiles:', error);
    }
  }

  /**
   * Record a single execution measurement
   */
  recordExecution(
    intentType: string,
    strategyName: string,
    inputSize: number,
    executionTimeMs: number
  ): void {
    const sizeBucket = this.bucketSize(inputSize);
    const key = this.makeKey(intentType, strategyName, sizeBucket);

    const existing = this.profiles.get(key);
    if (existing) {
      // Update with exponential moving average
      const alpha = 0.3;
      existing.executionTimeMs = alpha * executionTimeMs + (1 - alpha) * existing.executionTimeMs;
      existing.sampleCount++;
    } else {
      this.profiles.set(key, {
        intentType,
        strategyName,
        inputSize: sizeBucket,
        executionTimeMs,
        sampleCount: 1,
      });
    }
  }

  /**
   * Get cost estimate based on historical data
   */
  getCostEstimate(intentType: string, strategyName: string, inputSize: number): number {
    const sizeBucket = this.bucketSize(inputSize);
    const key = this.makeKey(intentType, strategyName, sizeBucket);

    const profile = this.profiles.get(key);
    if (profile) {
      return profile.executionTimeMs;
    }

    // Fallback: look for similar sizes
    const similar = this.findSimilarProfile(intentType, strategyName, sizeBucket);
    if (similar) {
      // Scale based on size difference
      const scale = inputSize / similar.inputSize;
      return similar.executionTimeMs * scale;
    }

    // No data available, return default estimate
    return this.defaultCostEstimate(intentType, inputSize);
  }

  /**
   * Bucket size for better generalization
   */
  bucketSize(size: number): number {
    if (size < 10) return size;
    if (size < 100) return Math.floor(size / 10) * 10;
    if (size < 1000) return Math.floor(size / 100) * 100;
    return Math.floor(size / 1000) * 1000;
  }

  /**
   * Find profile with similar size
   */
  private findSimilarProfile(
    intentType: string,
    strategyName: string,
    size: number
  ): ProfileRecord | null {
    const candidates = Array.from(this.profiles.values()).filter(
      (record) => record.intentType === intentType && record.strategyName === strategyName
    );

    if (candidates.length === 0) return null;

    // Return closest size
    return candidates.reduce((closest, record) => {
      const closestDiff = Math.abs(closest.inputSize - size);
      const recordDiff = Math.abs(record.inputSize - size);
      return recordDiff < closestDiff ? record : closest;
    });
  }

  /**
   * Fallback cost estimate when no profiling data available
   */
  private defaultCostEstimate(intentType: string, inputSize: number): number {
    const baseCost: Record<string, number> = {
      filter: 1.0,
      map: 1.0,
      reduce: 1.5,
      sort: 2.0,
      group_by: 2.0,
      join: 3.0,
      flatten: 0.5,
      distinct: 1.5,
    };

    return (baseCost[intentType] || 1.0) * inputSize;
  }

  /**
   * Generate a performance report
   */
  getReport(): string {
    if (this.profiles.size === 0) {
      return 'No profiling data available';
    }

    const lines: string[] = ['Performance Profile:', '='.repeat(60)];

    // Group by intent type
    const byIntent = new Map<string, ProfileRecord[]>();
    for (const record of this.profiles.values()) {
      if (!byIntent.has(record.intentType)) {
        byIntent.set(record.intentType, []);
      }
      byIntent.get(record.intentType)!.push(record);
    }

    for (const [intentType, records] of Array.from(byIntent.entries()).sort()) {
      lines.push(`\n${intentType}:`);

      const sorted = records.sort((a, b) => {
        if (a.inputSize !== b.inputSize) {
          return a.inputSize - b.inputSize;
        }
        return a.strategyName.localeCompare(b.strategyName);
      });

      for (const record of sorted) {
        lines.push(
          `  ${record.strategyName.padEnd(20)} ` +
            `size=${String(record.inputSize).padStart(6)} ` +
            `time=${record.executionTimeMs.toFixed(3).padStart(8)}ms ` +
            `samples=${record.sampleCount}`
        );
      }
    }

    return lines.join('\n');
  }

  /**
   * Make a cache key for profile lookups
   */
  private makeKey(intentType: string, strategyName: string, inputSize: number): string {
    return `${intentType}:${strategyName}:${inputSize}`;
  }
}

// Global profiler instance
let globalProfiler: PerformanceProfiler | null = null;

/**
 * Get the global profiler instance
 */
export function getProfiler(): PerformanceProfiler {
  if (!globalProfiler) {
    globalProfiler = new PerformanceProfiler();
  }
  return globalProfiler;
}
