import { STATUS_CHECKER_SCHEMA_VERSION, STATUS_CHECKER_STORE_KEYS } from './keys';
import type { StatusType } from '@shared/types/Course';
import { createLocalStore, debugStore } from 'chrome-extension-toolkit';

export type StatusCheckerScrapeEntry = {
    uniqueId: number;
    status: StatusType;
    isReserved: boolean;
    scrapedAt: number;
    sourceUrl: string;
};

export type StatusCheckerState = {
    schemaVersion: number;
    lastCheckedAt: number;
    updatedAt: number;
    scrapeInfo: Record<string, StatusCheckerScrapeEntry>;
};

export const StatusCheckerStore = createLocalStore<StatusCheckerState>({
    schemaVersion: STATUS_CHECKER_SCHEMA_VERSION,
    lastCheckedAt: 0,
    updatedAt: 0,
    scrapeInfo: {},
});

debugStore({ StatusCheckerStore });

// Build a full snapshot from storage.
export async function getStatusCheckerState(): Promise<StatusCheckerState> {
    return {
        schemaVersion: await StatusCheckerStore.get(STATUS_CHECKER_STORE_KEYS.SCHEMA_VERSION),
        lastCheckedAt: await StatusCheckerStore.get(STATUS_CHECKER_STORE_KEYS.LAST_CHECKED_AT),
        updatedAt: await StatusCheckerStore.get(STATUS_CHECKER_STORE_KEYS.UPDATED_AT),
        scrapeInfo: await StatusCheckerStore.get(STATUS_CHECKER_STORE_KEYS.SCRAPE_INFO),
    };
}

// Merge updates without overwriting with blank values.
export async function updateStatusCheckerState(
    update: Partial<StatusCheckerState>
): Promise<StatusCheckerState> {
    const current = await getStatusCheckerState();
    const next: StatusCheckerState = { ...current };
    let hasUpdates = false;

    if (typeof update.lastCheckedAt === 'number' && update.lastCheckedAt > 0) {
        next.lastCheckedAt = update.lastCheckedAt;
        hasUpdates = true;
    }

    if (update.scrapeInfo && Object.keys(update.scrapeInfo).length > 0) {
        next.scrapeInfo = update.scrapeInfo;
        hasUpdates = true;
    }

    if (hasUpdates) {
        next.updatedAt = Date.now();
        await StatusCheckerStore.set(STATUS_CHECKER_STORE_KEYS.LAST_CHECKED_AT, next.lastCheckedAt);
        await StatusCheckerStore.set(STATUS_CHECKER_STORE_KEYS.SCRAPE_INFO, next.scrapeInfo);
        await StatusCheckerStore.set(STATUS_CHECKER_STORE_KEYS.UPDATED_AT, next.updatedAt);
    }

    return next;
}
