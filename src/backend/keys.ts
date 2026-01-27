export const STATUS_CHECKER_SCHEMA_VERSION = 1;

export const STATUS_CHECKER_COOLDOWN_MS = 3000;

export const STATUS_CHECKER_LOGIN_URL = 'https://utdirect.utexas.edu/apps/registrar/course_schedule/';

export const STATUS_CHECKER_STORE_KEYS = {
    SCHEMA_VERSION: 'schemaVersion',
    LAST_CHECKED_AT: 'lastCheckedAt',
    UPDATED_AT: 'updatedAt',
    SCRAPE_INFO: 'scrapeInfo',
} as const;

export const STATUS_CHECKER_MESSAGES = {
    REFRESH: 'refreshCourseStatuses',
    GET_LAST_CHECKED_AT: 'getLastCheckedAt',
    GET_SCRAPE_INFO: 'getScrapeInfo',
} as const;
