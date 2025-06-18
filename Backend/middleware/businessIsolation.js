// Middleware to attach businessId to the request for multi-tenant isolation

function extractBusinessId(req, options = {}) {
  // Example: businessId from authenticated user (e.g., req.user.businessId)
  // Adjust as needed for your authentication logic
  if (req.user && req.user.businessId) {
    return String(req.user.businessId);
  }
  // Or from headers for testing
  if (req.headers['x-business-id']) {
    return String(req.headers['x-business-id']);
  }
  // From cookies as an additional source
  if (req.cookies && req.cookies.businessId) {
    return String(req.cookies.businessId);
  }
  // Allow businessId from query params for flexibility
  if (req.query.businessId) {
    return String(req.query.businessId);
  }
  // Allow businessId from request body if specified in options
  if (options.allowBody && req.body && req.body.businessId) {
    return String(req.body.businessId);
  }
  // Support extracting from session (if using express-session)
  if (req.session && req.session.businessId) {
    return String(req.session.businessId);
  }
  return null;
}

function businessIsolation(req, res, next) {
  const businessId = extractBusinessId(req);
  if (businessId) {
    req.businessId = businessId;
    // Optional: log for debugging
    // console.log(`[BusinessIsolation] businessId set to: ${businessId}`);
    return next();
  }
  const msg = '[BusinessIsolation] Business ID not provided in user, headers, cookies, query, or body';
  console.warn(msg);
  res.status(400).json({ message: msg });
}

export { businessIsolation as default, extractBusinessId };
