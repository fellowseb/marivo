# Issue #7: Storage Service Duplication

**Status:** Open  
**Priority:** High (Rank: 2)  
**Labels:** `high`, `storage`, `duplication`, `architecture`, `priority:high`  
**Component:** API, Worker  

---

## Issue: Both TypeScript API and Python worker implement S3 clients

### Problem
- `infra/storage.ts` (TypeScript) and `s3_client.py` (Python) do the same thing
- Different configuration approaches
- No shared abstraction
- Potential for inconsistency between implementations

### Files affected
- `apps/api/src/infra/storage.ts`
- `apps/worker/s3_client.py`

### Impact
**High** - Reduces duplication and improves consistency. Current state:
- Two separate implementations to maintain
- Potential for configuration drift
- Different error handling approaches
- Harder to make changes consistently

### Recommendation
- Create a shared storage interface/abstract class
- Ensure consistent configuration across both implementations
- Consider using the same AWS SDK approach in both
- Add proper error handling and retry logic

---

## Acceptance Criteria

- [ ] Shared storage interface created
- [ ] Both implementations follow the same interface
- [ ] Consistent configuration across implementations
- [ ] Consistent error handling
- [ ] Consistent retry logic
- [ ] Documentation for storage interface

---

## Related Files
- `apps/api/src/infra/storage.ts`
- `apps/worker/s3_client.py`

---

## Notes
This is a **High Priority** architectural improvement to reduce code duplication.

## Linked PR
- [ ] PR #7: Storage Service Duplication
