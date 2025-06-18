// Role-based access control middleware

// Require user to have one of the specified roles
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            console.warn('Access denied: No user in request');
            return res.status(401).json({ message: 'Authentication required' });
        }
        if (!roles.includes(req.user.role)) {
            console.warn(`Access denied: User role "${req.user.role}" not in allowed roles [${roles}]`);
            return res.status(403).json({ message: 'Insufficient permissions' });
        }
        // Log granted access
        console.log(`Access granted: User ${req.user.id || req.user.userId} with role ${req.user.role}`);
        next();
    };
}

// Require user to be the resource owner or have a specific role
function requireSelfOrRole(paramKey = 'id', ...roles) {
    return (req, res, next) => {
        const userId = req.user?.userId || req.user?.id;
        const paramId = req.params[paramKey];
        if (roles.includes(req.user?.role) || String(userId) === String(paramId)) {
            console.log(`Access granted: User ${userId} as self or with role`);
            return next();
        }
        console.warn(`Access denied: User ${userId} is not owner nor has roles [${roles}]`);
        return res.status(403).json({ message: 'Access denied' });
    };
}

// Require authentication
function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    next();
}

// Require user to have all specified roles (strict AND)
function requireAllRoles(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        if (!roles.every(role => req.user.role === role)) {
            return res.status(403).json({ message: 'Insufficient permissions (all roles required)' });
        }
        next();
    };
}

// Utility: check if user has any of the roles
function hasRole(user, ...roles) {
    return user && roles.includes(user.role);
}

// Utility: check if user has all roles (strict AND)
function hasAllRoles(user, ...roles) {
    return user && roles.every(role => user.role === role);
}

export {
    requireRole,
    requireSelfOrRole,
    requireAuth,
    hasRole,
    requireAllRoles,
    hasAllRoles
};
