# Issue #8: tRPC Client Implementation Issues

**Status:** Open  
**Priority:** High (Rank: 2)  
**Labels:** `high`, `trpc`, `worker`, `api-communication`, `priority:high`  
**Component:** Worker  

---

## Issue: Custom Python tRPC client has several problems

### Problem
- `trpc_client.py` uses GET for queries but tRPC typically uses POST
- Error handling is inconsistent
- No proper request timeout handling
- Missing proper JSON-RPC formatting

### Files affected
- `apps/worker/trpc_client.py`

### Impact
**High** - Improves worker-API communication reliability. Current issues:
- May not work correctly with tRPC server
- Poor error handling makes debugging difficult
- No timeout handling can cause hanging requests
- Inconsistent with tRPC best practices

### Recommendation
- Use proper tRPC HTTP protocol (POST for all requests)
- Add proper request timeouts
- Implement proper error handling with retry logic
- Consider using official tRPC Python client or generating client from schema

---

## Acceptance Criteria

- [ ] All tRPC requests use POST method
- [ ] Proper request timeouts implemented
- [ ] Consistent error handling with retries
- [ ] Proper JSON-RPC formatting
- [ ] All tests pass with new client

---

## Related Files
- `apps/worker/trpc_client.py`

---

## Notes
This is a **High Priority** fix for reliable worker-API communication.

## Linked PR
- [ ] PR #8: tRPC Client Implementation
