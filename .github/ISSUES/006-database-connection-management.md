# Issue #6: Database Connection Management

**Status:** Open  
**Priority:** High (Rank: 2)  
**Labels:** `high`, `database`, `connection-pooling`, `performance`, `priority:high`  
**Component:** API  

---

## Issue: Singleton pattern with no connection pooling or health checks

### Problem
- `db.ts` uses singleton pattern which may cause issues in serverless environments
- No connection health checks
- No retry logic for failed connections
- No connection pooling

### Files affected
- `apps/api/src/infra/db.ts`

### Impact
**High** - Prevents database connection failures and improves scalability. Current implementation may:
- Fail in serverless environments
- Not handle connection failures gracefully
- Not scale efficiently under load
- Cause connection leaks

### Recommendation
- Implement connection pooling with proper configuration
- Add database health check endpoint
- Implement connection retry with exponential backoff
- Add connection validation on startup

### Example improvement:
```typescript
const sql = postgres({
  max: 20, // connection pool size
  idle_timeout: 30000,
  connection_timeout: 5000,
});
```

---

## Acceptance Criteria

- [ ] Connection pooling implemented
- [ ] Database health check endpoint added
- [ ] Connection retry with exponential backoff
- [ ] Connection validation on startup
- [ ] Works in serverless environments
- [ ] Proper connection cleanup

---

## Related Files
- `apps/api/src/infra/db.ts`

---

## Notes
This is a **High Priority** improvement for production reliability and scalability.

## Linked PR
- [ ] PR #6: Database Connection Management
