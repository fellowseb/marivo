# PR #4: Mistral API Key Security

**Status:** Draft  
**Linked Issue:** #4  
**Priority:** Critical  

---

## Description

This PR addresses **Issue #4: Mistral API Key Exposure** by removing all committed API keys from version control and implementing proper secrets management.

### Changes Made

1. **Removed API keys from version control**
   - Purged all Mistral API keys from git history
   - Revoked all exposed API keys
   - Generated new API keys

2. **Implemented secrets management**
   - Added environment variable support for Mistral API key
   - Added validation for Mistral API key on startup
   - Added proper error handling

3. **Added security documentation**
   - Created API key management procedures
   - Added key rotation schedule
   - Added spending alert configuration

4. **Cleaned up documentation**
   - Removed hardcoded keys from `IMPORT-SCRIPT-PROMPT.md`
   - Added placeholder instructions instead

---

## Files Changed

- `apps/worker/mistral_parser.py` - Added key validation
- `apps/worker/IMPORT-SCRIPT-PROMPT.md` - Removed hardcoded keys
- `.gitignore` - Added `.env` patterns
- `.env.example` - Added Mistral API key placeholder
- `docs/API_KEYS.md` - New API key management documentation

---

## Security Notes

⚠️ **URGENT ACTIONS REQUIRED BEFORE MERGING**:

1. **REVOKE ALL EXPOSED KEYS** - Any Mistral API key that was committed must be revoked immediately
2. **GENERATE NEW KEYS** - New keys must be generated and configured in production
3. **AUDIT USAGE** - Check Mistral API usage logs for suspicious activity
4. **ROTATE ALL KEYS** - All Mistral API keys should be rotated as a precaution

---

## Checklist

- [ ] All Mistral API keys removed from version control
- [ ] All exposed keys revoked
- [ ] New keys generated and configured
- [ ] Secrets management implemented
- [ ] Key validation on startup
- [ ] Documentation updated
- [ ] All tests pass

---

## Testing

### Manual Testing
- [ ] Verify worker fails gracefully with missing Mistral API key
- [ ] Verify worker fails with invalid Mistral API key
- [ ] Verify worker starts successfully with valid Mistral API key
- [ ] Verify no keys exposed in error messages

### Security Testing
- [ ] Verify no keys in git history
- [ ] Verify no keys in committed files
- [ ] Verify revoked keys are no longer functional

---

## Breaking Changes

Yes - Production will need:
1. New Mistral API keys configured
2. All old keys revoked
3. Environment variables updated

---

## Related Issues
- Closes #4
