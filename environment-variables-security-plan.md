# Environment Variables Security Plan - CORRECTED

> **Priority**: Medium  
> **Component**: API, Worker, Infrastructure  
> **Issue ID**: MARIVO-SEC-001-CORRECTED  
> **Generated**: 2026-10-02  
> **Status**: Not Started

---

## ✅ Correction Note

**Previous Analysis Was Incorrect**: My initial assessment stated that `.env.development.docker` files were committed to git. This was **wrong**.

**Actual State**:

- ✅ `.gitignore` **does** properly ignore all `.env*` files (line 8: `.env*`)
- ✅ `.env.development.docker` files are **NOT** committed to git
- ✅ No credentials exist in git history
- ✅ Source code properly uses `process.env.VARIABLE_NAME` pattern

---

## Current State Assessment

### 🔍 Findings Summary

**Files Found (NOT in git, properly ignored):**

```
marivo/
├── .env.development.docker                    # Contains Garage & DB credentials
├── apps/api/.env.development.docker           # Contains Clerk, Mistral, Garage keys
├── apps/api/.env.development.local            # Contains Clerk, Mistral, Garage keys
├── apps/worker/.env.development.docker        # Contains Mistral, Garage keys
├── apps/worker/.env.development.local         # Contains Mistral, Garage keys
└── apps/webapp/.env.local                     # Contains Clerk key
```

**Credentials Found in Local Files:**

| File     | Credentials                                                                           | Risk Level                  |
| -------- | ------------------------------------------------------------------------------------- | --------------------------- |
| Multiple | Mistral API Key: `fswn7iU5dg42xPcb2WmOj9IPJxkzNbNT`                                   | **HIGH** - Financial risk   |
| Multiple | Clerk Secret Key: `sk_test_9b0SZdsc0pRiBteDtwl4ywAgSqKiAAmA9iFZNxIIvC`                | **HIGH** - Auth bypass risk |
| Multiple | Clerk Publishable Key: `pk_test_bGlrZWQtd3Jlbi00Ny5jbGVyay5hY2NvdW50cy5kZXYk`         | **MEDIUM**                  |
| Multiple | Garage Access Key: `GK06c8fbd8a91d21d224a5b678`                                       | **HIGH** - Data access risk |
| Multiple | Garage Secret Key: `be7ef169c7e1d10e36fedad8a70455dd685d79a4972b087e9fe8c293102c4750` | **HIGH** - Data access risk |
| Multiple | PostgreSQL Password: `postgres`                                                       | **MEDIUM**                  |

### 🎯 Real Security Issue

**The Problem**: Local development files contain **real API keys and credentials** that are used for development.

**The Risk**: While these files are properly gitignored, they still exist on local filesystems and could be exposed if:

- Local machine is compromised (stolen laptop, malware, etc.)
- Files are accidentally copied/emails/shared
- Backups include these files
- Developer pushes to a different remote without proper `.gitignore`

**Note**: These appear to be **test** credentials (e.g., `pk_test_`, `sk_test_`), but they still represent financial and security risks.

---

## Root Cause Analysis

### Why This Happened

1. **Development Convenience**: Real credentials were placed in local `.env` files for easier development
2. **Test Environment**: Using test keys (`pk_test_`, `sk_test_`) suggests these are for development/testing
3. **No Template System**: No `.env.template` files with placeholder values
4. **Shared Configuration**: Same credentials used across multiple services

### What's Working Well

1. ✅ `.gitignore` properly blocks all `.env*` files
2. ✅ No credentials in git history
3. ✅ Source code uses environment variables correctly
4. ✅ Docker Compose references environment files properly

---

## Corrected Remediation Plan

### Phase 1: Immediate Local Security (Day 1)

#### Objective: Remove real credentials from local development files

| Step | Action                                    | Responsible | Time   | Priority |
| ---- | ----------------------------------------- | ----------- | ------ | -------- |
| 1.1  | **Rotate Mistral API Key**                | DevOps      | 30 min | HIGH     |
| 1.2  | **Rotate Clerk Keys**                     | DevOps      | 30 min | HIGH     |
| 1.3  | **Rotate Garage S3 Keys**                 | DevOps      | 30 min | HIGH     |
| 1.4  | **Change DB Password**                    | DevOps      | 15 min | MEDIUM   |
| 1.5  | **Replace local files with placeholders** | All Devs    | 1 hour | HIGH     |

#### Step 1.1-1.4: Rotate All Credentials

**Commands/Process:**

```bash
# Mistral: Generate new key in Mistral AI dashboard
# Clerk: Generate new keys in Clerk dashboard
# Garage: Update Garage configuration with new keys
# PostgreSQL: Change password via pgadmin or psql
```

**Document new credentials securely** (1Password, Vault, or encrypted notes)

#### Step 1.5: Replace Local Files with Placeholders

**Replace contents of all `.env.development.*` and `.env.local` files with placeholders:**

**`.env.development.docker` (root):

```bash
# Garage Configuration
GARAGE_PORT=3900
GARAGE_WEB_PORT=3902
GARAGE_ADMIN_PORT=3903

# Database Configuration
POSTGRES_PASSWORD=CHANGE_ME_IN_PRODUCTION
POSTGRES_DB=marivo
POSTGRES_USER=postgres

# PgAdmin Configuration
PGADMIN_DEFAULT_EMAIL=admin@example.com
PGADMIN_DEFAULT_PASSWORD=CHANGE_ME
PGADMIN_CONFIG_SERVER_MODE=False
PGADMIN_CONFIG_MASTER_PASSWORD_REQUIRED=False

# Garage S3 Keys - REQUEST FROM TEAM LEAD
GARAGE_DEFAULT_ACCESS_KEY=YOUR_ACCESS_KEY_HERE
GARAGE_DEFAULT_SECRET_KEY=YOUR_SECRET_KEY_HERE
GARAGE_DEFAULT_BUCKET=marivo-imports

# API Configuration
API_BASE_URL=http://garage:3903
S3_ENDPOINT_URL=http://garage:3900
```

**`apps/api/.env.development.docker`:**

```bash
NODE_ENV=development

# Clerk Authentication - REQUEST FROM TEAM LEAD
CLERK_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY_HERE
CLERK_SECRET_KEY=YOUR_SECRET_KEY_HERE

# Mistral AI - REQUEST FROM TEAM LEAD
IMPORT_SCRIPTS_MISTRAL_API_KEY_DEV=YOUR_MISTRAL_KEY_HERE

# Garage S3 - REQUEST FROM TEAM LEAD
GARAGE_ENDPOINT=http://garage:3900
GARAGE_ACCESS_KEY=YOUR_ACCESS_KEY_HERE
GARAGE_SECRET_KEY=YOUR_SECRET_KEY_HERE

# Database
REDIS_HOST=redis
REDIS_PORT=6379
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USERNAME=postgres
POSTGRES_PASSWORD=CHANGE_ME
```

**`apps/worker/.env.development.docker`:**

```bash
# API Connection
API_URL=http://api:3001
REDIS_URL=redis://redis:6379/0

# Garage S3 - REQUEST FROM TEAM LEAD
GARAGE_ENDPOINT=http://garage:3900
GARAGE_ACCESS_KEY=YOUR_ACCESS_KEY_HERE
GARAGE_SECRET_KEY=YOUR_SECRET_KEY_HERE

# Mistral AI - REQUEST FROM TEAM LEAD
MISTRAL_API_KEY=YOUR_MISTRAL_KEY_HERE
```

---

### Phase 2: Secure Development Process (Day 2-3)

#### Objective: Implement proper secrets management for local development

| Step | Action                                 | Responsible | Time   | Priority |
| ---- | -------------------------------------- | ----------- | ------ | -------- |
| 2.1  | **Create environment templates**       | DevOps      | 1 hour | HIGH     |
| 2.2  | **Update Docker Compose for security** | DevOps      | 1 hour | MEDIUM   |
| 2.3  | **Document development setup**         | DevOps      | 1 hour | HIGH     |
| 2.4  | **Add pre-commit safeguards**          | DevOps      | 1 hour | MEDIUM   |

#### Step 2.1: Create Environment Templates

Create `.env.template` files that developers can copy:

**`apps/api/.env.template`:**

```bash
# =============================================================================
# API Environment Configuration
# =============================================================================
# Copy this file to .env.local for development
# NEVER commit .env.local files to git
# Request credentials from team lead or security team
# =============================================================================

# Application
NODE_ENV=development
TRPC_PORT=3001

# Clerk Authentication
# Get keys from: https://dashboard.clerk.com/last-active?path=api-keys
CLERK_PUBLISHABLE_KEY=your_publishable_key_here
CLERK_SECRET_KEY=your_secret_key_here

# Mistral AI
# For script processing
MISTRAL_API_KEY=your_mistral_api_key_here

# Storage (Garage S3)
GARAGE_ENDPOINT=http://localhost:3900
GARAGE_ACCESS_KEY=your_access_key_here
GARAGE_SECRET_KEY=your_secret_key_here

# Database
REDIS_HOST=localhost
REDIS_PORT=6379
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USERNAME=postgres
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=marivo
```

**`apps/worker/.env.template`:**

```bash
# =============================================================================
# Worker Environment Configuration
# =============================================================================
# Copy this file to .env.local for development
# NEVER commit .env.local files to git
# Request credentials from team lead or security team
# =============================================================================

# API Connection
API_URL=http://localhost:3001
REDIS_URL=redis://localhost:6379/0

# Storage (Garage S3)
GARAGE_ENDPOINT=http://localhost:3900
GARAGE_ACCESS_KEY=your_access_key_here
GARAGE_SECRET_KEY=your_secret_key_here

# Mistral AI
MISTRAL_API_KEY=your_mistral_api_key_here
```

#### Step 2.2: Update Docker Compose Configuration

**Current `compose.yaml` (lines 19-20, 29-30):**

```yaml
services:
  api:
    # ...
    env_file: "./apps/api/.env.development.docker"
    # ...
  worker:
    # ...
    env_file: "./apps/worker/.env.development.docker"
```

**Recommendation**: Continue using environment files, but ensure they contain only placeholders or test credentials, not production keys.

**Alternative (More Secure)**: Use Docker secrets for sensitive values:

```yaml
services:
  api:
    environment:
      CLERK_PUBLISHABLE_KEY: ${CLERK_PUBLISHABLE_KEY}
      CLERK_SECRET_KEY: ${CLERK_SECRET_KEY}
      MISTRAL_API_KEY: ${MISTRAL_API_KEY}
      # ... other non-sensitive configs from file
    env_file: "./apps/api/.env.development.docker"
```

#### Step 2.3: Document Development Setup

**Add to `README.md`:**

````markdown
## Development Setup

### Environment Configuration

1. **Copy environment templates:**
   ```bash
   # For API
   cp apps/api/.env.template apps/api/.env.local

   # For Worker
   cp apps/worker/.env.template apps/worker/.env.local
   ```
````

2. **Request credentials** from team lead:
   - Mistral AI API key
   - Clerk publishable and secret keys
   - Garage S3 access and secret keys
   - Database password

3. **Populate `.env.local` files** with your credentials

4. **Start services:**
   ```bash
   docker compose up
   ```

⚠️ **IMPORTANT**: Never commit `.env*` files to git. They are ignored via `.gitignore`.

### Security Best Practices

- Use different credentials for development vs production
- Rotate credentials regularly (quarterly)
- Never share credentials via email, Slack, or chat
- Store credentials securely (1Password, Vault, etc.)
- Report any credential exposure immediately

````

**Create `docs/local-development.md`:**
```markdown
# Local Development Guide

## Environment Variables

This project uses environment variables for configuration. Never commit actual credentials to git.

### Template Files

Each application has a `.env.template` file with placeholder values:
- `apps/api/.env.template` - API server configuration
- `apps/worker/.env.template` - Background worker configuration

### Setup Process

1. Copy template to local file:
   ```bash
   cp apps/api/.env.template apps/api/.env.local
````

2. Obtain credentials:

   ```
   # From team lead or security team:
   - Mistral AI API key
   - Clerk authentication keys
   - Garage S3 credentials
   - Database password
   ```

3. Add credentials to `.env.local` file

4. Test your setup:
   ```bash
   docker compose up
   ```

### Credential Rotation

Credentials should be rotated:

- **Test/Development keys**: Quarterly
- **Production keys**: Immediately upon suspicion of exposure

Contact security@marivo.app for credential rotation.

### Emergency Procedures

If you accidentally commit a credential:

1. **STOP** - Do not push
2. Remove from git: `git rm --cached FILENAME`
3. Notify security team immediately
4. Do not attempt to fix alone

````

#### Step 2.4: Add Pre-commit Safeguards

**Install Husky:**
```bash
npm install husky --save-dev
npx husky install
````

**Create `.husky/pre-commit`:**

```bash
#!/usr/bin/env sh
. "$(dirname "$0")/_/husky.sh"

# Block commit if .env files are staged
env_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.env')
if [ -n "$env_files" ]; then
  echo "❌ ERROR: Attempting to commit environment files!"
  echo "Remove these files from your commit:"
  echo "$env_files"
  echo ""
  echo "Environment files should NEVER be committed to git."
  echo "Use .env.local files for development."
  exit 1
fi

# Run lint-staged
npx lint-staged
```

**Update `package.json`:**

```json
{
  "scripts": {
    "prepare": "husky install"
  },
  "devDependencies": {
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0"
  }
}
```

---

### Phase 3: Validation & Testing (Day 4)

#### Objective: Verify all security improvements are working

| Step | Action                                   | Responsible | Time    | Priority |
| ---- | ---------------------------------------- | ----------- | ------- | -------- |
| 3.1  | **Verify no credentials in local files** | Security    | 30 min  | HIGH     |
| 3.2  | **Test development setup**               | QA          | 2 hours | HIGH     |
| 3.3  | **Verify Docker Compose works**          | DevOps      | 1 hour  | HIGH     |
| 3.4  | **Security audit**                       | Security    | 1 hour  | HIGH     |

#### Step 3.1: Verify No Credentials in Local Files

**Scan for hardcoded credentials:**

```bash
# From repository root
grep -r "fswn7iU5dg42xPcb2WmOj9IPJxkzNbNT" . \
  --exclude-dir=.git \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  2>/dev/null || echo "✅ No Mistral key found"

grep -r "sk_test_9b0SZdsc0pRiBteDtwl4ywAgSqKiAAmA9iFZNxIIvC" . \
  --exclude-dir=.git \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  2>/dev/null || echo "✅ No Clerk secret key found"

grep -r "GK06c8fbd8a91d21d224a5b678" . \
  --exclude-dir=.git \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  2>/dev/null || echo "✅ No Garage access key found"
```

**Expected**: No matches (all credentials removed)

#### Step 3.2: Test Development Setup

**Test new developer onboarding:**

```bash
# Simulate new developer
rm -rf /tmp/marivo-test
cd /tmp
git clone /home/seb/Repositories/marivo marivo-test
cd marivo-test

# Copy templates
cp apps/api/.env.template apps/api/.env.local
cp apps/worker/.env.template apps/worker/.env.local

# Try to start (will fail without credentials - expected)
docker compose up 2>&1 | head -20

# Verify error messages mention missing credentials
echo "Expected: Containers fail with missing environment variable errors"
```

#### Step 3.3: Verify Docker Compose Works with Templates

**Test with placeholder values:**

```bash
# Use placeholder values
cp apps/api/.env.template apps/api/.env.local
cp apps/worker/.env.template apps/worker/.env.local

# Add dummy values
sed -i 's/YOUR_.*_HERE/DUMMY_VALUE/g' apps/api/.env.local apps/worker/.env.local

# Start services
docker compose up --build

# Expected: Services start but may fail on API calls (due to invalid credentials)
# This is expected and correct behavior
```

#### Step 3.4: Security Audit

**Audit Checklist:**

- [ ] No credentials in local `.env*` files (placeholders only)
- [ ] Template files created and contain placeholders
- [ ] Template files do NOT contain real credentials
- [ ] Docker Compose configuration updated
- [ ] Documentation complete
- [ ] Pre-commit hooks installed and tested
- [ ] All credentials rotated

---

### Phase 4: Monitoring & Prevention (Ongoing)

#### Objective: Prevent future credential exposure

| Step | Action                        | Frequency    | Responsible |
| ---- | ----------------------------- | ------------ | ----------- |
| 4.1  | **Pre-commit hooks**          | Every commit | All Devs    | Automatic |
| 4.2  | **Local credential scanning** | Weekly       | All Devs    | Automatic |
| 4.3  | **Team training**             | Quarterly    | DevOps      |
| 4.4  | **Credential rotation**       | Quarterly    | Security    |
| 4.5  | **Security reminders**        | Monthly      | DevOps      |

#### Step 4.1: Pre-commit Hooks (Already in Phase 2)

#### Step 4.2: Local Credential Scanning

**Add to team's development workflow:**

```bash
# Weekly scan for credentials in workspace
#!/bin/bash
echo "=== Weekly Credential Scan ==="
echo "Scanning for exposed credentials..."

patterns=(
  "pk_test_"
  "sk_test_"
  "pk_live_"
  "sk_live_"
  "GK[0-9a-zA-Z]{20}"
  "be7ef169c7e1d10e36fedad8a70455dd685d79a4972b087e9fe8c293102c4750"
)

for pattern in "${patterns[@]}"; do
  if grep -r "$pattern" . --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist 2>/dev/null; then
    echo "⚠️  WARNING: Potential credential found: $pattern"
  else
    echo "✅ No match for: $pattern"
  fi
done

echo "Scan complete"
```

#### Step 4.3: Team Training

**Topics to cover:**

- Never commit `.env*` files to git
- Use template files for new projects
- Request credentials through proper channels
- Rotate credentials regularly
- What to do if credentials are exposed

#### Step 4.4: Credential Rotation Schedule

| Credential      | Environment | Frequency     | Next Rotation |
| --------------- | ----------- | ------------- | ------------- |
| Mistral API Key | Dev/Test    | Quarterly     | 2027-01-01    |
| Clerk Keys      | Dev/Test    | Quarterly     | 2027-01-01    |
| Garage S3 Keys  | Dev/Test    | Semi-annually | 2027-04-01    |
| DB Password     | Dev/Test    | Semi-annually | 2027-04-01    |

#### Step 4.5: Security Reminders

**Monthly reminder to team:**

```markdown
# 🔒 Monthly Security Reminder

Hello Team,

Quick security checklist:

- [ ] My `.env.local` files contain only my personal credentials
- [ ] I have not committed any `.env*` files to git
- [ ] I am using test keys for development, not production
- [ ] I have reported any credential issues to security@marivo.app

Questions? Contact #security channel or security@marivo.app
```

---

## Success Criteria

### ✅ Phase 1 Complete

- [ ] All exposed credentials rotated
- [ ] Local `.env*` files contain only placeholders
- [ ] No real credentials remain in local development files

### ✅ Phase 2 Complete

- [ ] Template files created for all services
- [ ] Docker Compose configuration reviewed
- [ ] Documentation updated
- [ ] Pre-commit hooks implemented

### ✅ Phase 3 Complete

- [ ] No credentials found in local files
- [ ] Development setup works with templates
- [ ] Docker Compose works with new configuration
- [ ] Security audit passed

### ✅ Phase 4 Complete

- [ ] Pre-commit hooks active
- [ ] Team trained on new process
- [ ] Credential rotation schedule established
- [ ] Monthly reminders in place

---

## Timeline

| Phase               | Duration | Start | End   | Status         |
| ------------------- | -------- | ----- | ----- | -------------- |
| Phase 1: Immediate  | 1 day    | Day 1 | Day 1 | ⏳ Not Started |
| Phase 2: Process    | 2 days   | Day 2 | Day 3 | ⏳ Not Started |
| Phase 3: Validation | 1 day    | Day 4 | Day 4 | ⏳ Not Started |
| Phase 4: Monitoring | Ongoing  | Day 5 | -     | ⏳ Not Started |

**Total**: 4 days + ongoing maintenance

---

## Resources Required

### 👥 Personnel

- **DevOps/Security**: 4 days
- **QA**: 2 hours
- **All Developers**: 1 hour (local file cleanup)

### 💻 Tools

- Docker & Docker Compose
- Git
- Node.js (for Husky)
- Text editor

### 📋 Dependencies

- Access to credential dashboards (Mistral, Clerk, Garage)
- Access to database configuration

---

## Risk Assessment

| Risk                                 | Likelihood | Impact | Mitigation                                   |
| ------------------------------------ | ---------- | ------ | -------------------------------------------- |
| Service downtime during rotation     | Low        | Medium | Use test credentials, rotate during off-peak |
| Developer confusion with new process | Medium     | Low    | Clear documentation, training                |
| Credentials in backups               | Medium     | Medium | Update backup exclusions, educate team       |
| Team resistance to change            | Medium     | Low    | Demonstrate security benefits                |

---

## Communication Plan

### 📢 Announcements

**Pre-Implementation:**

```markdown
# 🔒 Security Improvement: Environment Variable Management

Team,

We're improving our security practices for local development.

## What's Changing

Over the next 4 days, we'll be:

1. Rotating all development credentials
2. Replacing local .env files with templates
3. Adding safeguards to prevent credential exposure

## What You Need to Do

1. **By EOD Day 1**: Replace your local `.env*` files with placeholders
2. **By EOD Day 2**: Request new test credentials from team lead
3. **By EOD Day 3**: Use new template system for development

## Questions?

Contact seb@marivo.app or #security channel
```

**Post-Implementation:**

```markdown
# ✅ Security Update Complete: Environment Variable Improvements

Team,

We've completed the environment variable security improvements:

## What Changed

- ✅ All test credentials rotated
- ✅ Local .env files now use placeholders
- ✅ New template system for easy onboarding
- ✅ Pre-commit hooks to prevent credential commits
- ✅ Documentation updated

## New Process

1. Copy template: `cp apps/api/.env.template apps/api/.env.local`
2. Request credentials from team lead
3. Add to `.env.local` (never commit!)
4. Start developing

## Resources

- [Local Development Guide](docs/local-development.md)
- [Updated README](README.md#development-setup)

Questions? Contact #security or seb@marivo.app
```

---

## Files Reference

### Files to Create

```
apps/api/.env.template
apps/worker/.env.template
docs/local-development.md
.husky/pre-commit
```

### Files to Update

```
README.md (add development setup section)
compose.yaml (optional: use Docker secrets)
package.json (add Husky)
```

### Files to Clean

```
.env.development.docker (replace contents with placeholders)
.env.development.local (replace contents with placeholders)
apps/api/.env.development.docker (replace contents with placeholders)
apps/api/.env.development.local (replace contents with placeholders)
apps/worker/.env.development.docker (replace contents with placeholders)
apps/worker/.env.development.local (replace contents with placeholders)
apps/webapp/.env.local (replace contents with placeholders)
```

---

## Summary

**Previous Assessment**: ❌ Incorrectly stated credentials were in git
**Current Assessment**: ✅ Credentials are NOT in git, but exist in local files
**Risk Level**: **Medium** (local filesystem exposure, not git exposure)
**Action Required**: Yes - rotate credentials and implement template system

---

**Document Control**  
**Version**: 2.0 (Corrected)  
**Author**: Mistral Vibe  
**Reviewers**: pending  
**Approval**: pending  
**Last Updated**: 2026-10-02
