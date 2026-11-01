# Issue #4: Mistral API Key Exposure

**Status:** Open  
**Priority:** Critical (Rank: 1)  
**Labels:** `critical`, `security`, `api-key`, `worker`, `mistral`, `priority:critical`  
**Component:** Worker  

---

## Issue: Mistral AI API key is hardcoded and committed

### Problem
- `mistral_parser.py` uses API key from environment
- Development environment files contain actual keys
- API keys committed to version control

### Files affected
- `apps/worker/mistral_parser.py`
- `apps/worker/IMPORT-SCRIPT-PROMPT.md`
- `.env` files
- Any configuration files with hardcoded keys

### Impact
**High** - Financial risk. Committed API keys can be used by anyone, leading to:
- Unauthorized API calls that incur costs
- Potential rate limit issues
- Data exposure if the key has access to sensitive data
- Reputation damage

### Recommendation
- Remove all API keys from version control
- Use secrets management
- Implement key rotation procedures
- Add key validation on worker startup
- Add spending alerts for Mistral API usage

---

## Acceptance Criteria

- [ ] All Mistral API keys removed from version control
- [ ] Secrets management solution implemented for API keys
- [ ] Key rotation procedures documented
- [ ] Key validation on worker startup
- [ ] Spending alerts configured for Mistral API
- [ ] All hardcoded keys removed from code and documentation

---

## Related Files
- `apps/worker/mistral_parser.py`
- `apps/worker/IMPORT-SCRIPT-PROMPT.md`
- `.env` files
- `.gitignore`

---

## Notes
This is a **CRITICAL** financial security issue. Mistral API keys have financial implications - unauthorized use can result in significant costs.

⚠️ **ACTION REQUIRED**: All exposed keys must be:
1. Revoked immediately
2. Removed from version control history
3. Rotated with new keys

## Linked PR
- [ ] PR #4: Mistral API Key Security
