/// Multi-tenant middleware for extracting tenant info from request

import { Prisma } from '@prisma/client';

// Extract tenant from request and attach to req.tenant
function extractTenant(req, res, next, options = {}) {
    // Try header first
    let tenant = req.headers['x-tenant-id'];
    if (!tenant && req.query.tenant) {
        tenant = req.query.tenant;
    }
    if (!tenant && req.cookies && req.cookies.tenant) {
        tenant = req.cookies.tenant;
    }
    // Optionally, extract from subdomain (e.g., tenant1.example.com)
    if (!tenant && req.hostname) {
        const parts = req.hostname.split('.');
        if (parts.length > 2) {
            tenant = parts[0];
        }
    }
    if (!tenant && options.allowBody && req.body && req.body.tenant) {
        tenant = req.body.tenant;
    }
    if (!tenant) {
        console.warn('Tenant not specified in request');
        return res.status(400).json({ message: 'Tenant not specified' });
    }
    req.tenant = tenant;
    next();
}

function requireTenant(allowedTenant) {
    return (req, res, next) => {
        if (req.tenant !== allowedTenant) {
            console.warn(`Forbidden: tenant "${req.tenant}" does not match allowed "${allowedTenant}"`);
            return res.status(403).json({ message: 'Forbidden for this tenant' });
        }
        next();
    };
}

function requireAnyTenant(req, res, next) {
    if (!req.tenant) {
        return res.status(400).json({ message: 'Tenant required' });
    }
    next();
}

function userBelongsToTenant(user, tenant) {
    return user && user.tenant && user.tenant === tenant;
}

// --- Prisma tenantId injection middleware ---

/**
 * Prisma middleware to automatically inject tenantId into queries.
 * @param {function(): string | undefined} getTenantId - Function to get tenantId from context.
 */
function tenantPrismaMiddleware(getTenantId) {
    return async (params, next) => {
        const tenantId = getTenantId();
        // Only inject tenantId for models that have it and for relevant actions
        const actionsWithWhere = ['findMany', 'findFirst', 'updateMany', 'deleteMany', 'count', 'aggregate'];
        if (
            tenantId &&
            params.model &&
            actionsWithWhere.includes(params.action) &&
            params.args?.where
        ) {
            params.args.where = {
                ...params.args.where,
                tenantId,
            };
        }
        // For create actions, ensure tenantId is set in data
        const actionsWithData = ['create', 'createMany', 'update', 'upsert'];
        if (
            tenantId &&
            params.model &&
            actionsWithData.includes(params.action) &&
            params.args?.data &&
            !params.args.data.tenantId
        ) {
            params.args.data.tenantId = tenantId;
        }
        return next(params);
    };
}

// Utility: get tenant from request (for use in Prisma context, etc.)
function getTenantFromRequest(req) {
    return req.tenant || req.businessId || req.headers['x-tenant-id'] || req.query.tenant || null;
}

// Utility: inject tenantId into arbitrary object (e.g., for manual Prisma calls)
function injectTenantId(obj, tenantId) {
    if (!tenantId) return obj;
    return { ...obj, tenantId };
}

export {
    extractTenant,
    requireTenant,
    requireAnyTenant,
    userBelongsToTenant,
    tenantPrismaMiddleware,
    getTenantFromRequest,
    injectTenantId
};
