# Authentication Middleware Security Plan

> **Priority**: Critical (Rank 1)  
> **Component**: API  
> **Issue ID**: MARIVO-SEC-002  
> **Generated**: 2026-10-02  
> **Status**: Not Started

---

## Executive Summary

The marivo API has **critical authentication vulnerabilities** that allow unauthorized access to protected endpoints. This plan outlines the remediation of authentication middleware issues that could enable attackers to perform unauthorized actions, including modifying user data, accessing protected resources, and potentially executing background jobs.

**Risk Level**: **CRITICAL** - Immediate action required to prevent unauthorized access to protected endpoints.

---

## Current State Assessment

### 🔴 Confirmed Security Issues

| Issue | Location | Severity | Description |
|-------|----------|----------|-------------|
| **1** | `trpc-server.ts:31-46` | **CRITICAL** | Worker routes (`/worker`) have NO authentication middleware |
| **2** | All tRPC route files | **HIGH** | All procedures use `publicProcedure` - no protected procedures |
| **3** | `set-script-import-result.use-case.ts` | **CRITICAL** | Extends `AuthenticatedUseCase` but called via unauthenticated worker route |
| **4** | `trpc-server.ts` | **HIGH** | Inconsistent auth: main routes protected, worker routes unprotected |
| **5** | All endpoints | **MEDIUM** | No rate limiting on any API endpoints |

### 📁 Affected Files

```
marivo/apps/api/src/
├── trpc-server.ts              # Worker routes missing auth middleware
├── trpc.ts                      # Only defines publicProcedure
├── shared/use-case.ts           # AuthenticatedUseCase expects user context
├── shared/trpc-delivery.ts      # handleUseCase passes request to use cases
├── domains/plays/
│   ├── set-script-import-result.use-case.ts  # Uses AuthenticatedUseCase
│   ├── plays.trpc-routes.ts                 # All procedures are public
│   ├── plays-worker.trpc-routes.ts          # Worker procedures are public
│   └── ... (many use cases extend AuthenticatedUseCase)
└── domains/auth/user.middleware.ts         # User context middleware
```

### 💥 Attack Scenarios

#### Scenario 1: Unauthorized Worker Job Execution
```bash
# Attacker can call worker endpoints directly
POST /worker/plays/setScriptImportResult
{
  "importId": "malicious-id",
  "result": {"success": true, "metadata": {...}}
}
# Result: Modifies database without authentication
```

#### Scenario 2: Bypassing Authentication on Protected Use Cases
```bash
# Many use cases extend AuthenticatedUseCase
# But are exposed via publicProcedure
POST /trpc/plays.create
{
  "title": "Malicious Play"
}
# Result: May create resources without proper auth
```

#### Scenario 3: Brute Force Attacks
```bash
# No rate limiting on authentication endpoints
POST /trpc/auth.signin (if exists)
# Can be called repeatedly without restriction
```

### 🎯 Architecture Overview

```
Request Flow:
┌─────────────────────────────────────────────────────────┐
│                      Express Server                         │
├─────────────────────────────────────────────────────────┤
│                                                             │
│  /worker/* ──────► deliveryMiddleware ──────► cors ───────►│
│                    (NO AUTH MIDDLEWARE!)                   │
│                    ║                                      │
│                    ╚──────► workerRouter (tRPC)           │
│                                                             │
│  /* (main) ───────► deliveryMiddleware ──────► cors ──────►│
│                    ║                                      │
│                    ╠──────► clerkMiddleware()              │
│                    ╠──────► userMiddleware()               │
│                    ║                                      │
│                    ╚──────► appRouter (tRPC)              │
└─────────────────────────────────────────────────────────┘

Use Case Execution:
┌─────────────────────────────────────────────────────────┐
│  AuthenticatedUseCase.execute()                              │
│    └── Calls: this.getUserContext()                         │
│        └── Returns: req.context.userId                      │
│            (Set by userMiddleware)                           │
│                                                             │
│  Problem: Worker routes DON'T call userMiddleware         │
│           req.context.userId is UNDEFINED                 │
│           AuthenticatedUseCase throws: "Authentication error"│
│           BUT: Only throws when use case executes!          │
└─────────────────────────────────────────────────────────┘
```

---

## Root Cause Analysis

### Why This Happened

1. **Incomplete Authentication Strategy**
   - Only main routes have authentication middleware
   - Worker routes were treated as "internal" and assumed secure
   - No authentication at tRPC procedure level

2. **Architecture Mismatch**
   - Use cases designed with `AuthenticatedUseCase` pattern
   - But exposed via `publicProcedure` without auth enforcement
   - Worker calls API directly without authentication

3. **Missing tRPC Features**
   - No `protectedProcedure` or `privateProcedure` defined
   - No middleware at procedure level
   - Authentication only at Express level

4. **False Sense of Security**
   - Developers assumed worker routes were internal-only
   - Use cases extend `AuthenticatedUseCase` but no runtime enforcement

---

## Remediation Plan

### Phase 1: Immediate Protection (Day 1 - Emergency)

#### Objective: Block unauthorized access to all endpoints

| Step | Action | Responsible | Time | Priority |
|------|--------|-------------|------|----------|
| 1.1 | **Add authentication to worker routes** | Backend Dev | 1 hour | CRITICAL |
| 1.2 | **Create protected procedure type** | Backend Dev | 2 hours | CRITICAL |
| 1.3 | **Audit all use cases for auth requirements** | Backend Dev | 2 hours | CRITICAL |
| 1.4 | **Add rate limiting to all endpoints** | Backend Dev | 1 hour | HIGH |
| 1.5 | **Test authentication enforcement** | QA | 1 hour | HIGH |

#### Step 1.1: Add Authentication to Worker Routes

**Current Problem (`trpc-server.ts:31-46`):**
```typescript
app.use(
  '/worker',
  deliveryMiddleware(),
  cors({ credentials: true }),
  trpcExpress.createExpressMiddleware({
    router: workerRouter,
    createContext,
    onError: (opts) => { ... },
  }),
);
```

**Solution - Add Clerk Authentication:**
```typescript
app.use(
  '/worker',
  deliveryMiddleware(),
  cors({ credentials: true }),
  clerkMiddleware(),  // ADD: Clerk authentication
  userMiddleware(),   // ADD: User context
  trpcExpress.createExpressMiddleware({
    router: workerRouter,
    createContext,
    onError: (opts) => { ... },
  }),
);
```

**Important Consideration**: The Python worker calls these endpoints. You have two options:

**Option A: Use API Keys for Worker**
- Create a dedicated service account for the worker
- Pass API key in headers
- Validate API key in custom middleware before clerkMiddleware

**Option B: Use Clerk Machine-to-Machine Auth**
- Configure Clerk to allow machine users
- Worker authenticates with Clerk using service account credentials

**Recommendation**: **Option A** (API Keys) for simplicity and separation of concerns.

**Implementation:**
```typescript
// Create worker authentication middleware
import { getAuth } from '@clerk/express';

export function workerAuthMiddleware(): RequestHandler {
  return function (req: Request, res: Response, next: NextFunction) {
    // Check for worker API key
    const apiKey = req.headers['x-worker-api-key'];
    if (apiKey && apiKey === process.env.WORKER_API_KEY) {
      // Set a dummy user context for worker
      const context = req.context ?? {};
      context.userId = -1; // System user
      context.isWorker = true;
      req.context = context;
      return next();
    }
    // Fall through to Clerk auth for non-worker requests
    next();
  };
}

// Update worker route in trpc-server.ts
app.use(
  '/worker',
  deliveryMiddleware(),
  cors({ credentials: true }),
  workerAuthMiddleware(),  // Worker API key check
  clerkMiddleware(),       // Clerk auth for other requests
  userMiddleware(),        // User context
  trpcExpress.createExpressMiddleware({ ... }),
);
```

#### Step 1.2: Create Protected Procedure Type

**Current (`trpc.ts`):**
```typescript
// Only publicProcedure exists
export const publicProcedure = t.procedure;
```

**Solution - Add Authentication Procedures:**
```typescript
import { getAuth } from '@clerk/express';

// Protected procedure - requires authentication
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const { req } = ctx;
  const auth = getAuth(req);
  
  if (!auth?.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }
  
  // Ensure user context is set
  const userContext = (req as any).context;
  if (!userContext?.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User context not established',
    });
  }
  
  return next({
    ctx: {
      ...ctx,
      user: {
        id: userContext.userId,
        isWorker: userContext.isWorker ?? false,
      },
    },
  });
});

// Admin procedure - requires specific permissions
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  // Check if user has admin role
  // Implementation depends on your permission system
  return next({ ctx });
});

// Worker procedure - for internal worker calls
export const workerProcedure = t.procedure.use(async ({ ctx, next }) => {
  const { req } = ctx;
  const userContext = (req as any).context;
  
  if (!userContext?.isWorker) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Worker authentication required',
    });
  }
  
  return next({ ctx });
});
```

#### Step 1.3: Audit All Use Cases for Auth Requirements

**Audit Process:**

1. **List all use cases:**
```bash
find apps/api/src/domains -name "*.use-case.ts" -type f
```

2. **Categorize each use case:**
   - Extends `AuthenticatedUseCase` → Requires authentication
   - Extends `UseCase` → May or may not require authentication
   - Check if it accesses user-specific data

3. **Create authentication matrix:**

| Use Case | Extends | Requires Auth | Current Route | Action Needed |
|----------|---------|---------------|---------------|---------------|
| CreatePlayUseCase | AuthenticatedUseCase | ✅ Yes | plays.create | Convert to protectedProcedure |
| PlayDetailsUseCase | AuthenticatedUseCase | ✅ Yes | plays.playDetails | Convert to protectedProcedure |
| GetAllPlaysUseCase | AuthenticatedUseCase | ✅ Yes | plays.list | Convert to protectedProcedure |
| DeletePlayUseCase | AuthenticatedUseCase | ✅ Yes | plays.delete | Convert to protectedProcedure |
| SetScriptImportResultUseCase | AuthenticatedUseCase | ✅ Yes | worker/plays.setScriptImportResult | Convert to workerProcedure |
| GetMetadataUseCase | AuthenticatedUseCase | ✅ Yes | playsCollection.getMetadata | Convert to protectedProcedure |
| ... | ... | ... | ... | ... |

4. **Update each route file** to use appropriate procedure type.

#### Step 1.4: Add Rate Limiting

**Install rate limiting middleware:**
```bash
npm install express-rate-limit
```

**Add to `trpc-server.ts`:**
```typescript
import rateLimit from 'express-rate-limit';

// Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth rate limiting (stricter for auth endpoints)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: (req) => !req.path.includes('/auth'), // Only limit auth paths
  message: {
    error: 'Too many authentication attempts, please try again later.',
  },
});

// Apply to all routes
export default function trpcServer(): express.Application {
  const app = express();
  
  // Global rate limiting
  app.use(apiLimiter);
  
  // Auth-specific rate limiting
  app.use(authLimiter);
  
  // ... rest of middleware
}
```

#### Step 1.5: Test Authentication Enforcement

**Test Script:**
```bash
#!/bin/bash

echo "=== Testing Authentication Enforcement ==="

# Test 1: Worker route without auth
echo "1. Testing /worker/plays.setScriptImportResult without auth..."
curl -X POST http://localhost:3001/worker/plays.setScriptImportResult \
  -H "Content-Type: application/json" \
  -d '{"importId":"test","result":{"success":true}}' \
  2>&1 | grep -q "UNAUTHORIZED" && echo "✅ Blocked" || echo "❌ NOT Blocked"

# Test 2: Protected route without auth
echo "2. Testing /plays.create without auth..."
curl -X POST http://localhost:3001/trpc/plays.create \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}' \
  2>&1 | grep -q "UNAUTHORIZED" && echo "✅ Blocked" || echo "❌ NOT Blocked"

# Test 3: Worker route with API key
echo "3. Testing /worker/plays.setScriptImportResult with API key..."
curl -X POST http://localhost:3001/worker/plays.setScriptImportResult \
  -H "Content-Type: application/json" \
  -H "X-Worker-API-Key: $WORKER_API_KEY" \
  -d '{"importId":"test","result":{"success":true}}' \
  2>&1 | grep -q "success" && echo "✅ Allowed" || echo "❌ Blocked"

# Test 4: Rate limiting
echo "4. Testing rate limiting..."
for i in {1..105}; do
  curl -s http://localhost:3001/health > /dev/null
  if [ $? -ne 0 ]; then
    echo "✅ Rate limiting working"
    break
  fi
done
```

---

### Phase 2: Authentication Architecture (Day 2-3)

#### Objective: Implement proper authentication at all levels

| Step | Action | Responsible | Time | Priority |
|------|--------|-------------|------|----------|
| 2.1 | **Create worker service account** | DevOps | 1 hour | HIGH |
| 2.2 | **Update all route files with protected procedures** | Backend Dev | 4 hours | HIGH |
| 2.3 | **Create authentication middleware for worker** | Backend Dev | 2 hours | HIGH |
| 2.4 | **Update Python worker with API key** | DevOps | 1 hour | HIGH |
| 2.5 | **Add authentication tests** | QA | 2 hours | MEDIUM |

#### Step 2.1: Create Worker Service Account

**Generate API key for worker:**
```bash
# Generate secure API key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: e.g., a1b2c3d4e5f6...
```

**Add to environment:**
```bash
# .env.development.local (API)
WORKER_API_KEY=generated_key_here

# .env.development.local (Worker)
WORKER_API_KEY=generated_key_here
API_URL=http://api:3001
```

#### Step 2.2: Update Route Files with Protected Procedures

**Example: `plays.trpc-routes.ts`**

**Before:**
```typescript
import { publicProcedure, router } from '../../trpc.ts';

export default router({
  list: publicProcedure
    .input(z.undefined())
    .output(GetAllPlaysUseCaseOutputSchema)
    .query(handleUseCase(providers.GetAllPlaysUseCase)),
  create: publicProcedure
    .input(CreatePlayUseCaseInputSchema)
    .output(CreatePlayUseCaseOutputSchema)
    .mutation(handleUseCase(providers.CreatePlayUseCase)),
  // ...
});
```

**After:**
```typescript
import { protectedProcedure, router } from '../../trpc.ts';

export default router({
  list: protectedProcedure
    .input(z.undefined())
    .output(GetAllPlaysUseCaseOutputSchema)
    .query(handleUseCase(providers.GetAllPlaysUseCase)),
  create: protectedProcedure
    .input(CreatePlayUseCaseInputSchema)
    .output(CreatePlayUseCaseOutputSchema)
    .mutation(handleUseCase(providers.CreatePlayUseCase)),
  // ...
});
```

**Worker routes:**
```typescript
import { workerProcedure, router } from '../../trpc.ts';

export default router({
  setScriptImportResult: workerProcedure
    .input(SetScriptImportResultUseCaseInputSchema)
    .mutation(handleUseCase(providers.SetScriptImportResultUseCase)),
});
```

**Create a helper to determine procedure type:**
```typescript
// In trpc-delivery.ts or similar
import { protectedProcedure, workerProcedure, publicProcedure } from '../trpc.ts';

export function getProcedureForUseCase(useCase: any) {
  // Check if use case requires authentication
  if (useCase.prototype instanceof AuthenticatedUseCase) {
    // Check if it's a worker use case
    const useCaseName = useCase.name;
    if (useCaseName.includes('Worker') || 
        useCaseName.includes('ScriptImport') ||
        useCaseName.includes('SetScriptImportResult')) {
      return workerProcedure;
    }
    return protectedProcedure;
  }
  return publicProcedure;
}
```

#### Step 2.3: Create Worker Authentication Middleware

**`infra/worker-auth.middleware.ts`:**
```typescript
import type { NextFunction, Request, RequestHandler, Response } from 'express';

export function workerAuthMiddleware(): RequestHandler {
  return function (req: Request, _res: Response, next: NextFunction) {
    const apiKey = req.headers['x-worker-api-key'] as string;
    const expectedKey = process.env.WORKER_API_KEY;
    
    if (!expectedKey) {
      console.warn('WORKER_API_KEY not configured');
      return next();
    }
    
    if (apiKey && apiKey === expectedKey) {
      // Mark as worker request
      const context = req.context ?? {};
      context.isWorker = true;
      context.userId = -1; // System user ID
      req.context = context;
      return next();
    }
    
    // Not a worker request, continue to next middleware
    next();
  };
}
```

#### Step 2.4: Update Python Worker

**`apps/worker/trpc_client.py` - Add API Key:**
```python
class TRPCClient:
    def __init__(self, base_url: str, api_key: str = None, use_superjson: bool = False):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
        })
        if api_key:
            self.session.headers.update({
                "X-Worker-API-Key": api_key,
            })
        self.use_superjson = use_superjson

    # ... rest of methods
```

**Update `process_script_text_files.py`:**
```python
# Load API key from environment
api_key = os.getenv("WORKER_API_KEY")
if not api_key:
    raise ValueError("WORKER_API_KEY environment variable not set")

# Pass API key to client
client = TRPCClient(os.getenv("API_URL"), api_key=api_key, use_superjson=True)
```

**Update worker Docker Compose:**
```yaml
services:
  worker:
    # ...
    env_file:
      - './apps/worker/.env.development.local'
    # Ensure WORKER_API_KEY is in the env file
```

#### Step 2.5: Add Authentication Tests

**`apps/api/src/__tests__/auth.test.ts`:**
```typescript
import supertest from 'supertest';
import { describe, it, expect } from '@jest/globals';
import { createServer } from '../server';

describe('Authentication', () => {
  const request = supertest(createServer());

  describe('Public routes', () => {
    it('should allow access to health check without auth', async () => {
      await request
        .get('/health')
        .expect(200);
    });
  });

  describe('Protected routes', () => {
    it('should block access to protected routes without auth', async () => {
      await request
        .post('/trpc/plays.create')
        .send({ title: 'Test' })
        .expect(401);
    });

    it('should allow access with valid auth', async () => {
      // Mock Clerk authentication
      const authToken = 'test_token';
      await request
        .post('/trpc/plays.create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Test' })
        .expect(200);
    });
  });

  describe('Worker routes', () => {
    it('should block access without API key', async () => {
      await request
        .post('/worker/plays.setScriptImportResult')
        .send({ importId: 'test', result: { success: true, metadata: {} } })
        .expect(401);
    });

    it('should allow access with valid API key', async () => {
      await request
        .post('/worker/plays.setScriptImportResult')
        .set('X-Worker-API-Key', process.env.WORKER_API_KEY || 'test_key')
        .send({ importId: 'test', result: { success: true, metadata: {} } })
        .expect(200);
    });

    it('should block access with invalid API key', async () => {
      await request
        .post('/worker/plays.setScriptImportResult')
        .set('X-Worker-API-Key', 'invalid_key')
        .send({ importId: 'test', result: { success: true, metadata: {} } })
        .expect(401);
    });
  });

  describe('Rate limiting', () => {
    it('should limit requests to 100 per 15 minutes', async () => {
      // Make 101 requests
      const promises = Array(101).fill(request.get('/health'));
      const results = await Promise.allSettled(promises);
      
      const failures = results.filter(r => r.status === 'rejected');
      expect(failures.length).toBeGreaterThan(0);
    });
  });
});
```

---

### Phase 3: Permission System (Day 4-5)

#### Objective: Implement fine-grained permission control

| Step | Action | Responsible | Time | Priority |
|------|--------|-------------|------|----------|
| 3.1 | **Design permission model** | Backend Dev | 2 hours | MEDIUM |
| 3.2 | **Create permission middleware** | Backend Dev | 2 hours | MEDIUM |
| 3.3 | **Add permission checks to routes** | Backend Dev | 2 hours | MEDIUM |
| 3.4 | **Add permission tests** | QA | 1 hour | LOW |

#### Step 3.1: Design Permission Model

**Define user roles and permissions:**
```typescript
// types/permissions.ts
export type Permission = 
  | 'play:create'
  | 'play:read'
  | 'play:update'
  | 'play:delete'
  | 'play:invite'
  | 'script:read'
  | 'script:write'
  | 'admin:all';

export type Role = 'user' | 'admin' | 'worker';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  user: [
    'play:create',
    'play:read',
    'play:update',
    'play:invite',
    'script:read',
    'script:write',
  ],
  admin: [
    'play:create',
    'play:read',
    'play:update',
    'play:delete',
    'play:invite',
    'script:read',
    'script:write',
    'admin:all',
  ],
  worker: [
    'script:write', // Only what worker needs
  ],
};
```

#### Step 3.2: Create Permission Middleware

**`infra/permission.middleware.ts`:**
```typescript
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { TRPCError } from '@trpc/server';
import type { Permission } from '../types/permissions.ts';

export function requirePermission(permission: Permission): RequestHandler {
  return function (req: Request, _res: Response, next: NextFunction) {
    const context = (req as any).context;
    
    if (!context?.userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }
    
    // Check if user has permission
    // This would query your database or use cached permissions
    const userPermissions = getUserPermissions(context.userId);
    
    if (!userPermissions.includes(permission)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
      });
    }
    
    next();
  };
}

// Helper to get user permissions (implementation depends on your DB)
async function getUserPermissions(userId: number): Promise<Permission[]> {
  // Query database or use cached permissions
  // This is a placeholder - implement based on your data model
  return [];
}
```

**tRPC procedure with permission:**
```typescript
// In trpc.ts
export const protectedProcedure = t.procedure.use(authMiddleware);

// Create permission-protected procedure
import { requirePermission } from '../infra/permission.middleware.ts';

export function createProtectedProcedure(permission: Permission) {
  return t.procedure
    .use(authMiddleware)
    .use(async ({ ctx, next }) => {
      const { req } = ctx;
      const userPermissions = getUserPermissionsFromRequest(req);
      
      if (!userPermissions.includes(permission)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        });
      }
      
      return next({ ctx });
    });
}

// Usage in route
export default router({
  delete: createProtectedProcedure('play:delete')
    .input(DeletePlayUseCaseInputSchema)
    .output(z.undefined())
    .mutation(handleUseCase(providers.DeletePlayUseCase)),
});
```

#### Step 3.3: Add Permission Checks to Routes

**Update each route with appropriate permissions:**

```typescript
// plays.trpc-routes.ts
export default router({
  list: createProtectedProcedure('play:read')
    .input(z.undefined())
    .output(GetAllPlaysUseCaseOutputSchema)
    .query(handleUseCase(providers.GetAllPlaysUseCase)),
  
  create: createProtectedProcedure('play:create')
    .input(CreatePlayUseCaseInputSchema)
    .output(CreatePlayUseCaseOutputSchema)
    .mutation(handleUseCase(providers.CreatePlayUseCase)),
  
  delete: createProtectedProcedure('play:delete')
    .input(DeletePlayUseCaseInputSchema)
    .output(z.undefined())
    .mutation(handleUseCase(providers.DeletePlayUseCase)),
});
```

#### Step 3.4: Add Permission Tests

**Extend `auth.test.ts`:**
```typescript
describe('Permissions', () => {
  it('should allow user to create play', async () => {
    await request
      .post('/trpc/plays.create')
      .set('Authorization', 'Bearer user_token')
      .send({ title: 'Test' })
      .expect(200);
  });

  it('should block user from deleting play without permission', async () => {
    await request
      .post('/trpc/plays.delete')
      .set('Authorization', 'Bearer user_token')
      .send({ uri: 'test' })
      .expect(403);
  });

  it('should allow admin to delete play', async () => {
    await request
      .post('/trpc/plays.delete')
      .set('Authorization', 'Bearer admin_token')
      .send({ uri: 'test' })
      .expect(200);
  });
});
```

---

### Phase 4: Validation & Hardening (Day 6)

#### Objective: Verify all authentication fixes and harden the system

| Step | Action | Responsible | Time | Priority |
|------|--------|-------------|------|----------|
| 4.1 | **Security audit of all routes** | Security | 2 hours | HIGH |
| 4.2 | **Penetration testing** | Security | 2 hours | HIGH |
| 4.3 | **Performance testing** | QA | 1 hour | MEDIUM |
| 4.4 | **Document authentication system** | DevOps | 1 hour | MEDIUM |

#### Step 4.1: Security Audit

**Audit Checklist:**
- [ ] All worker routes have authentication
- [ ] All protected routes use appropriate procedure type
- [ ] All AuthenticatedUseCase instances are behind auth
- [ ] Worker API key is secure and rotated
- [ ] Rate limiting is configured and working
- [ ] No sensitive data exposed in error messages
- [ ] Authentication middleware properly handles edge cases

**Audit Script:**
```bash
#!/bin/bash

echo "=== Authentication Security Audit ==="

# 1. Check for publicProcedure usage in protected routes
echo "1. Checking for publicProcedure on protected routes..."
grep -r "publicProcedure" apps/api/src/domains --include="*.trpc-routes.ts" | grep -v "// " | wc -l
echo "   publicProcedure usages found. Review each for auth requirements."

# 2. Check for AuthenticatedUseCase without protection
echo "2. Checking for AuthenticatedUseCase usage..."
grep -r "extends AuthenticatedUseCase" apps/api/src/domains --include="*.use-case.ts" | wc -l
echo "   AuthenticatedUseCase classes found. Verify each has auth protection."

# 3. Check worker route authentication
echo "3. Checking worker route authentication..."
grep -A5 "'/worker'" apps/api/src/trpc-server.ts | grep -q "clerkMiddleware\|workerAuthMiddleware" && echo "   ✅ Worker routes have auth" || echo "   ❌ Worker routes missing auth"

# 4. Check rate limiting
echo "4. Checking rate limiting..."
grep -q "express-rate-limit" apps/api/src/trpc-server.ts && echo "   ✅ Rate limiting configured" || echo "   ❌ Rate limiting missing"

# 5. Check for hardcoded secrets
echo "5. Checking for hardcoded API keys..."
grep -r "WORKER_API_KEY.*=" apps/api/src --include="*.ts" | grep -v "process.env" | grep -v "//" | wc -l
if [ $? -eq 0 ]; then echo "   ❌ Hardcoded API keys found"; else echo "   ✅ No hardcoded API keys"; fi

echo "Audit complete"
```

#### Step 4.2: Penetration Testing

**Manual Test Cases:**

| Test | Method | URL | Expected | Actual |
|------|--------|-----|----------|--------|
| Unauthenticated worker call | POST | /worker/plays.setScriptImportResult | 401 | |
| Unauthenticated play create | POST | /trpc/plays.create | 401 | |
| Invalid API key | POST | /worker/... | 401 | |
| Valid API key | POST | /worker/... | 200 | |
| Rate limit exceeded | GET | /health (100+ times) | 429 | |
| Invalid permissions | POST | /trpc/plays.delete (as user) | 403 | |

#### Step 4.3: Performance Testing

**Load Test Authentication:**
```bash
# Test auth overhead
ab -n 1000 -c 10 http://localhost:3001/trpc/plays.list

# Test rate limiting under load
ab -n 200 -c 20 http://localhost:3001/health
```

#### Step 4.4: Document Authentication System

**Create `docs/authentication.md`:**
```markdown
# Authentication System

## Overview

This document describes the authentication and authorization system for the Marivo API.

## Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Request    │────▶│ clerkMiddleware│────▶│ userMiddleware│
└─────────────┘     └─────────────┘     └─────────────┘
                                                      │
                        ┌─────────────────────────────────┴─────────────────────────────────┐
                        │                                                                      │
                        ▼                                                                      ▼
              ┌─────────────────┐                          ┌─────────────────┐
              │  Public Routes   │                          │ Protected Routes │
              │  (no auth required)│                       │ (auth required)  │
              └─────────────────┘                          └─────────────────┘
                        │                                                                      │
                        ▼                                                                      ▼
              ┌─────────────────┐                          ┌─────────────────┐
              │   publicProcedure│                          │ protectedProcedure│
              │   (no check)     │                          │ (checks auth)    │
              └─────────────────┘                          └─────────────────┘

## Components

### 1. Clerk Authentication

We use [Clerk](https://clerk.com/) for user authentication. Clerk provides:
- Session management
- JWT validation
- User context

**Middleware:** `@clerk/express.clerkMiddleware()`
- Validates incoming requests
- Attaches user information to `req.auth`
- Must be applied before userMiddleware

### 2. User Context Middleware

**File:** `infra/user-middleware.ts`

Extracts user information from Clerk and attaches to request context:
- `req.context.userId` - Database user ID
- `req.context.isWorker` - Boolean (for worker requests)

### 3. tRPC Procedures

#### Public Procedure
- No authentication required
- Use for truly public endpoints (health checks, public data)

```typescript
publicProcedure
  .query(...)
```

#### Protected Procedure
- Requires valid authentication
- Use for user-specific endpoints

```typescript
protectedProcedure
  .query(...)
```

#### Worker Procedure
- Requires valid worker API key
- Use for internal worker-to-API communication

```typescript
workerProcedure
  .mutation(...)
```

### 4. Worker Authentication

Internal services (Python worker) authenticate using API keys:
- Header: `X-Worker-API-Key`
- Configured in: `WORKER_API_KEY` environment variable
- Rotated: Quarterly

## Route Protection Matrix

| Route | Path | Procedure | Authentication | Permission |
|-------|------|-----------|----------------|-----------|
| Health Check | /health | publicProcedure | None | None |
| Play List | /trpc/plays.list | protectedProcedure | Required | play:read |
| Play Create | /trpc/plays.create | protectedProcedure | Required | play:create |
| Play Delete | /trpc/plays.delete | protectedProcedure | Required | play:delete |
| Play Details | /trpc/plays.playDetails | protectedProcedure | Required | play:read |
| Script Import | /trpc/plays.initImportScript | protectedProcedure | Required | play:create |
| Set Import Result | /worker/plays.setScriptImportResult | workerProcedure | Worker API Key | None |
| Get Metadata | /trpc/playsCollection.getMetadata | protectedProcedure | Required | play:read |

## Error Codes

| Code | Description | When Thrown |
|------|-------------|-------------|
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 429 | Too Many Requests | Rate limit exceeded |

## Testing

### Local Development

1. Copy environment template:
   ```bash
   cp apps/api/.env.template apps/api/.env.local
   ```

2. Add your Clerk credentials

3. For worker testing, add `WORKER_API_KEY` to environment

### Production

All authentication must be:
- Enabled
- Monitored
- Logged
- Rotated regularly

## Troubleshooting

### "Authentication error"
- Clerk middleware not applied to route
- Missing or invalid Clerk session token
- User context not set in request

### "Insufficient permissions"
- User lacks required permission for endpoint
- Permission middleware not applied
- User role not properly configured

### "Worker authentication required"
- Missing X-Worker-API-Key header
- Invalid API key
- Worker API key not configured in environment

## Security Best Practices

1. Always use the most restrictive procedure type
2. Never expose protected routes without authentication
3. Rotate worker API keys quarterly
4. Monitor authentication failures
5. Rate limit all public endpoints
6. Use HTTPS in production
7. Keep Clerk secrets secure
8. Regularly audit route protection

## Contact

For authentication issues, contact:
- Security Team: security@marivo.app
- Backend Team: backend@marivo.app
```

---

## Success Criteria

### ✅ Phase 1 Complete
- [ ] Worker routes have authentication middleware
- [ ] All critical endpoints blocked for unauthenticated requests
- [ ] Rate limiting configured and working
- [ ] Worker can authenticate with API key

### ✅ Phase 2 Complete
- [ ] Protected procedure types created and used
- [ ] All routes updated with appropriate procedure types
- [ ] Worker authentication middleware implemented
- [ ] Python worker updated with API key
- [ ] Authentication tests passing

### ✅ Phase 3 Complete
- [ ] Permission model designed and implemented
- [ ] Permission middleware working
- [ ] Permission tests passing

### ✅ Phase 4 Complete
- [ ] Security audit passed
- [ ] Penetration tests passed
- [ ] Performance tests passed
- [ ] Documentation complete

---

## Timeline

| Phase | Duration | Start | End | Status |
|-------|----------|-------|-----|--------|
| Phase 1: Immediate | 1 day | Day 1 | Day 1 | ⏳ Not Started |
| Phase 2: Procedures | 2 days | Day 2 | Day 3 | ⏳ Not Started |
| Phase 3: Permissions | 2 days | Day 4 | Day 5 | ⏳ Not Started |
| Phase 4: Validation | 1 day | Day 6 | Day 6 | ⏳ Not Started |

**Total**: 6 days for complete implementation

---

## Resources Required

### 👥 Personnel
- **Backend Developer**: 6 days
- **DevOps**: 2 days
- **Security Team**: 2 days
- **QA**: 3 days
- **Team Lead**: 1 day (coordination)

### 💻 Tools
- Docker & Docker Compose
- Git
- Node.js
- Python (for worker updates)
- PostgreSQL (for permission storage)
- Load testing tools (ab, artillery)

### 📋 Dependencies
- Access to Clerk dashboard
- Access to deployment environments
- Worker service restart capability

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Service disruption during auth changes | Medium | High | Test thoroughly, deploy during low-traffic |
| Worker unable to authenticate | Medium | High | Test worker auth before deploy, have rollback plan |
| Performance degradation from auth overhead | Low | Medium | Optimize middleware, cache permissions |
| Permission model too restrictive | Medium | Medium | Iterative design with user feedback |
| Rate limiting blocks legitimate users | Low | Medium | Tune limits based on usage patterns |

---

## Rollback Plan

### If Issues Arise

**Worker Authentication Failures:**
```bash
# Temporarily disable worker auth middleware
git checkout HEAD -- apps/api/src/trpc-server.ts
npm run build
pm2 restart api

# Revert to original (insecure) state
```

**Authentication Middleware Issues:**
```bash
# Disable specific middleware
git checkout HEAD -- apps/api/src/infra/worker-auth.middleware.ts
npm run build
pm2 restart api
```

### Emergency Contacts
- **Primary**: seb@marivo.app
- **Secondary**: security@marivo.app
- **Backend Team**: backend@marivo.app

---

## Communication Plan

### 📢 Stakeholder Notifications

**Pre-Implementation:**
```markdown
# 🔒 CRITICAL: Authentication Security Fix

Team,

We've identified critical authentication vulnerabilities in our API that require immediate attention.

## What's Wrong
- Worker routes have NO authentication
- Anyone can call internal worker endpoints
- Protected use cases can be accessed without auth

## What's Happening
Over the next 6 days, we'll be:
1. Adding authentication to all endpoints
2. Implementing proper procedure-level auth
3. Setting up worker authentication
4. Adding rate limiting

## Impact
- **Day 1**: Worker will be temporarily unable to process jobs during deployment
- **Day 1-6**: Some endpoints may have brief downtime
- **Ongoing**: All requests will require proper authentication

## What You Need to Do
1. **For API Developers**: Review and update your route files
2. **For Worker Developers**: Update worker to use API key
3. **For QA**: Test authentication flows
4. **For All**: Be aware of deployment schedule

## Questions?
Contact seb@marivo.app or #security channel immediately.

This is a CRITICAL security fix. Please prioritize accordingly.
```

**Post-Implementation:**
```markdown
# ✅ Authentication Security Fix Complete

Team,

The authentication middleware security fixes are now complete.

## What Changed
- ✅ Worker routes now require authentication
- ✅ Protected procedures enforce authentication
- ✅ Worker uses API key for internal calls
- ✅ Rate limiting added to all endpoints
- ✅ Permission system implemented
- ✅ Documentation updated

## New Requirements
- All API endpoints now require authentication
- Worker must present valid API key
- Protected routes require user session
- Rate limits: 100 requests/15min (general), 10/15min (auth)

## For Developers
- Use `protectedProcedure` for user endpoints
- Use `workerProcedure` for worker-only endpoints
- Use `publicProcedure` only for truly public endpoints
- Always check permissions for sensitive operations

## Resources
- [Authentication Documentation](docs/authentication.md)
- [Updated README](README.md)

## Questions or Issues?
Contact #security or seb@marivo.app
```

---

## Files Reference

### Files to Create
```
apps/api/src/infra/worker-auth.middleware.ts
apps/api/src/__tests__/auth.test.ts
docs/authentication.md
```

### Files to Update
```
apps/api/src/trpc.ts (add protectedProcedure, workerProcedure)
apps/api/src/trpc-server.ts (add auth to worker routes)
apps/api/src/domains/plays/plays.trpc-routes.ts (use protectedProcedure)
apps/api/src/domains/plays/plays-worker.trpc-routes.ts (use workerProcedure)
apps/api/src/domains/plays/plays-collection.trpc-routes.ts (use protectedProcedure)
apps/api/src/domains/script/script.trpc-routes.ts (use protectedProcedure)
... (all other trpc-routes.ts files)
apps/api/src/shared/trpc-delivery.ts (optional updates)
apps/worker/trpc_client.py (add API key support)
apps/worker/process_script_text_files.py (use API key)
compose.yaml (update worker environment)
package.json (add express-rate-limit)
```

---

## Metrics and Success Measurement

### 📊 Key Performance Indicators

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Unauthenticated endpoint access | High risk | 0 | Security audit |
| Worker endpoint exposure | High risk | 0 | Penetration test |
| Rate limiting effectiveness | 0% | 100% | Load testing |
| Authentication overhead | N/A | < 50ms | Performance test |
| Permission enforcement | 0% | 100% | Audit |

### 🎯 Success Criteria

**Security:**
- 0 unauthenticated access to protected endpoints
- 0 unauthorized permission access
- 100% of worker requests authenticated
- 100% of protected routes use protectedProcedure

**Reliability:**
- < 50ms authentication overhead
- 0 authentication-related outages
- 100% of legitimate requests succeed

**Maintainability:**
- Clear authentication documentation
- Easy to add new protected routes
- Simple permission system

---

## Summary

**Issue**: Worker routes and protected use cases are accessible without authentication
**Risk Level**: **CRITICAL**
**Impact**: Unauthorized access to user data, job execution, potential data breaches
**Solution**: Add authentication middleware, protected procedures, worker API keys, rate limiting
**Timeline**: 6 days

---

## Related Issues

- **MARIVO-SEC-001**: Environment Variables Security (separate issue)
- **MARIVO-SEC-002**: Authentication Middleware Security (this plan)
- **MARIVO-INF-003**: Rate Limiting Implementation (related)

---

**Document Control**  
**Version**: 1.0  
**Author**: Mistral Vibe  
**Reviewers**: pending  
**Approval**: pending  
**Last Updated**: 2026-10-02