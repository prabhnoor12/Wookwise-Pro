// Centralized error handling middleware

function errorHandler(err, req, res, next) {
    // Log error details for debugging
    const requestId = req.id || req.headers['x-request-id'];
    const logDetails = {
        path: req.path,
        method: req.method,
        stack: err.stack,
        requestId,
    };
    if (process.env.NODE_ENV === 'development') {
        logDetails.body = req.body;
        logDetails.query = req.query;
    }
    console.error(`[ERROR] ${err.message}`, logDetails);

    // Set status code (default 500)
    const status = err.status || err.statusCode || 500;

    // Send error response
    res.status(status).json({
        error: err.message || 'Internal Server Error',
        requestId,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
}

// 404 Not Found middleware
function notFoundHandler(req, res, next) {
    res.status(404).json({ error: 'Not Found' });
}

// Middleware to catch async errors (wrapper for route handlers)
function asyncHandler(fn) {
    return function (req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

// Middleware to handle validation errors (e.g., from express-validator)
function validationErrorHandler(err, req, res, next) {
    if (err && err.errors && Array.isArray(err.errors)) {
        return res.status(400).json({
            error: 'Validation Error',
            details: err.errors.map(e => e.msg || e.message || e),
        });
    }
    next(err);
}

// Helper to wrap async middlewares
function asyncMiddleware(fn) {
    return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Utility to format errors
function formatError(err) {
    return {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    };
}

// Utility to send a custom error response (for use in controllers/services)
function sendError(res, { status = 500, error = 'Internal Server Error', details, requestId }) {
    res.status(status).json({
        error,
        details,
        requestId,
    });
}

export {
    errorHandler,
    notFoundHandler,
    asyncHandler,
    validationErrorHandler,
    asyncMiddleware,
    formatError,
    sendError,
};
