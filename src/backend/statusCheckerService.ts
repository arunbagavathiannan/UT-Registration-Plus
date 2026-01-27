import { UserScheduleStore } from '@shared/storage/UserScheduleStore';
import type { Course } from '@shared/types/Course';
import { CourseCatalogScraper } from '@views/lib/CourseCatalogScraper';
import getCourseTableRows from '@views/lib/getCourseTableRows';
import { SiteSupport } from '@views/lib/getSiteSupport';

import { STATUS_CHECKER_COOLDOWN_MS } from './keys';
import type { StatusCheckerScrapeEntry } from './statusCheckerStore';
import { getStatusCheckerState, updateStatusCheckerState } from './statusCheckerStore';

export type StatusCheckerRefreshResult = {
    success: boolean;
    error?: string;
    lastCheckedAt: number;
    scrapeInfo: Record<string, StatusCheckerScrapeEntry>;
    skippedCount: number;
    totalCount: number;
};

// Load courses from the active schedule.
async function getActiveCourses(): Promise<Course[]> {
    const schedules = await UserScheduleStore.get('schedules');
    const activeIndex = await UserScheduleStore.get('activeIndex');
    const activeSchedule = schedules[activeIndex];

    return activeSchedule?.courses ?? [];
}

// Refresh course statuses for the active schedule.
export async function refreshStatusForActiveSchedule(): Promise<StatusCheckerRefreshResult> {
    const state = await getStatusCheckerState();
    const now = Date.now();

    if (now - state.lastCheckedAt < STATUS_CHECKER_COOLDOWN_MS) {
        return {
            success: false,
            error: 'Refresh cooldown active',
            lastCheckedAt: state.lastCheckedAt,
            scrapeInfo: state.scrapeInfo,
            skippedCount: 0,
            totalCount: 0,
        };
    }

    const courses = await getActiveCourses();
    if (courses.length === 0) {
        return {
            success: false,
            error: 'No courses to refresh',
            lastCheckedAt: state.lastCheckedAt,
            scrapeInfo: state.scrapeInfo,
            skippedCount: 0,
            totalCount: 0,
        };
    }

    const nextScrapeInfo: Record<string, StatusCheckerScrapeEntry> = {};
    let skippedCount = 0;

    for (const course of courses) {
        // TODO: Assume course.url points to details page.
        const courseUrl = course.url?.trim();
        if (!courseUrl) {
            skippedCount += 1;
            continue;
        }

        try {
            const response = await fetch(courseUrl, { credentials: 'include' });
            if (!response.ok) {
                skippedCount += 1;
                continue;
            }

            const htmlText = await response.text();
            // TODO: Assume DOMParser works in background.
            const doc = new DOMParser().parseFromString(htmlText, 'text/html');
            const scraper = new CourseCatalogScraper(SiteSupport.COURSE_CATALOG_DETAILS, doc, courseUrl);
            const tableRows = getCourseTableRows(doc);
            const scrapedCourses = scraper.scrape(tableRows, false);
            const scrapedCourse = scrapedCourses[0]?.course;

            if (!scrapedCourse) {
                skippedCount += 1;
                continue;
            }

            if (scrapedCourse.uniqueId !== course.uniqueId) {
                skippedCount += 1;
                continue;
            }

            nextScrapeInfo[String(course.uniqueId)] = {
                uniqueId: course.uniqueId,
                status: scrapedCourse.status,
                isReserved: scrapedCourse.isReserved,
                scrapedAt: Date.now(),
                sourceUrl: courseUrl,
            };
        } catch (error) {
            console.error('Status scrape failed:', error);
            skippedCount += 1;
        }
    }

    if (Object.keys(nextScrapeInfo).length === 0) {
        return {
            success: false,
            error: 'No statuses updated',
            lastCheckedAt: state.lastCheckedAt,
            scrapeInfo: state.scrapeInfo,
            skippedCount,
            totalCount: courses.length,
        };
    }

    const mergedScrapeInfo = { ...state.scrapeInfo, ...nextScrapeInfo };

    // Detect status changes without using scrapedAt.
    const mergedKeys = Object.keys(mergedScrapeInfo);
    const existingKeys = Object.keys(state.scrapeInfo);
    let hasStatusChanges = existingKeys.length !== mergedKeys.length;

    if (!hasStatusChanges) {
        for (const key of mergedKeys) {
            const existing = state.scrapeInfo[key];
            const next = mergedScrapeInfo[key];

            if (!next || !existing || existing.status !== next.status || existing.isReserved !== next.isReserved) {
                hasStatusChanges = true;
                break;
            }
        }
    }

    if (!hasStatusChanges) {
        const updatedState = await updateStatusCheckerState({ lastCheckedAt: now });
        return {
            success: true,
            lastCheckedAt: updatedState.lastCheckedAt,
            scrapeInfo: updatedState.scrapeInfo,
            skippedCount,
            totalCount: courses.length,
        };
    }

    const updatedState = await updateStatusCheckerState({
        lastCheckedAt: now,
        scrapeInfo: mergedScrapeInfo,
    });

    return {
        success: true,
        lastCheckedAt: updatedState.lastCheckedAt,
        scrapeInfo: updatedState.scrapeInfo,
        skippedCount,
        totalCount: courses.length,
    };
}
