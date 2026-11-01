# PR #7: Storage Service Duplication

**Status:** Draft  
**Linked Issue:** #7  
**Priority:** High  

---

## Description

This PR addresses **Issue #7: Storage Service Duplication** by creating a shared storage interface and consolidating the TypeScript and Python S3 client implementations.

### Changes Made

1. **Shared storage interface**
   - Created `IStorageService` interface with common operations
   - Defined consistent method signatures
   - Added documentation for storage operations

2. **TypeScript implementation**
   - Refactored `storage.ts` to implement shared interface
   - Standardized configuration approach
   - Added consistent error handling

3. **Python implementation**
   - Refactored `s3_client.py` to implement shared interface
   - Standardized configuration approach
   - Added consistent error handling and retry logic

4. **Shared configuration**
   - Created shared configuration schema
   - Added validation for storage configuration
   - Documented all configuration options

---

## Files Changed

- `apps/api/src/infra/storage.ts` - Refactored to use shared interface
- `apps/worker/s3_client.py` - Refactored to use shared interface
- `apps/api/src/interfaces/IStorageService.ts` - New shared interface
- `apps/api/src/config/storage.config.ts` - New shared configuration
- `docs/STORAGE_INTERFACE.md` - New interface documentation

---

## Checklist

- [ ] Shared storage interface created
- [ ] Both implementations follow the same interface
- [ ] Consistent configuration across implementations
- [ ] Consistent error handling
- [ ] Consistent retry logic
- [ ] Documentation for storage interface
- [ ] All tests pass

---

## Testing

### Manual Testing
- [ ] Verify TypeScript storage client works correctly
- [ ] Verify Python storage client works correctly
- [ ] Verify both clients handle errors consistently
- [ ] Verify configuration works the same in both

### Automated Tests
- [ ] Storage interface tests
- [ ] TypeScript storage client tests
- [ ] Python storage client tests

---

## Breaking Changes

Minimal - This PR standardizes existing storage implementations. The API remains the same, just more consistent.

---

## Related Issues
- Closes #7
