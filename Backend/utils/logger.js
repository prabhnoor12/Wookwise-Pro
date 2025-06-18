// Simple logger utility

export function logInfo(message, meta = {}) {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta);
}

export function logWarn(message, meta = {}) {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta);
}

export function logError(message, meta = {}) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta);
}

// Express middleware for request logging
export function requestLogger(req, res, next) {
    console.log(`[REQUEST] ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
    next();
}

// Optionally: log to file or external service (stub)
export function logToFile(message, level = 'info') {
    // Implement file or external logging here if needed
    // Example: fs.appendFileSync('app.log', `[${level.toUpperCase()}] ${new Date().toISOString()} - ${message}\n`);
}
