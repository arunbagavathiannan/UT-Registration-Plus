import type { StatusType } from '@shared/types/Course';

import { STATUS_CHECKER_MESSAGES } from '../../backend/keys';

export type StatusCheckerScrapeInfo = Record<
    string,
    {
        uniqueId: number;
        status: StatusType;
        isReserved: boolean;
        scrapedAt: number;
        sourceUrl: string;
    }
>;

export type StatusCheckerRefreshResponse = {
    success: boolean;
    error?: string;
    lastCheckedAt: number;
    scrapeInfo: StatusCheckerScrapeInfo;
    skippedCount: number;
    totalCount: number;
    loginRequired?: boolean;
};

export type StatusCheckerMessages = {
    [STATUS_CHECKER_MESSAGES.REFRESH]: (data: Record<string, never>) => StatusCheckerRefreshResponse;
    [STATUS_CHECKER_MESSAGES.GET_LAST_CHECKED_AT]: (data: Record<string, never>) => {
        lastCheckedAt: number;
    };
    [STATUS_CHECKER_MESSAGES.GET_SCRAPE_INFO]: (data: Record<string, never>) => {
        scrapeInfo: StatusCheckerScrapeInfo;
    };
};
