// Utility to extract tenant or businessId from request (supports multi-tenancy)
export function getTenantId(req) {
    return (
        req.tenant ||
        req.businessId ||
        req.headers['x-tenant-id'] ||
        req.headers['x-business-id'] ||
        (req.user && (req.user.tenantId || req.user.businessId)) ||
        req.query.tenantId ||
        req.query.businessId ||
        null
    );
}

// Utility to check if a user belongs to a tenant
export function userBelongsToTenant(user, tenantId) {
    if (!user || !tenantId) return false;
    return (
        user.tenantId === tenantId ||
        user.businessId === tenantId ||
        (Array.isArray(user.tenants) && user.tenants.includes(tenantId))
    );
}

// Utility to filter a query by tenant
export function withTenantFilter(where = {}, tenantId) {
    if (!tenantId) return where;
    return { ...where, businessId: tenantId };
}

// Utility to enforce tenant access (throws if not allowed)
export function assertTenantAccess(user, tenantId) {
    if (!userBelongsToTenant(user, tenantId)) {
        const err = new Error('Access denied: user does not belong to this tenant');
        err.status = 403;
        throw err;
    }
}

// Utility to extract tenant from arbitrary object (e.g., booking, invoice)
export function extractTenantFromEntity(entity) {
    return entity?.tenantId || entity?.businessId || null;
}

// Utility to add tenant filter to Prisma "where" or "findMany" options (deep merge for nested queries)
export function addTenantToPrismaQuery(query = {}, tenantId) {
    if (!tenantId) return query;
    if (query.where) {
        query.where = { ...query.where, businessId: tenantId };
        return query;
    }
    return { ...query, businessId: tenantId };
}

// Utility to redact sensitive fields if not in tenant
export function redactIfNotTenant(entity, tenantId, fields = ['email', 'phone']) {
    if (!entity) return entity;
    if (extractTenantFromEntity(entity) !== tenantId) {
        const redacted = { ...entity };
        for (const f of fields) {
            if (redacted[f]) redacted[f] = '[REDACTED]';
        }
        return redacted;
    }
    return entity;
}
