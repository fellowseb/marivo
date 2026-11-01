# Issue #3: S3 Client Credentials in Code

**Status:** Open  
**Priority:** Critical (Rank: 1)  
**Labels:** `critical`, `security`, `credentials`, `worker`, `s3`, `priority:critical`  
**Component:** Worker  

---

## Issue: Garage S3 credentials are hardcoded/committed in Python worker

### Problem
- `s3_client.py` uses environment variables but they're committed in `.env` files
- No error handling for missing credentials
- Credentials could be exposed in version control

### Files affected
- `apps/worker/s3_client.py`
- `apps/worker/trpc_client.py`
- `.env` files (potentially committed)

### Impact
**High** - Security vulnerability. Committed credentials in version control can be accessed by anyone with repository access, leading to potential data breaches and unauthorized S3 access.

### Recommendation
- Validate environment variables on startup
- Add proper error handling with meaningful messages (without exposing credentials)
- Use AWS credentials chain for better security
- Remove all secrets from version control
- Implement proper secrets management

---

## Acceptance Criteria

- [ ] All S3 credentials removed from version control
- [ ] Environment variables are validated on worker startup
- [ ] Proper error handling for missing credentials
- [ ] Secrets management solution implemented
- [ ] No hardcoded credentials in code
- [ ] `.env` files added to `.gitignore`

---

## Related Files
- `apps/worker/s3_client.py`
- `apps/worker/trpc_client.py`
- `.env` files
- `.gitignore`

---

## Notes
This is a **CRITICAL** security issue. Any committed credentials must be removed from version control history, not just from the current commit.

## Linked PR
- [ ] PR #3: S3 Client Credentials Security
