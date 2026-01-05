const userCalls = new Map();

// config
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_CALLS = 2;

function canCallAI(userId) {
    const now = Date.now();

    const calls = userCalls.get(userId) || [];

    // remove expired calls
    const recentCalls = calls.filter(ts => now - ts < WINDOW_MS);

    if (recentCalls.length >= MAX_CALLS) {
        return false;
    }

    recentCalls.push(now);
    userCalls.set(userId, recentCalls);
    return true;
}

module.exports = { canCallAI };
