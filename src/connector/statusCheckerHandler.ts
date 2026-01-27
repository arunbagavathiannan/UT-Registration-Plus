import { STATUS_CHECKER_LOGIN_URL, STATUS_CHECKER_MESSAGES } from '../backend/keys';
import { refreshStatusForActiveSchedule } from '../backend/statusCheckerService';
import { getStatusCheckerState } from '../backend/statusCheckerStore';
import type { StatusCheckerMessages } from '../shared/messages/StatusCheckerMessages';
import { validateLoginStatus } from '../shared/util/checkLoginStatus';
import type { MessageHandler } from 'chrome-extension-toolkit';

const statusCheckerHandler: MessageHandler<StatusCheckerMessages> = {
    // Handle refresh requests from the UI.
    async [STATUS_CHECKER_MESSAGES.REFRESH]({ sendResponse }) {
        const state = await getStatusCheckerState();
        const loggedIn = await validateLoginStatus(STATUS_CHECKER_LOGIN_URL);

        if (!loggedIn) {
            sendResponse({
                success: false,
                error: 'Login required',
                loginRequired: true,
                lastCheckedAt: state.lastCheckedAt,
                scrapeInfo: state.scrapeInfo,
                skippedCount: 0,
                totalCount: 0,
            });
            return;
        }

        const result = await refreshStatusForActiveSchedule();
        sendResponse(result);
    },
    // Return the last successful check timestamp.
    async [STATUS_CHECKER_MESSAGES.GET_LAST_CHECKED_AT]({ sendResponse }) {
        const state = await getStatusCheckerState();
        sendResponse({ lastCheckedAt: state.lastCheckedAt });
    },
    // Return the latest scraped status information.
    async [STATUS_CHECKER_MESSAGES.GET_SCRAPE_INFO]({ sendResponse }) {
        const state = await getStatusCheckerState();
        sendResponse({ scrapeInfo: state.scrapeInfo });
    },
};

export default statusCheckerHandler;
