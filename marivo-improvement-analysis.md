# Marivo Repository Improvement Analysis

> **Generated**: 2026-10-02  
> **Repository**: marivo (https://marivo.app)  
> **Structure**: Monorepo with Turborepo, pnpm workspace  
> **Components**: API (TypeScript), Webapp (React/TypeScript), Storefront (TypeScript), Worker (Python), Shared Packages

---

## Executive Summary

The marivo repository is a well-structured monorepo with a modern tech stack including TypeScript, React, tRPC, PostgreSQL, Redis, and Python workers. The architecture follows clean separation of concerns with domain-driven design patterns. However, **the application has critical gaps that make it unsuitable for production use**.

### 🚨 Critical Business Impact

**THE APPLICATION CANNOT SAVE USER DATA**. The most critical issue is that **script edits are not persisted to the server** and there's **no local storage** - users will lose all their work when they refresh the page. Additionally, **no API endpoints exist for writing script data** to the database.

### Key Missing Capabilities
- ❌ **No data persistence** - Edits are lost on page refresh
- ❌ **No server write endpoints** for script data  
- ❌ **No collaboration features** - Cannot support team workflows
- ❌ **Incomplete core features** - Staging, Blocking contain only placeholders
- ❌ **No version control** or history for scripts

### ✅ Strengths
- Clean architecture with domain-driven design
- Modern tech stack (React 19, Tanstack Query, tRPC)
- Good component organization
- Existing permission system foundation

This analysis identifies **94 actionable improvements** ranked by priority (Critical, High, Medium, Low) and grouped by component, including **14 critical missing features** that must be addressed immediately.

---

## Priority Ranking System

| Rank | Priority | Description                                                         | Impact | Effort     |
| ---- | -------- | ------------------------------------------------------------------- | ------ | ---------- |
| 1    | Critical | Security vulnerabilities, data loss risks, production breakers      | High   | Variable   |
| 2    | High     | Performance bottlenecks, major technical debt, scalability blockers | High   | Medium     |
| 3    | Medium   | Code quality, developer experience, maintainability                 | Medium | Low-Medium |
| 4    | Low      | Nice-to-haves, minor optimizations                                  | Low    | Low        |

---

## 📁 Repository Overview

```
marivo/
├── apps/
│   ├── api/          # Backend API (TypeScript, Express, tRPC)
│   ├── webapp/       # React web application (TypeScript, Vite)
│   ├── storefront/   # Marketing website (TypeScript, Vite)
│   └── worker/       # Python background jobs (BullMQ, Mistral AI)
├── packages/
│   ├── config-eslint/     # Shared ESLint configurations
│   ├── config-typescript/ # Shared TypeScript configurations
│   ├── jest-presets/     # Shared Jest configurations
│   ├── ui/             # Shared React UI components
│   └── utils/          # Shared utility functions
└── Infrastructure: Docker, Docker Compose, PostgreSQL, Redis, Garage (S3)
```

---

# 🔴 CRITICAL IMPROVEMENTS

## API Component

### 2. **Authentication Middleware Security** (Rank: 1)

**Issue**: Missing authentication validation in multiple routes

- `server.ts` has Clerk middleware but some routes may bypass it
- Worker routes (`/worker`) don't have proper authentication
- No rate limiting on API endpoints

**Files affected**:

- `apps/api/src/trpc-server.ts`
- `apps/api/src/server.ts`

**Recommendation**:

- Add authentication validation for worker routes
- Implement rate limiting (express-rate-limit)
- Add request validation for all public procedures
- Audit all tRPC routes for proper auth middleware

**Impact**: High (Potential unauthorized access)

---

## Worker Component

### 3. **S3 Client Credentials in Code** (Rank: 1)

**Issue**: Garage S3 credentials are hardcoded in Python worker

- `s3_client.py` uses environment variables but they're committed in `.env` files
- No error handling for missing credentials

**Files affected**:

- `apps/worker/s3_client.py`
- `apps/worker/trpc_client.py`

**Recommendation**:

- Validate environment variables on startup
- Add proper error handling with meaningful messages (without exposing credentials)
- Use AWS credentials chain for better security

**Impact**: High (Security vulnerability)

---

### 4. **Mistral API Key Exposure** (Rank: 1)

**Issue**: Mistral AI API key is hardcoded and committed

- `mistral_parser.py` uses API key from environment
- Development environment files contain actual keys

**Files affected**:

- `apps/worker/mistral_parser.py`
- `apps/worker/IMPORT-SCRIPT-PROMPT.md`

**Recommendation**:

- Remove all API keys from version control
- Use secrets management
- Implement key rotation procedures
- Add key validation on worker startup

**Impact**: High (Financial risk - API key abuse)

---

# 🟡 HIGH PRIORITY IMPROVEMENTS

## API Component

### 5. **Error Handling Standardization** (Rank: 2)

**Issue**: Inconsistent error handling across the API

- Some use cases return `Result` type, others throw directly
- Error codes not consistently mapped to HTTP status codes
- Missing error logging in some critical paths

**Files affected**:

- `apps/api/src/shared/error.ts`
- `apps/api/src/shared/trpc-delivery.ts`
- Multiple use case files

**Recommendation**:

- Standardize error handling using Result type throughout
- Create consistent error → HTTP status code mapping
- Add structured error logging (Winston, Pino)
- Implement error tracking (Sentry, etc.)

**Impact**: High (Better debugging, production reliability)

---

### 6. **Database Connection Management** (Rank: 2)

**Issue**: Singleton pattern with no connection pooling or health checks

- `db.ts` uses singleton pattern which may cause issues in serverless environments
- No connection health checks
- No retry logic for failed connections

**Files affected**:

- `apps/api/src/infra/db.ts`

**Recommendation**:

- Implement connection pooling with proper configuration
- Add database health check endpoint
- Implement connection retry with exponential backoff
- Add connection validation on startup

```typescript
// Example improvement
const sql = postgres({
  max: 20, // connection pool size
  idle_timeout: 30000,
  connection_timeout: 5000,
  // ...
});
```

**Impact**: High (Prevents database connection failures, better scalability)

---

### 7. **Storage Service Duplication** (Rank: 2)

**Issue**: Both TypeScript API and Python worker implement S3 clients

- `infra/storage.ts` (TypeScript) and `s3_client.py` (Python) do the same thing
- Different configuration approaches
- No shared abstraction

**Files affected**:

- `apps/api/src/infra/storage.ts`
- `apps/worker/s3_client.py`

**Recommendation**:

- Create a shared storage interface/abstract class
- Ensure consistent configuration across both implementations
- Consider using the same AWS SDK approach in both
- Add proper error handling and retry logic

**Impact**: High (Reduces duplication, improves consistency)

---

### 8. **tRPC Client Implementation Issues** (Rank: 2)

**Issue**: Custom Python tRPC client has several problems

- `trpc_client.py` uses GET for queries but tRPC typically uses POST
- Error handling is inconsistent
- No proper request timeout handling
- Missing proper JSON-RPC formatting

**Files affected**:

- `apps/worker/trpc_client.py`

**Recommendation**:

- Use proper tRPC HTTP protocol (POST for all requests)
- Add proper request timeouts
- Implement proper error handling with retry logic
- Consider using official tRPC Python client or generating client from schema

**Impact**: High (Improves worker-API communication reliability)

---

## Webapp Component

### 9. **Authentication Flow Validation** (Rank: 2)

**Issue**: Missing proper authentication state management

- No validation of authentication state in React components
- Potential race conditions in auth checks

**Files affected**:

- `apps/webapp/src/features/auth/`

**Recommendation**:

- Add proper authentication state validation
- Implement route guards for protected routes
- Add loading states for auth checks
- Consider using Clerk's built-in protection

**Impact**: High (Prevents unauthorized access)

---

## Worker Component

### 10. **Job Processing Error Handling** (Rank: 2)

**Issue**: Incomplete error handling in job processing

- `process_script_text_files.py` has broad exception catching
- Errors are only printed, not properly logged or tracked
- No job retry logic for transient failures
- Temporary files not always cleaned up properly

**Files affected**:

- `apps/worker/process_script_text_files.py`
- `apps/worker/main.py`

**Recommendation**:

- Add structured logging for job processing
- Implement proper error tracking and alerting
- Add job status tracking with retry capabilities
- Ensure proper resource cleanup in all error paths
- Add job timeout handling

**Impact**: High (Improves worker reliability)

---

### 11. **Mistral Parser Robustness** (Rank: 2)

**Issue**: Fragile parsing logic with limited error handling

- Regex-based JSON/CSS extraction is error-prone
- No validation of Mistral response format
- No fallback for failed API calls
- Hardcoded model and prompt references

**Files affected**:

- `apps/worker/mistral_parser.py`

**Recommendation**:

- Add response format validation
- Implement fallback parsing strategies
- Add proper error handling for API failures
- Make model and prompt configurable
- Add circuit breaker pattern for API calls

**Impact**: High (Prevents job processing failures)

---

## Infrastructure

### 12. **Docker Configuration Issues** (Rank: 2)

**Issue**: Multiple Docker-related problems

- API Dockerfile installs all workspace dependencies (slow builds)
- Worker Dockerfile uses Python 3.10 (could be newer)
- No multi-stage builds for production
- Development containers run as root

**Files affected**:

- `Dockerfile.api`
- `apps/worker/Dockerfile`
- `compose.yaml`

**Recommendation**:

- Use multi-stage builds for production
- Optimize dependency installation (separate dev/prod)
- Use non-root users in containers
- Add proper health checks
- Update Python version to 3.11+ for better performance

**Impact**: High (Improves security, build times, runtime performance)

---

### 13. **Missing Health Checks** (Rank: 2)

**Issue**: No health check endpoints for monitoring

- No way to monitor service health
- No database connection health checks
- No Redis connection validation

**Files affected**:

- `apps/api/src/` (missing health routes)
- `compose.yaml` (missing health checks)

**Recommendation**:

- Add `/health` endpoint with comprehensive checks
- Add database connectivity check
- Add Redis connectivity check
- Add storage connectivity check
- Add Docker health checks in compose

**Impact**: High (Improves observability and monitoring)

---

# 🟢 MEDIUM PRIORITY IMPROVEMENTS

## API Component

### 14. **Code Organization: Duplicate Route Files** (Rank: 3)

**Issue**: Both `server.ts` and `trpc-server.ts` exist with similar functionality

- Redundant server configuration
- Potential for configuration drift

**Files affected**:

- `apps/api/src/server.ts`
- `apps/api/src/trpc-server.ts`

**Recommendation**:

- Consolidate to single server entry point
- Remove redundant server configurations
- Standardize middleware setup

**Impact**: Medium (Reduces duplication, improves maintainability)

---

### 15. **Domain Layer Organization** (Rank: 3)

**Issue**: Inconsistent domain organization

- Some domains have separate models, repositories, use cases
- Others mix concerns
- Naming inconsistencies (e.g., `plays.providers.ts` vs `plays-collection.providers.ts`)

**Files affected**:

- `apps/api/src/domains/plays/`
- `apps/api/src/domains/script/`

**Recommendation**:

- Standardize domain structure across all domains
- Consistent naming conventions
- Separate concerns cleanly (models, repositories, services, use cases)

**Impact**: Medium (Improves code maintainability)

---

### 16. **tRPC Route Organization** (Rank: 3)

**Issue**: Route organization could be improved

- Some routes are in domain folders, others are flat
- Worker routes separated from main routes
- Potential for route naming conflicts

**Files affected**:

- `apps/api/src/domains/plays/plays.trpc-routes.ts`
- `apps/api/src/domains/plays/plays-worker.trpc-routes.ts`

**Recommendation**:

- Standardize route naming convention
- Organize worker routes consistently
- Consider versioning API routes
- Add route documentation

**Impact**: Medium (Improves API discoverability)

---

### 17. **Use Case Base Class Mismatch** (Rank: 3)

**Issue**: `execute` method signature mismatch

- `UseCase` interface expects `execute(params, headers)`
- But most use cases only need `execute(params)`
- Headers parameter is unused in many cases

**Files affected**:

- `apps/api/src/shared/use-case.ts`
- Multiple use case implementations

**Recommendation**:

- Make headers parameter optional
- Or remove it if not needed
- Standardize use case interface across all implementations

**Impact**: Medium (Improves code consistency)

---

### 18. **Provider Pattern Complexity** (Rank: 3)

**Issue**: Provider pattern may be over-engineered for current needs

- Complex provider setup for dependency injection
- Some providers are very simple and could be direct instantiation

**Files affected**:

- `apps/api/src/domains/plays/plays.providers.ts`
- Various provider files

**Recommendation**:

- Simplify provider pattern where appropriate
- Consider using constructor injection for simpler cases
- Document the provider pattern usage

**Impact**: Medium (Reduces complexity)

---

### 19. **Missing API Documentation** (Rank: 3)

**Issue**: No API documentation or OpenAPI/Swagger support

- No route documentation
- No request/response schemas documentation
- No API versioning information

**Files affected**:

- All tRPC route files

**Recommendation**:

- Add OpenAPI/Swagger documentation
- Add JSDoc comments for all routes
- Document request/response schemas
- Add API versioning

**Impact**: Medium (Improves developer experience)

---

## Webapp Component

### 20. **Feature Organization** (Rank: 3)

**Issue**: Feature organization could be improved

- Some features have dedicated folders, others don't
- Mixed naming conventions (e.g., `script-edition` vs `play-admin`)
- Large component files

**Files affected**:

- `apps/webapp/src/features/`

**Recommendation**:

- Standardize feature folder naming (kebab-case consistently)
- Organize features by domain consistently
- Split large component files into smaller, focused components

**Impact**: Medium (Improves code organization)

---

### 21. **TypeScript Usage in Components** (Rank: 3)

**Issue**: Inconsistent TypeScript usage in React components

- Some components have full type annotations
- Others have minimal or no typing
- Missing prop type definitions

**Files affected**:

- Various component files in `apps/webapp/src/`

**Recommendation**:

- Add comprehensive prop type definitions
- Use TypeScript interfaces for component props
- Add return type annotations for component functions

**Impact**: Medium (Improves type safety)

---

### 22. **Component Naming Conventions** (Rank: 3)

**Issue**: Inconsistent component naming

- Mixed `.tsx` and `.component.tsx` suffixes
- Some components use PascalCase, others inconsistent

**Files affected**:

- Various component files

**Recommendation**:

- Standardize on `.component.tsx` suffix for all components
- Use PascalCase consistently for component names
- Standardize file naming conventions

**Impact**: Medium (Improves code consistency)

---

## Storefront Component

### 23. **Storefront Content Management** (Rank: 3)

**Issue**: Hardcoded content in storefront

- Static content in React components
- No CMS integration
- Hard to update content

**Files affected**:

- `apps/storefront/src/main.ts`

**Recommendation**:

- Move content to external configuration or CMS
- Implement content management system
- Add content versioning

**Impact**: Medium (Improves content management)

---

## Worker Component

### 24. **Python Code Quality** (Rank: 3)

**Issue**: Python code quality issues

- Inconsistent error handling
- Some functions too long and complex
- Missing type hints in some places
- No logging standardization

**Files affected**:

- `apps/worker/process_script_text_files.py`
- `apps/worker/mistral_parser.py`

**Recommendation**:

- Add comprehensive type hints
- Split large functions into smaller ones
- Standardize error handling
- Add proper logging throughout

**Impact**: Medium (Improves code maintainability)

---

### 25. **Configuration Management** (Rank: 3)

**Issue**: Scattered configuration across multiple files

- Environment variables in multiple places
- No centralized configuration management
- Hardcoded values in some places

**Files affected**:

- Various files in `apps/worker/`

**Recommendation**:

- Centralize configuration in a single module
- Use configuration validation library (pydantic-settings)
- Add configuration validation on startup

**Impact**: Medium (Improves maintainability)

---

## Shared Packages

### 26. **Package Version Management** (Rank: 3)

**Issue**: Inconsistent dependency versions

- Different versions of same packages across apps
- Some packages use `^` version ranges, others specific versions
- Potential version conflicts

**Files affected**:

- Various `package.json` files

**Recommendation**:

- Standardize version pinning strategy
- Use consistent version ranges
- Add version conflict detection in CI
- Consider using `pnpm` version overrides

**Impact**: Medium (Prevents version conflicts)

---

### 27. **Shared Package Organization** (Rank: 3)

**Issue**: Shared packages could be better organized

- `config-eslint` and `config-typescript` are very minimal
- Some shared code is duplicated instead of being in packages
- Package exports could be more consistent

**Files affected**:

- `packages/config-eslint/`
- `packages/config-typescript/`

**Recommendation**:

- Consolidate configuration packages where appropriate
- Move duplicated code to shared packages
- Standardize package export patterns

**Impact**: Medium (Reduces duplication)

---

## Infrastructure

### 28. **Docker Compose Optimization** (Rank: 3)

**Issue**: Docker Compose configuration could be improved

- No resource limits defined
- No proper health checks
- Development volumes may cause permission issues

**Files affected**:

- `compose.yaml`

**Recommendation**:

- Add resource limits (CPU, memory)
- Add proper health checks for all services
- Use named volumes for persistent data
- Add proper volume permissions

**Impact**: Medium (Improves development environment)

---

### 29. **Missing CI/CD Pipeline** (Rank: 3)

**Issue**: No visible CI/CD configuration in repository

- No GitHub Actions, GitLab CI, or other CI files
- No automated testing
- No automated builds
- No deployment automation

**Files affected**:

- Missing `.github/workflows/` or similar

**Recommendation**:

- Add CI/CD pipeline configuration
- Add automated testing on PRs
- Add automated builds
- Add deployment automation
- Add quality gates (linting, type checking)

**Impact**: Medium (Improves development workflow)

---

### 30. **Monitoring and Observability** (Rank: 3)

**Issue**: Limited monitoring and observability

- No structured logging
- No metrics collection
- No distributed tracing
- No error tracking

**Files affected**:

- All application files

**Recommendation**:

- Add structured logging (Winston, Pino)
- Add metrics collection (Prometheus)
- Add distributed tracing (OpenTelemetry)
- Add error tracking (Sentry)

**Impact**: Medium (Improves production debugging)

---

# 🔵 LOW PRIORITY IMPROVEMENTS

## API Component

### 31. **Add Request ID Propagation** (Rank: 4)

**Issue**: Request ID middleware exists but may not propagate everywhere

- `delivery.middleware.ts` handles request ID but may not be used consistently
- No request ID in logs

**Files affected**:

- `apps/api/src/infra/delivery.middleware.ts`

**Recommendation**:

- Ensure request ID propagates to all middleware
- Add request ID to all log messages
- Propagate request ID to worker jobs

**Impact**: Low (Improves traceability)

---

### 32. **Add API Rate Limiting** (Rank: 4)

**Issue**: No rate limiting on API endpoints

- Potential for abuse or accidental overload

**Files affected**:

- `apps/api/src/trpc-server.ts`

**Recommendation**:

- Add rate limiting middleware
- Configure appropriate limits per endpoint
- Add burst protection

**Impact**: Low (Improves API stability)

---

## Webapp Component

### 33. **Add React Error Boundaries** (Rank: 4)

**Issue**: Missing error boundaries in React components

- Component errors can crash entire app
- No graceful error handling

**Files affected**:

- Various React component files

**Recommendation**:

- Add error boundaries at appropriate levels
- Implement graceful error handling
- Add error reporting

**Impact**: Low (Improves user experience)

---

### 34. **Performance Optimization** (Rank: 4)

**Issue**: Potential performance optimizations

- No React.memo usage
- No useMemo/useCallback optimizations
- Large bundle sizes

**Files affected**:

- Various React component files

**Recommendation**:

- Add React.memo for pure components
- Add useMemo/useCallback for expensive operations
- Analyze and optimize bundle sizes

**Impact**: Low (Improves performance)

---

## Documentation

### 35. **Add Architecture Documentation** (Rank: 4)

**Issue**: Limited architecture documentation

- No architecture decision records (ADRs)
- No component interaction diagrams
- No data flow documentation

**Files affected**:

- Missing documentation files

**Recommendation**:

- Add architecture documentation
- Add ADRs for major decisions
- Add component diagrams
- Document data flows

**Impact**: Low (Improves onboarding)

---

### 36. **Add Development Documentation** (Rank: 4)

**Issue**: Limited development documentation

- Basic README but missing details
- No local development setup guide
- No contribution guidelines

**Files affected**:

- `README.md`

**Recommendation**:

- Add detailed development setup guide
- Add contribution guidelines
- Add troubleshooting section
- Add architecture overview

**Impact**: Low (Improves developer onboarding)

---

### 37. **Add API Examples** (Rank: 4)

**Issue**: No API usage examples

- No Postman collection
- No cURL examples
- No SDK generation

**Files affected**:

- Missing example files

**Recommendation**:

- Add Postman collection
- Add cURL examples
- Generate API client SDKs

**Impact**: Low (Improves API usability)

---

## Infrastructure

### 38. **Add Backup Strategy** (Rank: 4)

**Issue**: No database backup strategy

- No automated backups
- No backup testing
- No disaster recovery plan

**Files affected**:

- `compose.yaml`

**Recommendation**:

- Add automated database backups
- Add backup verification
- Document disaster recovery procedures

**Impact**: Low (Improves data safety)

---

### 39. **Add Scaling Configuration** (Rank: 4)

**Issue**: No scaling configuration for production

- No horizontal scaling setup
- No auto-scaling configuration
- No load balancing

**Files affected**:

- Missing production configuration

**Recommendation**:

- Add scaling configuration
- Add load balancing
- Document scaling strategies

**Impact**: Low (Prepares for production)

---

## Code Quality

### 40. **Add More Unit Tests** (Rank: 4)

**Issue**: Limited test coverage

- Only one test file visible (`server.test.ts`)
- No integration tests
- No end-to-end tests

**Files affected**:

- Various files missing tests

**Recommendation**:

- Add unit tests for all use cases
- Add integration tests for API routes
- Add end-to-end tests for critical flows
- Set up test coverage reporting

**Impact**: Low (Improves code quality)

---

### 41. **Add Code Review Guidelines** (Rank: 4)

**Issue**: No code review guidelines

- No pull request template
- No review checklist
- No coding standards documentation

**Files affected**:

- Missing `.github/` files

**Recommendation**:

- Add pull request template
- Add code review checklist
- Add coding standards documentation

**Impact**: Low (Improves code quality)

---

### 42. **Add Pre-commit Hooks** (Rank: 4)

**Issue**: No pre-commit hooks for code quality

- No automated linting on commit
- No automated formatting
- No pre-commit validation

**Files affected**:

- Missing pre-commit configuration

**Recommendation**:

- Add Husky for pre-commit hooks
- Add lint-staged for staged file processing
- Add pre-commit validation

**Impact**: Low (Improves code quality)

---

## Build and Deployment

### 43. **Optimize Build Process** (Rank: 4)

**Issue**: Build process could be optimized

- No build caching
- No parallel builds
- Full rebuilds on every change

**Files affected**:

- `turbo.json`
- Various build scripts

**Recommendation**:

- Configure Turborepo caching properly
- Add incremental builds
- Optimize dependency installation

**Impact**: Low (Improves build times)

---

### 44. **Add Build Artifacts** (Rank: 4)

**Issue**: Build artifacts committed to repository

- `dist/` folders in git
- Build artifacts in version control

**Files affected**:

- Various `dist/` folders
- `.gitignore`

**Recommendation**:

- Add `dist/` to `.gitignore`
- Remove existing build artifacts from git
- Add build artifact cleanup scripts

**Impact**: Low (Reduces repository size)

---

### 45. **Add Version Management** (Rank: 4)

**Issue**: No consistent version management

- Hardcoded version strings
- No changelog
- No semantic versioning

**Files affected**:

- Various package.json files

**Recommendation**:

- Add semantic versioning
- Add changelog generation
- Add version management automation

**Impact**: Low (Improves release management)

---

# 🔍 DEEP DIVE: Webapp Package Analysis

The webapp package reveals significant opportunities for improvement in **CSS organization, shared components, React patterns, Tanstack React Query usage, and accessibility**. This section provides a detailed analysis of these areas.

---

## 🎨 CSS AND STYLING IMPROVEMENTS

### Current State Analysis

**CSS Architecture:**
- **55 module CSS files** scattered across components and features
- No centralized design system or CSS variables/tokens
- Hardcoded colors repeated throughout (e.g., `#1f313c`, `#e8ce7d`, `#7b520033`)
- Inconsistent color usage (opacity values vary: `11`, `22`, `33`, `55`, `66`)
- Mix of global styles (`app.css`) and module styles

**Global Styles:**
- `app.css` contains base styles for form elements, inputs, selects, checkboxes, radios
- Custom focus states using `:focus-visible` 
- Custom styling for native form controls (removing default appearance)
- Some duplicate declarations (e.g., color values overridden)

**Component Styles:**
- Each component has its own `.module.css` file
- No consistent naming convention for CSS classes
- Some CSS files are quite large (up to 299 lines)
- Inconsistent spacing, color usage, and design patterns

### 46. **Create Design System with CSS Variables** (Rank: 2)

**Issue**: No design tokens or CSS variables, leading to inconsistent styling and hard-to-maintain colors

**Current Problems**:
- Color `#1f313c` appears in multiple opacity variants across files
- Same colors defined in different formats (hex vs rgba)
- No semantic color naming (primary, secondary, error, etc.)
- Difficult to theme or change color scheme

**Files affected**:
- `apps/webapp/src/app.css`
- All `.module.css` files in components and features

**Recommendation**:

1. **Create CSS variables in `:root`** for all colors:

```css
:root {
  /* Primary colors */
  --color-primary-900: #1f313c;
  --color-primary-800: #2a4250;
  --color-primary-700: #355364;
  
  /* Secondary colors */
  --color-secondary-900: #7b5200;
  --color-secondary-800: #956500;
  
  /* Accent colors */
  --color-accent-400: #e8ce7d;
  --color-accent-300: #f0d890;
  
  /* Background colors */
  --color-background: #fef8eb;
  --color-background-secondary: #1f313c11;
  
  /* Text colors */
  --color-text-primary: #1f313c;
  --color-text-secondary: #666;
  
  /* Opacity utilities */
  --opacity-low: 0.07;    /* ~11 in hex */
  --opacity-medium: 0.13; /* ~22 in hex */
  --opacity-high: 0.2;    /* ~33 in hex */
  --opacity-higher: 0.33; /* ~55 in hex */
  --opacity-highest: 0.4;  /* ~66 in hex */
}
```

2. **Create design tokens for spacing, typography, shadows, etc.**
3. **Replace hardcoded colors** with CSS variables throughout
4. **Document the design system** in a `DESIGN_SYSTEM.md` file

**Impact**: High (Improves maintainability, consistency, theming)

---

### 47. **Standardize CSS Naming Conventions** (Rank: 3)

**Issue**: Inconsistent CSS class naming across components

**Current Problems**:
- No clear naming pattern (BEM, utility classes, etc.)
- Some classes use kebab-case, others camelCase
- No consistent prefixing for component-scoped styles
- Difficult to understand relationships between classes

**Files affected**:
- All `.module.css` files

**Recommendation**:

1. **Adopt a naming convention** (e.g., BEM-like):
   - Component root: `component-name`
   - Elements: `component-name__element`  
   - Modifiers: `component-name__element--modifier`
   - States: `is-active`, `is-loading`, `has-error`

2. **Create CSS naming guidelines**
3. **Add linting for CSS class names**

**Example improvement**:
```css
/* Before */
.play {
  /* ... */
}
.playTitle {
  /* ... */
}

/* After */
.play-list-item {
  /* ... */
}
.play-list-item__title {
  /* ... */
}
```

**Impact**: Medium (Improves code readability and maintainability)

---

### 48. **CSS Organization and File Structure** (Rank: 3)

**Issue**: Large CSS files and inconsistent organization

**Current Problems**:
- Some CSS files exceed 200+ lines (`script-line.module.css`: 299 lines)
- Related styles are scattered across multiple files
- No separation of concerns (layout vs styling vs themes)
- Duplicate styles across different components

**Files affected**:
- Large `.module.css` files throughout the app

**Recommendation**:

1. **Split large CSS files** into smaller, focused modules
2. **Create shared CSS utilities** for common patterns
3. **Organize CSS by concern**:
   - Layout (grid, flex, positioning)
   - Typography (font, text styles)
   - Colors and themes
   - Animations
   - Utility classes

4. **Consider CSS-in-JS** for dynamic styling needs

**Impact**: Medium (Improves maintainability and organization)

---

### 49. **Add CSS Linting** (Rank: 3)

**Issue**: No CSS quality control or linting

**Current Problems**:
- No consistent property ordering
- No detection of duplicate properties
- No validation of color formats
- No detection of unused classes

**Recommendation**:

1. **Add Stylelint** with appropriate configuration
2. **Configure rules for**:
   - Property ordering (alphabetical or logical groups)
   - Color format consistency (prefer hex vs rgb vs hsl)
   - Duplicate property detection
   - Empty rule detection
   - Selector specificity limits

3. **Integrate with existing ESLint setup**

**Impact**: Medium (Improves code quality and consistency)

---

### 50. **Fix CSS Duplication and Specificity Issues** (Rank: 3)

**Issue**: Duplicate styles and high specificity causing maintenance issues

**Current Problems**:
- Same styles repeated across multiple components
- Overly specific selectors making styles hard to override
- !important usage in some places

**Files affected**:
- Various `.module.css` files with duplicated styles

**Recommendation**:

1. **Audit and remove duplicate styles**
2. **Extract common patterns to shared CSS modules**
3. **Keep specificity low** - prefer class selectors over element+class
4. **Avoid !important** - use proper specificity instead

**Impact**: Medium (Reduces CSS bloat, improves maintainability)

---

## 🧩 SHARED COMPONENTS IMPROVEMENTS

### Current State Analysis

**Current Shared Components** (in `src/components/`):
- `global-spinner.component.tsx`
- `skeleton.component.tsx` (with `skeleton.module.css`)
- `unexpected-error.component.tsx` (with `unexpected-error.module.css`)
- `page-not-found.component.tsx` (with `page-not-found.module.css`)
- `menubar.component.tsx` (with `menubar.module.css`)
- `tabs.component.tsx` (with `tabs.module.css`)
- `notifications.context.tsx` (with `notifications-panel.module.css`)
- `dots-loader.component.tsx` (with `dots-loader.module.css`)
- `toolbar.component.tsx` (with `toolbar.module.css`)
- `toggle-button.component.tsx` (with `toggle-button.module.css`)
- `icon.component.tsx` (with `icon.module.css`)

**Shared UI Package** (`packages/ui/`):
- Currently contains only demo components (`CounterButton`, `Link`)
- Not being used effectively in the main webapp

### 51. **Expand Shared UI Component Library** (Rank: 2)

**Issue**: Many common UI patterns are duplicated across features instead of being shared

**Current Problems**:
- Loading states implemented differently in each feature
- Form controls and inputs duplicated
- Dialogs and modals custom-built for each use case
- Buttons and interactive elements inconsistent

**Files affected**:
- Various feature components with duplicated patterns

**Recommendation**:

1. **Identify common patterns** across the app:
   - Loading spinners and skeletons
   - Form inputs (text, select, checkbox, radio)
   - Buttons (primary, secondary, icon buttons)
   - Dialogs and modals
   - Tooltips and popovers
   - Cards and containers
   - Tables and lists

2. **Create reusable, accessible components** in `src/components/` or `packages/ui/`
3. **Document component props and usage**
4. **Add Storybook** for component documentation and testing

**Example components to create**:
```tsx
// Button component with variants
<Button variant="primary" size="medium" onClick={handleClick}>
  Save
</Button>

// Form input with label and error handling
<Input 
  label="Email" 
  value={email} 
  onChange={setEmail}
  error={emailError}
/>

// Dialog/Modal component
<Dialog open={isOpen} onClose={handleClose} title="Confirm Action">
  <p>Are you sure?</p>
  <Button onClick={handleConfirm}>Yes</Button>
</Dialog>
```

**Impact**: High (Reduces duplication, improves consistency, better DX)

---

### 52. **Improve Shared UI Package Utilization** (Rank: 3)

**Issue**: The `packages/ui` workspace package is underutilized

**Current Problems**:
- Only contains demo/tutorial components
- Not integrated with the main webapp
- Missing build and distribution setup
- No clear purpose or scope

**Files affected**:
- `packages/ui/` directory
- Main webapp component usage

**Recommendation**:

1. **Define scope** for the shared UI package:
   - Core UI primitives (Button, Input, etc.)
   - Design system components
   - Shared hooks and utilities

2. **Set up proper build configuration**
3. **Integrate with main webapp**
4. **Move appropriate components** from webapp to shared package
5. **Add proper TypeScript exports**

**Impact**: Medium (Better code organization, reusability across apps)

---

### 53. **Standardize Component Props and API** (Rank: 3)

**Issue**: Inconsistent component prop interfaces and APIs

**Current Problems**:
- Some components use explicit prop types, others don't
- Inconsistent naming (e.g., `onToggle` vs `onChange`)
- Mixed required/optional prop patterns
- No consistent pattern for event handlers

**Files affected**:
- All component files in `src/components/`

**Recommendation**:

1. **Create component prop guidelines**:
   - Use TypeScript interfaces for all props
   - Consistent naming conventions
   - Consistent event handler signatures
   - Proper default values and optional/required markers

2. **Standardize common patterns**:
   - `onChange` for form inputs
   - `onClick` for buttons
   - `value`/`onChange` pattern for controlled components
   - `className` prop for additional styling

3. **Add prop validation** with TypeScript

**Impact**: Medium (Improves developer experience and consistency)

---

### 54. **Add Component Testing** (Rank: 3)

**Issue**: No component unit tests

**Current Problems**:
- No tests for shared components
- No way to verify component behavior changes
- Risk of regressions in UI

**Files affected**:
- All component files

**Recommendation**:

1. **Add Jest + React Testing Library** setup
2. **Write tests for all shared components**:
   - Render tests
   - Interaction tests
   - Accessibility tests
   - Prop validation tests

3. **Add Storybook** for visual regression testing
4. **Integrate with CI/CD** pipeline

**Impact**: Medium (Improves reliability and maintainability)

---

### 55. **Component Performance Optimization** (Rank: 3)

**Issue**: Components may have unnecessary re-renders and performance issues

**Current Problems**:
- No `React.memo` usage for pure components
- No `useMemo`/`useCallback` for expensive operations
- Large components that could be split
- Potential prop drilling issues

**Files affected**:
- Various component files

**Recommendation**:

1. **Profile components** with React DevTools
2. **Add `React.memo`** for pure presentational components
3. **Use `useMemo`/`useCallback`** for expensive computations
4. **Split large components** into smaller ones
5. **Avoid prop drilling** with Context or component composition

**Impact**: Medium (Improves performance, reduces unnecessary renders)

---

## ⚛️ REACT-SPECIFIC IMPROVEMENTS

### Current State Analysis

**React Version**: 19.2.6 (latest)
**TypeScript**: 5.9.3
**Features Used**:
- Functional components with hooks
- TypeScript typing
- Context API
- Custom hooks
- React Router 7.15.0
- Clerk authentication

**Current Patterns**:
- Feature-based organization
- Custom hooks in `src/lib/`
- Context providers for shared state
- TypeScript interfaces for props
- Some components use `.component.tsx` suffix, others don't

### 56. **Improve React Project Organization** (Rank: 3)

**Issue**: Inconsistent project structure and organization

**Current Problems**:
- Mixed `.component.tsx` and `.tsx` naming
- Some features have dedicated folders, others don't
- Large files with mixed concerns
- No consistent pattern for co-located tests/styles

**Files affected**:
- All React files in `src/`

**Recommendation**:

1. **Standardize file naming**:
   - Use `.component.tsx` consistently for all React components
   - Use `.hook.ts` for custom hooks
   - Use `.context.tsx` for Context providers
   - Use `.lib.ts` for utility functions

2. **Consistent folder structure**:
   ```
   features/feature-name/
   ├── feature-name.component.tsx
   ├── feature-name.module.css
   ├── feature-name.lib.ts
   ├── feature-name.context.tsx
   ├── feature-name.hooks.ts
   └── index.ts (barrel exports)
   ```

3. **Add barrel exports** for easier imports
4. **Split large files** into smaller, focused modules

**Impact**: Medium (Improves code organization and discoverability)

---

### 57. **Enhance TypeScript Usage** (Rank: 3)

**Issue**: Inconsistent TypeScript usage and typing

**Current Problems**:
- Some components have comprehensive typing, others minimal
- Some files lack proper TypeScript imports
- Inconsistent type naming conventions
- Some complex types could be better organized

**Files affected**:
- Various React component files

**Recommendation**:

1. **Add comprehensive typing** to all components and hooks
2. **Create shared type definitions** for common patterns
3. **Use TypeScript utility types** effectively:
   - `React.PropsWithChildren<T>`
   - `React.ComponentProps<T>`
   - `Omit<T, K>`, `Pick<T, K>`
   - Template literal types for strings

4. **Add proper return types** to all functions
5. **Use type guards** for runtime validation

**Impact**: Medium (Improves type safety and developer experience)

---

### 58. **Improve Custom Hooks Organization** (Rank: 3)

**Issue**: Custom hooks are scattered and could be better organized

**Current Problems**:
- Hooks in `src/lib/` mixed with utilities
- Some hooks are feature-specific
- No consistent naming convention
- No documentation

**Files affected**:
- `src/lib/use-background-sync.ts`
- `src/lib/use-trpc-background-sync.ts`
- `src/lib/use-network-status-notifier.ts`

**Recommendation**:

1. **Create dedicated hooks directory**:
   ```
   src/hooks/
   ├── use-background-sync.ts
   ├── use-trpc-background-sync.ts  
   ├── use-network-status.ts
   ├── use-local-storage.ts
   └── index.ts
   ```

2. **Standardize hook naming**: `useXxx` pattern
3. **Add comprehensive documentation** for each hook
4. **Create reusable hooks** for common patterns:
   - `useLocalStorage`
   - `useDebounce`
   - `usePrevious`
   - `useToggle`
   - `useFetch`

**Impact**: Medium (Improves code organization and reusability)

---

### 59. **Improve Error Handling in Components** (Rank: 3)

**Issue**: Inconsistent error handling across React components

**Current Problems**:
- Some components handle errors gracefully
- Others show raw errors or crash
- No consistent error boundary pattern
- Missing error reporting

**Files affected**:
- Various component files

**Recommendation**:

1. **Create shared error handling components**:
   - `ErrorBoundary` component
   - `ErrorDisplay` component
   - `LoadingError` component

2. **Add error boundaries** at appropriate levels
3. **Standardize error display** patterns
4. **Add error reporting** to monitoring services
5. **Handle network errors** gracefully

**Example ErrorBoundary**:
```tsx
class ErrorBoundary extends React.Component<{
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
}, { hasError: boolean; error?: Error }> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error);
    // Log to error tracking service
    logError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorDisplay error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

**Impact**: Medium (Improves reliability and user experience)

---

### 60. **Add React Performance Optimizations** (Rank: 3)

**Issue**: Potential performance issues in React components

**Current Problems**:
- No performance profiling done
- No memoization in many places
- Large render methods
- Potential unnecessary re-renders

**Recommendation**:

1. **Profile with React DevTools** to identify bottlenecks
2. **Add `React.memo`** to pure components
3. **Use `useMemo`/`useCallback`** for expensive operations
4. **Implement virtualization** for large lists (react-window)
5. **Optimize images** with lazy loading
6. **Code split** large bundles

**Impact**: Medium (Improves application performance)

---

### 61. **Improve State Management** (Rank: 3)

**Issue**: Mixed state management approaches without clear guidelines

**Current Problems**:
- Local component state for simple cases
- Context API for shared state
- No clear pattern for complex state
- Potential state synchronization issues

**Recommendation**:

1. **Define state management guidelines**:
   - **Local state**: `useState`, `useReducer` for component-level
   - **Shared state**: Context API for app-wide state
   - **Server state**: Tanstack Query for data fetching
   - **Complex state**: Consider Zustand or similar for complex scenarios

2. **Create reusable state management patterns**
3. **Document state management architecture**
4. **Add state synchronization** helpers where needed

**Impact**: Medium (Improves consistency and maintainability)

---

## 🔄 TANSTACK REACT QUERY IMPROVEMENTS

### Current State Analysis

** Tanstack React Query Version**: ^5.100.10 (latest)
**tRPC Integration**: Using `@trpc/tanstack-react-query` adapter

**Current Usage Patterns**:
- Direct usage of `useQuery` and `useMutation` from `@tanstack/react-query`
- tRPC integration via `trpc.plays.list.queryOptions()` pattern
- Custom QueryClient setup with error handling
- Background sync integration

**Query Client Configuration** (from `app.tsx`):
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof TRPCClientError && error.data.code === 'NOT_FOUND') {
          return false;
        }
        return failureCount < 4;
      },
      staleTime: 60 * 1000, // 1 minute
    },
  },
});
```

### 62. **Optimize Query Client Configuration** (Rank: 2)

**Issue**: Query client configuration could be more comprehensive

**Current Problems**:
- Only basic retry logic for NOT_FOUND errors
- Generic staleTime (1 minute) for all queries
- No global error handling
- No query caching strategy
- No offline support

**Files affected**:
- `apps/webapp/src/app.tsx`

**Recommendation**:

1. **Create comprehensive QueryClient configuration**:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors except specific cases
        if (error instanceof TRPCClientError) {
          if (error.data.code === 'NOT_FOUND') return false;
          if (error.data.code === 'UNAUTHORIZED') return false;
          if (error.data.code === 'BAD_REQUEST') return false;
        }
        // Retry on network errors and 5xx errors
        return failureCount < 3;
      },
      staleTime: Infinity, // Data is always fresh from server
      gcTime: 10 * 60 * 1000, // Cache garbage collection after 10 minutes
      refetchOnWindowFocus: false, // Disable automatic refetch on focus
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchOnMount: true, // Refetch stale data on mount
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry mutations that failed due to validation
        if (error instanceof TRPCClientError && error.data.code === 'BAD_REQUEST') {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});
```

2. **Add global error handling** with custom error boundaries
3. **Configure query caching** based on data volatility
4. **Add offline support** with persistence

**Impact**: High (Improves data fetching reliability and performance)

---

### 63. **Create Custom Query Hooks** (Rank: 3)

**Issue**: Repetitive query patterns across the application

**Current Problems**:
- Same query options repeated in multiple components
- No shared patterns for common queries
- Inconsistent error handling across queries
- No standardization for loading states

**Files affected**:
- Multiple component files using `useQuery` and `useMutation`

**Recommendation**:

1. **Create custom query hooks** for common patterns:

```typescript
// Custom hook for plays queries
export function usePlaysQuery() {
  const trpc = useTRPC();
  
  return useQuery({
    ...trpc.plays.list.queryOptions(),
    // Custom error handling
    onError: (error) => {
      console.error('Failed to load plays:', error);
      // Show user-friendly error message
    },
    // Custom placeholder data for better UX
    placeholderData: { plays: [], invites: [] },
  });
}

// Custom hook for mutations with optimistic updates
export function useUpdatePlayMutation() {
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  
  return useMutation({
    ...trpc.plays.update.mutationOptions(),
    onMutate: async (newPlay) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({ queryKey: ['plays'] });
      
      // Snapshot previous data
      const previousPlays = queryClient.getQueryData(['plays']);
      
      // Optimistically update
      queryClient.setQueryData(['plays'], (old) => {
        // Update logic
      });
      
      return { previousPlays };
    },
    onError: (err, newPlay, context) => {
      // Rollback on error
      queryClient.setQueryData(['plays'], context?.previousPlays);
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['plays'] });
    },
  });
}
```

2. **Document custom hook patterns**
3. **Standardize usage across the app**

**Impact**: High (Reduces boilerplate, improves consistency)

---

### 64. **Add Query Caching and Invalidations** (Rank: 3)

**Issue**: Inconsistent caching and cache invalidation patterns

**Current Problems**:
- Some queries manually refetch after mutations
- No consistent cache invalidation strategy
- Potential stale data issues
- No shared cache keys strategy

**Files affected**:
- Multiple component files with query/mutation usage

**Recommendation**:

1. **Define cache key strategy**:
   - Use consistent query keys across the app
   - Group related queries under common prefixes
   - Use factory functions for complex query keys

2. **Add cache invalidation patterns**:
   - Invalidate queries after mutations
   - Use query tags for easier invalidation
   - Implement optimistic updates where appropriate

3. **Create caching utilities**:

```typescript
// Query key factory
export const playKeys = {
  all: ['plays'] as const,
  lists: () => [...playKeys.all, 'list'] as const,
  detail: (id: string) => [...playKeys.all, 'detail', id] as const,
  // ...
};

// Cache invalidation utility
export function invalidatePlayQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: playKeys.all });
}
```

**Impact**: Medium (Improves data consistency and performance)

---

### 65. **Improve Loading and Error States** (Rank: 3)

**Issue**: Inconsistent handling of loading and error states

**Current Problems**:
- Different loading patterns in different components
- Error handling varies by component
- No consistent user experience for data loading
- Some components don't handle all query states

**Files affected**:
- Multiple component files using queries

**Recommendation**:

1. **Create standardized loading components**:
   - `LoadingSpinner`
   - `LoadingSkeleton`
   - `LoadingOverlay`

2. **Create standardized error components**:
   - `QueryError` for query errors
   - `MutationError` for mutation errors
   - `NetworkError` for connectivity issues

3. **Create query state utilities**:

```typescript
// Custom hook for better query state handling
export function useQueryStates<TData, TError>(
  query: UseQueryResult<TData, TError>
) {
  const { data, error, isLoading, isError, isSuccess, isFetching } = query;
  
  return {
    data,
    error,
    isLoading,
    isError,
    isSuccess,
    isFetching,
    // Helper states
    isEmpty: isSuccess && !data,
    hasData: isSuccess && !!data,
    isIdle: !isLoading && !isFetching && !isError && !isSuccess,
    // Error helpers
    errorMessage: error?.message,
    isNetworkError: error instanceof Error && 'fetch' in error,
  };
}
```

4. **Standardize loading/error UX** across the app

**Impact**: Medium (Improves user experience and consistency)

---

### 66. **Add Query Prefetching and Preloading** (Rank: 3)

**Issue**: No query prefetching or preloading for better user experience

**Current Problems**:
- No prefetching on hover or for next pages
- No preloading of critical data
- Potential delays when navigating

**Recommendation**:

1. **Add prefetching for navigation**:
   - Prefetch play data when hovering over play links
   - Prefetch user data on auth state changes
   - Prefetch import status when navigating to imports page

2. **Add preloading for critical data**:
   - Preload user plays on app mount
   - Preload current user data
   - Preload app configuration

3. **Use React Router integration**:

```typescript
// Prefetch on route hover
<Link 
  to={`/plays/${playId}`}
  onMouseEnter={() => {
    queryClient.prefetchQuery(
      trpc.plays.detail.queryOptions({ id: playId })
    );
  }}
>
  {play.title}
</Link>

// Preload data on route entry
const loader = async ({ params }: LoaderArgs) => {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery(
    trpc.plays.detail.queryOptions({ id: params.playId })
  );
  return { queryClient };
};
```

**Impact**: Medium (Improves perceived performance)

---

### 67. **Add Query Analytics and Monitoring** (Rank: 3)

**Issue**: No visibility into query performance and usage

**Current Problems**:
- No tracking of query execution times
- No monitoring of query errors
- No analytics on query usage patterns
- No visibility into cache hit/miss ratios

**Recommendation**:

1. **Add query logging** for development:
   - Log slow queries
   - Log query errors
   - Log cache operations

2. **Add query analytics** for production:
   - Track query execution times
   - Monitor error rates
   - Track cache effectiveness
   - Track user interactions

3. **Integrate with monitoring tools**:
   - Send query metrics to analytics services
   - Add error tracking
   - Add performance monitoring

**Impact**: Medium (Improves observability and debugging)

---

## ♿ ACCESSIBILITY IMPROVEMENTS

### Current State Analysis

**Accessibility Audit Results**:
- **No ARIA attributes** found in initial scan
- **No role attributes** found in initial scan  
- **Minimal semantic HTML** usage
- **Keyboard navigation** partially implemented (ToggleButton has keyboard support)
- **Focus management** inconsistently implemented
- **Color contrast** not systematically verified
- **Screen reader** support not considered

### 68. **Add ARIA Attributes and Roles** (Rank: 2)

**Issue**: Missing ARIA attributes for accessibility

**Current Problems**:
- No `aria-label`, `aria-describedby`, `aria-live` regions
- No proper roles for interactive elements (`role="button"`, etc.)
- No state attributes (`aria-expanded`, `aria-pressed`, etc.)
- No landmark roles for page structure

**Files affected**:
- All React component files

**Recommendation**:

1. **Add ARIA attributes** to all interactive elements:

```tsx
// Button with ARIA
<button 
  aria-label="Save changes"
  aria-describedby="save-help"
  aria-pressed={isPressed}
  aria-disabled={isDisabled}
>
  Save
</button>

// Toggle button with proper ARIA
export function ToggleButton(props: ToggleButtonProps) {
  const [toggled, setToggled] = useState(props.value);
  
  return (
    <label
      className={styles.switch}
      tabIndex={0}
      onKeyUp={handleKeyUp}
      onKeyDown={handleKeyDown}
      role="switch"
      aria-checked={toggled}
      aria-label={props.label}
    >
      <input
        type="checkbox"
        onChange={handleChange}
        ref={checkboxRef}
        checked={toggled}
        aria-hidden="true"
      />
      <span className={styles.slider} aria-hidden="true"></span>
      <span className={styles.labelText}>{props.label}</span>
    </label>
  );
}
```

2. **Add landmark roles** for page structure:
   - `role="main"` for main content
   - `role="navigation"` for nav sections
   - `role="region"` for content sections
   - `role="banner"` for header
   - `role="contentinfo"` for footer

3. **Add ARIA live regions** for dynamic content:
   - `aria-live="polite"` for status updates
   - `aria-live="assertive"` for important notifications

**Impact**: High (Critical for screen reader users)

---

### 69. **Improve Keyboard Navigation** (Rank: 2)

**Issue**: Inconsistent keyboard support

**Current Problems**:
- Only some components have keyboard handlers (ToggleButton)
- No consistent focus management
- No visible focus indicators in some places
- Missing keyboard shortcuts for common actions

**Files affected**:
- All interactive component files

**Recommendation**:

1. **Ensure all interactive elements are keyboard accessible**:
   - All buttons, links, inputs must be focusable
   - Add keyboard handlers for custom components
   - Ensure logical tab order

2. **Add comprehensive keyboard support**:
   - Space/Enter for buttons
   - Arrow keys for menus/dropdowns
   - Escape for modals/dialogs
   - Tab for navigation

3. **Add focus management**:
   - Focus trap for modals
   - Focus restoration after modal close
   - Skip links for main content

4. **Ensure visible focus indicators**:
   - Consistent `:focus-visible` styles
   - High contrast focus states
   - Custom focus styles for all interactive elements

**Example keyboard improvements**:
```tsx
// Enhanced ToggleButton with better keyboard support
export function ToggleButton(props: ToggleButtonProps) {
  const [toggled, setToggled] = useState(props.value);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const handleClick = () => {
    const newValue = !toggled;
    setToggled(newValue);
    props.onToggle(newValue);
  };
  
  const handleKeyDown: KeyboardEventHandler = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };
  
  return (
    <button
      ref={buttonRef}
      className={styles.switch}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="switch"
      aria-checked={toggled}
      aria-label={props.label}
      tabIndex={0}
    >
      <span className={styles.slider} aria-hidden="true"></span>
      <span className={styles.labelText}>{props.label}</span>
    </button>
  );
}
```

**Impact**: High (Critical for keyboard-only users)

---

### 70. **Improve Semantic HTML Usage** (Rank: 3)

**Issue**: Overuse of div elements instead of semantic HTML

**Current Problems**:
- Navigation built with divs instead of `<nav>`
- Lists built with divs instead of `<ul>`/`<ol>`/`<li>`
- Buttons built with divs instead of `<button>`
- Links built with divs instead of `<a>`
- Headings hierarchy not consistently used

**Files affected**:
- All component files, especially layout and list components

**Recommendation**:

1. **Use semantic HTML elements**:
   - `<nav>` for navigation sections
   - `<ul>`, `<ol>`, `<li>` for lists
   - `<button>` for interactive buttons
   - `<a>` for links and navigation
   - Proper heading hierarchy (`<h1>` to `<h6>`)

2. **Fix existing semantic issues**:

```tsx
// Before - div-based list
<div className={styles.plays}>
  {plays.map(play => (
    <div key={play.id} className={styles.play}>
      <div className={styles.playTitle}>{play.title}</div>
    </div>
  ))}
</div>

// After - semantic list
<ul className={styles.plays} role="list">
  {plays.map(play => (
    <li key={play.id} className={styles.play} role="listitem">
      <h3 className={styles.playTitle}>{play.title}</h3>
    </li>
  ))}
</ul>
```

3. **Ensure proper heading hierarchy** throughout the app

**Impact**: Medium (Improves SEO and screen reader navigation)

---

### 71. **Add Focus Management** (Rank: 3)

**Issue**: Missing focus management for dynamic content and navigation

**Current Problems**:
- Focus not returned to trigger after modal close
- Focus not moved to newly revealed content
- No focus trap for modals
- No skip links for main content

**Recommendation**:

1. **Add focus management utilities**:

```typescript
// Focus management hook
export function useFocusTrap(ref: RefObject<HTMLElement>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    
    const element = ref.current;
    if (!element) return;
    
    const focusableElements = element.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };
    
    element.addEventListener('keydown', handleTabKey);
    firstElement?.focus();
    
    return () => element.removeEventListener('keydown', handleTabKey);
  }, [active, ref]);
}

// Focus restoration utility
export function useRestoreFocus() {
  const lastFocusedRef = useRef<Element | null>(null);
  
  const saveFocus = useCallback(() => {
    lastFocusedRef.current = document.activeElement;
  }, []);
  
  const restoreFocus = useCallback(() => {
    if (lastFocusedRef.current instanceof HTMLElement) {
      lastFocusedRef.current.focus();
    }
  }, []);
  
  return { saveFocus, restoreFocus };
}
```

2. **Add focus trap** to modal components
3. **Restore focus** after modal close
4. **Add skip links** for keyboard users

**Impact**: Medium (Improves keyboard navigation experience)

---

### 72. **Improve Color Contrast and Accessibility** (Rank: 3)

**Issue**: Color contrast may not meet accessibility standards

**Current Problems**:
- No systematic color contrast verification
- Some color combinations may not meet WCAG standards
- No dark mode support
- No user preference detection

**Recommendation**:

1. **Verify color contrast** for all text and interactive elements:
   - Use tools like WebAIM Contrast Checker
   - Ensure minimum 4.5:1 contrast for normal text
   - Ensure minimum 3:1 contrast for large text
   - Ensure interactive elements have visible focus states

2. **Add color contrast testing** to CI/CD pipeline
3. **Consider dark mode** support
4. **Respect user preferences**:
   - Detect `prefers-color-scheme`
   - Detect `prefers-reduced-motion`
   - Detect `prefers-contrast`

```css
/* Respect user preferences */
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #1a1a1a;
    --color-text-primary: #ffffff;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Impact**: Medium (Improves accessibility for users with visual impairments)

---

### 73. **Add Screen Reader Support** (Rank: 3)

**Issue**: Missing screen reader-specific features

**Current Problems**:
- No screen reader-only content
- No proper labeling for icons
- No context for interactive elements
- No announcements for dynamic changes

**Recommendation**:

1. **Add screen reader-only styles**:

```css
/* Screen reader only utility */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

2. **Add proper icon labels**:

```tsx
// Icon with screen reader label
<Icon name="edit" aria-hidden="true" />
<span className="sr-only">Edit</span>

// Or with aria-label
<button aria-label="Edit item">
  <Icon name="edit" aria-hidden="true" />
</button>
```

3. **Add announcements for dynamic changes**:

```tsx
// Announcement component for screen readers
export function Announce({ message, politeness = 'polite' }: {
  message: string;
  politeness?: 'polite' | 'assertive';
}) {
  return (
    <div 
      role="status" 
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
```

4. **Add proper form labels and descriptions**:

```tsx
// Properly labeled form input
<label htmlFor="email">
  Email Address
  <input 
    id="email" 
    type="email"
    aria-describedby="email-help email-error"
  />
  <span id="email-help" className="sr-only">
    Enter your email address
  </span>
  <span id="email-error" aria-live="polite">
    {error}
  </span>
</label>
```

**Impact**: Medium (Improves screen reader compatibility)

---

### 74. **Add Accessibility Testing** (Rank: 3)

**Issue**: No accessibility testing in place

**Current Problems**:
- No automated accessibility checks
- No manual accessibility testing process
- No accessibility audit tools integrated

**Recommendation**:

1. **Add automated accessibility testing**:
   - **jest-axe**: Accessibility testing with Jest
   - **eslint-plugin-jsx-a11y**: ESLint rules for accessibility
   - **pa11y**: Automated accessibility testing

2. **Configure ESLint accessibility rules**:

```json
{
  "extends": [
    "plugin:jsx-a11y/recommended"
  ],
  "rules": {
    "jsx-a11y/alt-text": "error",
    "jsx-a11y/anchor-is-valid": "error",
    "jsx-a11y/aria-props": "error",
    "jsx-a11y/aria-role": "error",
    "jsx-a11y/click-events-have-key-events": "error",
    "jsx-a11y/heading-has-content": "error",
    "jsx-a11y/img-redundant-alt": "error",
    "jsx-a11y/label-has-associated-control": "error",
    "jsx-a11y/mouse-events-have-key-events": "error",
    "jsx-a11y/no-access-key": "warn",
    "jsx-a11y/no-autofocus": "warn",
    "jsx-a11y/no-distracting-elements": "error",
    "jsx-a11y/no-redundant-roles": "error",
    "jsx-a11y/role-has-required-aria-props": "error",
    "jsx-a11y/role-supports-aria-props": "error",
    "jsx-a11y/scope": "warn"
  }
}
```

3. **Add manual accessibility testing**:
   - Keyboard-only navigation testing
   - Screen reader testing (NVDA, VoiceOver, JAWS)
   - Color contrast verification
   - Zoom and text resize testing

4. **Add accessibility checks to CI/CD**:
   - Run accessibility tests on every PR
   - Block PRs with accessibility violations
   - Generate accessibility reports

**Impact**: Medium (Improves overall accessibility quality)

---

### 75. **Create Accessibility Guidelines** (Rank: 3)

**Issue**: No accessibility standards or guidelines for developers

**Recommendation**:

1. **Create ACCESSIBILITY.md** with comprehensive guidelines:
   - WCAG compliance requirements
   - Color contrast standards
   - Keyboard navigation requirements
   - Screen reader requirements
   - Testing procedures
   - Common patterns and examples

2. **Add accessibility checklist** for code reviews
3. **Provide accessibility training** for developers
4. **Establish accessibility review process**

**Impact**: Medium (Improves team awareness and consistency)

---

## 📊 Component Summary

## API Component: 18 Improvements

- **Critical**: 2 (Security: env vars, authentication)
- **High**: 5 (Error handling, DB connection, storage duplication, tRPC client, route org)
- **Medium**: 6 (Code org, domain org, use case interface, providers, API docs, request ID)
- **Low**: 2 (Rate limiting, more unit tests)

## Webapp Component: 39 Improvements

- **Critical**: 2 (Authentication validation, Local persistence)
- **High**: 7 (Design system, shared components, Query client config, custom query hooks, ARIA attributes, keyboard navigation, Query client)
- **Medium**: 24 (CSS naming, CSS org, CSS linting, CSS duplication, component testing, component performance, React org, TypeScript usage, hooks org, error handling, performance, state management, cache invalidations, loading states, prefetching, query analytics, semantic HTML, focus management, color contrast, screen reader support, accessibility testing, accessibility guidelines)
- **Low**: 7 (React improvements inherited, plus webapp-specific low priority items)

## Missing Features: 14 Critical Gaps

- **Critical**: 4 (Data persistence, Server write endpoints, Real-time collaboration, Conflict resolution)
- **High**: 6 (Staging directions completion, Planning feature completion, Versioning system, Import/export functionality, Character management, PWA/offline support)
- **Medium**: 4 (Search functionality, Role-based permissions, Permission system cleanup, Placeholder feature cleanup)

## Worker Component: 8 Improvements

- **Critical**: 2 (S3 credentials, Mistral API key)
- **High**: 3 (Job error handling, parser robustness, configuration)
- **Medium**: 2 (Code quality, config management)
- **Low**: 1 (More tests)

## Storefront Component: 1 Improvement

- **Medium**: 1 (Content management)

## Shared Packages: 3 Improvements

- **Medium**: 2 (Version management, package organization)
- **Low**: 1 (Code review guidelines)

## Infrastructure: 8 Improvements

- **High**: 2 (Docker config, health checks)
- **Medium**: 4 (Docker compose, CI/CD, monitoring, scaling)
- **Low**: 2 (Backup strategy, build optimization)

## Documentation: 5 Improvements

- **Medium**: 1 (Shared package organization)
- **Low**: 4 (Architecture docs, development docs, API examples, contribution guidelines)

---

# 🎯 Recommended Action Plan

## Phase 0: BLOCKER - Data Persistence & Core Features (Week 1-2) 🚨

**MUST FIX BEFORE ANYTHING ELSE - Application cannot be used without these**

1. ✅ **FIX DATA PERSISTENCE** - Add localStorage persistence for script edits
2. ✅ **CREATE SERVER WRITE ENDPOINTS** - Add API mutations for saving script data
3. ✅ **IMPLEMENT LOCAL-SERVER SYNC** - Sync local changes to server automatically
4. ✅ **ADD CONFLICT RESOLUTION** - Basic version checking to prevent data loss

## Phase 1: Critical Security Fixes (Week 3)

1. ✅ Remove all secrets from version control
2. ✅ Implement proper secrets management
3. ✅ Add authentication validation to worker routes
4. ✅ Add rate limiting to API

## Phase 2: High Priority Improvements (Week 3-4)

1. ✅ Standardize error handling across API
2. ✅ Improve database connection management
3. ✅ Consolidate storage service implementations
4. ✅ Fix tRPC client implementation in worker
5. ✅ Add proper job error handling in worker
6. ✅ Improve Mistral parser robustness
7. ✅ Optimize Docker configurations
8. ✅ Add health check endpoints

## Phase 2b: Critical Features Implementation (Week 4-6) 🚨

1. ✅ **IMPLEMENT VERSION CONTROL** - Add script versioning and history
2. ✅ **ADD COLLABORATION FEATURES** - WebSocket infrastructure and real-time sync
3. ✅ **COMPLETE STAGING DIRECTIONS** - Implement all staging tabs (Characters, Props, etc.)
4. ✅ **COMPLETE BLOCKING FEATURE** - Add visual stage layout and blocking tools
5. ✅ **ENHANCE PLANNING FEATURES** - Add data persistence and collaboration

## Phase 2c: Webapp Foundation (Week 4-6)

1. ✅ **NEW**: Create design system with CSS variables
2. ✅ **NEW**: Expand shared UI component library
3. ✅ **NEW**: Optimize Query Client configuration
4. ✅ **NEW**: Add ARIA attributes and roles across the app
5. ✅ **NEW**: Improve keyboard navigation for all components

## Phase 3: Medium Priority Improvements (Week 4-6)

1. ✅ Consolidate server configurations
2. ✅ Standardize domain organization
3. ✅ Improve TypeScript usage in webapp
4. ✅ Standardize component naming conventions
5. ✅ Set up CI/CD pipeline
6. ✅ Add monitoring and observability
7. ✅ Improve Docker Compose configuration
8. ✅ **NEW**: Standardize CSS naming conventions
9. ✅ **NEW**: Improve CSS organization and file structure
10. ✅ **NEW**: Add CSS linting with Stylelint
11. ✅ **NEW**: Create custom query hooks for common patterns
12. ✅ **NEW**: Add query caching and invalidations
13. ✅ **NEW**: Improve loading and error states for queries
14. ✅ **NEW**: Add query prefetching and preloading
15. ✅ **NEW**: Improve semantic HTML usage
16. ✅ **NEW**: Add focus management utilities
17. ✅ **NEW**: Improve color contrast and accessibility
18. ✅ **NEW**: Add screen reader support

## Phase 4: Webapp-Specific Improvements (Week 7-8)

1. ✅ **NEW**: Fix CSS duplication and specificity issues
2. ✅ **NEW**: Improve shared UI package utilization
3. ✅ **NEW**: Standardize component props and API
4. ✅ **NEW**: Add component testing with Jest + React Testing Library
5. ✅ **NEW**: Add React performance optimizations
6. ✅ **NEW**: Improve state management patterns
7. ✅ **NEW**: Add query analytics and monitoring
8. ✅ **NEW**: Add accessibility testing (jest-axe, ESLint a11y)
9. ✅ **NEW**: Create accessibility guidelines

## Phase 5: Low Priority & Documentation (Week 9+)

1. ✅ Add comprehensive documentation
2. ✅ Add more unit and integration tests
3. ✅ Implement performance optimizations
4. ✅ Add code review guidelines
5. ✅ Set up pre-commit hooks
6. ✅ **NEW**: Add Storybook for component documentation
7. ✅ **NEW**: Complete remaining accessibility improvements

---

# 📈 Metrics and Success Criteria

| Metric                   | Current    | Target        | Improvement |
| ------------------------ | ---------- | ------------- | ----------- |
| Security vulnerabilities | 4 critical | 0             | 100%        |
| Test coverage            | Low        | 80%+          | Significant |
| Build time               | ~N/A       | < 5 min       | Optimized   |
| Docker image size        | ~N/A       | < 500MB       | Optimized   |
| API response time        | ~N/A       | < 200ms (p95) | Improved    |
| Error rate               | ~N/A       | < 0.1%        | Reduced     |
| **Webapp Metrics**       |            |               |             |
| CSS consistency          | Low        | 100%          | Standardized|
| Component reusability    | Low        | 70%+          | Improved    |
| Accessibility score      | Unknown    | 90%+ (Lighthouse) | Major improvement |
| Query performance        | Unknown    | < 100ms avg  | Optimized   |
| Shared component usage   | ~12        | 50+           | Expanded    |
| Design system adoption   | 0%         | 100%          | Complete    |
| **Critical Features**    |            |               |             |
| Data persistence          | ❌ Missing  | 100% Working  | **BLOCKER** |
| Server write endpoints   | ❌ Missing  | 100% Complete | **BLOCKER** |
| Real-time collaboration  | ❌ Missing  | Full support  | **BLOCKER** |
| Staging feature           | ❌ Placeholder | Full implementation | **BLOCKER** |
| Version control           | ❌ Missing  | Full system   | **HIGH**   |

---

# 🔗 Related Files Reference

## Configuration Files

- `compose.yaml` - Docker Compose configuration
- `Dockerfile.api` - API Docker configuration
- `apps/worker/Dockerfile` - Worker Docker configuration
- `package.json` - Root package configuration
- `pnpm-workspace.yaml` - pnpm workspace configuration
- `turbo.json` - Turborepo configuration

## API Files

- `apps/api/src/index.ts` - Main entry point
- `apps/api/src/trpc-server.ts` - tRPC server configuration
- `apps/api/src/server.ts` - Express server
- `apps/api/src/infra/` - Infrastructure layer
- `apps/api/src/domains/` - Domain layer
- `apps/api/src/shared/` - Shared utilities

## Worker Files

- `apps/worker/main.py` - Worker entry point
- `apps/worker/process_script_text_files.py` - Job processor
- `apps/worker/mistral_parser.py` - Mistral AI integration
- `apps/worker/s3_client.py` - S3 client
- `apps/worker/trpc_client.py` - tRPC client

## Webapp Files

- `apps/webapp/src/` - React application
- `apps/webapp/src/features/` - Feature components
- `apps/webapp/src/components/` - Shared components
- `apps/webapp/src/app.tsx` - Main app with QueryClient setup
- `apps/webapp/src/trpc.ts` - tRPC integration with Tanstack Query
- `apps/webapp/src/app.css` - Global styles
- `apps/webapp/src/routes.tsx` - React Router configuration
- `packages/ui/` - Shared UI component package

---

_This analysis provides a comprehensive roadmap for improving the marivo repository across security, reliability, performance, and maintainability dimensions._

---

# 🚀 Webapp-Specific Quick Start Guide

## Immediate Actions (Can start today)

### For CSS Improvements:
1. **Create CSS variables** in `app.css` for all colors
2. **Audit and replace** hardcoded colors with CSS variables
3. **Standardize spacing** using CSS custom properties
4. **Add Stylelint** to package.json devDependencies

### For Shared Components:
1. **Create a Button component** in `src/components/`
2. **Create a LoadingSpinner component** for consistent loading states
3. **Create an ErrorDisplay component** for consistent error handling
4. **Move reusable patterns** from features to shared components

### For Tanstack React Query:
1. **Optimize QueryClient configuration** in `app.tsx`
2. **Create custom query hooks** for plays queries
3. **Add proper error handling** to all existing queries
4. **Implement query caching strategy**

### For Accessibility:
1. **Run automated accessibility audit** with Lighthouse or axe
2. **Add `eslint-plugin-jsx-a11y`** to ESLint config
3. **Add basic ARIA attributes** to all interactive components
4. **Test keyboard navigation** manually

## Key Dependencies to Add

```bash
# CSS and styling
pnpm add -D stylelint stylelint-config-standard stylelint-order

# Accessibility testing
pnpm add -D eslint-plugin-jsx-a11y @testing-library/react @testing-library/jest-dom
pnpm add -D jest-axe

# Storybook (optional but recommended)
pnpm add -D @storybook/react @storybook/react-vite @storybook/addon-essentials

# Additional React utilities
pnpm add classnames  # (already installed)
pnpm add react-hot-toast  # For better notifications
```

## Priority Recommendations

**If you're not great at CSS**: Start with creating the design system (#46) and CSS variables. This will give you immediate benefits in consistency and make future styling much easier.

**For shared components**: Begin with the most reused patterns (buttons, loaders, error displays) and gradually build up your component library.

**For Tanstack React Query**: Focus on the QueryClient configuration (#62) first, as this affects all queries in your app.

**For accessibility**: Start with the critical issues (ARIA attributes #68, keyboard navigation #69) as these have the biggest impact on users with disabilities.

---

## 📝 Webapp Improvement Checklist

- [ ] **Design System**: CSS variables for colors, spacing, typography
- [ ] **Shared Components**: Button, Input, LoadingSpinner, ErrorDisplay, Dialog
- [ ] **Query Client**: Optimized configuration with proper retry logic
- [ ] **Custom Hooks**: usePlaysQuery, useUpdatePlayMutation, etc.
- [ ] **Accessibility**: ARIA attributes, keyboard support, semantic HTML
- [ ] **Testing**: Jest + React Testing Library, accessibility tests
- [ ] **Documentation**: Storybook, component docs, design system docs

This deep dive into the webapp package provides **39 new actionable improvements** that will significantly enhance the code quality, developer experience, performance, and accessibility of your React application.

---

# 🔍 CRITICAL MISSING FEATURES & LOOPHOLES ANALYSIS

After deep analysis of the codebase, I've identified **several critical missing features and loopholes** that significantly impact the application's usability, reliability, and completeness. These represent major gaps in the current implementation that should be addressed as high priority.

---

## 💥 CRITICAL: Data Persistence & Synchronization

### 76. **No Local Persistence of Script Data** (Rank: 1) ⚠️

**Issue**: User edits to scripts are completely lost on page refresh or navigation

**Analysis Findings**:
- The `ScriptEditionContext` provides `saveChanges`, `saveChangesAsNewVersion`, and `saveChangesAsSharedDraft` methods
- However, these only **update local state** via the reducer - **no API calls are made to persist changes to the server**
- The `script-state.ts` reducer's `SAVE_CHANGES` case only updates the local `lineContents` map
- **No localStorage, sessionStorage, or IndexedDB persistence** exists anywhere in the codebase
- Users can spend hours editing scripts and lose everything with a single page refresh

**Files affected**:
- `apps/webapp/src/features/script/script-edition.context.tsx` (missing server calls)
- `apps/webapp/src/features/script/script-state.ts` (local-only operations)
- `apps/api/src/domains/script/` (missing mutation endpoints)

**Impact**: **CRITICAL** - Data loss, poor user experience, application unusable for production

**Recommendation**:

1. **Immediate Fix - Add Local Persistence**:
   - Implement `localStorage` persistence for script edits
   - Auto-save changes locally every 30 seconds
   - Restore from localStorage on page load

2. **Server Sync Implementation**:
   - Create API endpoints for saving script changes:
     - `POST /script/save-line` - Save individual line changes
     - `POST /script/batch-save` - Save multiple changes at once
     - `POST /script/save-version` - Create new versions
   - Implement optimistic updates with server sync
   - Add conflict resolution for offline changes

3. **Complete Sync Architecture**:
```typescript
// Client-side sync manager
export class ScriptSyncManager {
  private localChanges: ScriptChange[] = [];
  private syncInterval: NodeJS.Timeout;
  private isOnline: boolean = true;
  private isSyncing: boolean = false;

  constructor(private apiClient: ScriptApiClient) {
    // Load from localStorage on init
    this.localChanges = this.loadLocalChanges();
    
    // Auto-save locally every 30 seconds
    this.syncInterval = setInterval(() => this.saveLocally(), 30000);
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Sync immediately when online
    this.handleOnline();
  }

  private saveLocally() {
    localStorage.setItem('script-changes', JSON.stringify(this.localChanges));
  }

  private loadLocalChanges(): ScriptChange[] {
    const saved = localStorage.getItem('script-changes');
    return saved ? JSON.parse(saved) : [];
  }

  async function handleOnline() {
    this.isOnline = true;
    await this.syncAllChanges();
  }

  async function syncAllChanges() {
    if (this.isSyncing || !this.isOnline) return;
    
    this.isSyncing = true;
    
    while (this.localChanges.length > 0) {
      const change = this.localChanges[0];
      try {
        await this.apiClient.saveScriptChange(change);
        this.localChanges.shift();
        this.saveLocally();
      } catch (error) {
        console.error('Failed to sync change:', error);
        break; // Stop on error, will retry later
      }
    }
    
    this.isSyncing = false;
  }
}
```

**Success Criteria**:
- [ ] Local changes persist across page refreshes
- [ ] Changes sync to server when online
- [ ] Offline changes queue and sync when connection restored
- [ ] Conflict resolution for simultaneous edits

---

### 77. **No Server API Endpoints for Script Writes** (Rank: 1) ⚠️

**Issue**: The API only has read operations for scripts, no write endpoints

**Analysis Findings**:
- `script.trpc-routes.ts` only has `latestChanges` query endpoint
- `script.repository.ts` only has `getLatestScriptChanges` method
- **No mutation endpoints** for:
  - Creating new lines
  - Updating existing lines  
  - Saving new versions
  - Deleting lines or content
  - Managing characters
  - Updating script metadata

**Files affected**:
- `apps/api/src/domains/script/script.trpc-routes.ts` (missing mutations)
- `apps/api/src/domains/script/` (missing use cases and repositories)

**Impact**: **CRITICAL** - Webapp cannot actually save any user edits to the database

**Recommendation**:

1. **Add Required Mutation Endpoints**:
```typescript
// In script.trpc-routes.ts
export default router({
  latestChanges: publicProcedure
    .input(LatestScriptChangesUseCaseInputSchema)
    .output(LatestScriptChangesUseCaseOutputSchema)
    .query(handleUseCase(providers.LatestScriptChangesUseCase)),
  
  // NEW: Save individual line changes
  saveLineContent: publicProcedure
    .input(SaveLineContentUseCaseInputSchema)
    .output(SaveLineContentUseCaseOutputSchema)
    .mutation(handleUseCase(providers.SaveLineContentUseCase)),
    
  // NEW: Batch save multiple changes
  batchSaveChanges: publicProcedure
    .input(BatchSaveChangesUseCaseInputSchema)
    .output(BatchSaveChangesUseCaseOutputSchema)
    .mutation(handleUseCase(providers.BatchSaveChangesUseCase)),
    
  // NEW: Create new line
  createLine: publicProcedure
    .input(CreateLineUseCaseInputSchema)
    .output(CreateLineUseCaseOutputSchema)
    .mutation(handleUseCase(providers.CreateLineUseCase)),
    
  // NEW: Delete line
  deleteLine: publicProcedure
    .input(DeleteLineUseCaseInputSchema)
    .output(z.void())
    .mutation(handleUseCase(providers.DeleteLineUseCase)),
});
```

2. **Implement Repository Methods**:
   - `saveLineContent` - Save line content changes
   - `createLine` - Create new lines (heading, cue, freetext)
   - `deleteLine` - Remove lines from script
   - `updateScriptMetadata` - Update characters, title, etc.

3. **Add Database Schema Updates**:
   - Ensure proper foreign keys and constraints
   - Add indexes for performance
   - Add timestamps for conflict resolution

---

## 🎭 CRITICAL: Incomplete Features & Placeholders

### 78. **Staging Directions Feature is a Placeholder** (Rank: 2) ⚠️

**Issue**: Staging Directions tab contains only placeholder divs

**Analysis Findings**:
```tsx
// From staging-directions-tab.component.tsx
function StagingDirectionsTab() {
  return (
    <div className={styles.container}>
      <Tabs
        tabs={[
          { name: 'Characters', ContentComponent: <div>CharactersList</div> },
          { name: 'Props', ContentComponent: <div>PropsList</div> },
          { name: 'Costumes', ContentComponent: <div>CostumesList</div> },
          { name: 'Lights', ContentComponent: <div>LightsList</div> },
          { name: 'Sounds', ContentComponent: <div>SoundsList</div> },
        ]}
      />
    </div>
  );
}
```

- **5 tabs** with literal `<div>CharactersList</div>` text instead of actual components
- No actual functionality implemented
- Feature appears in UI but does nothing
- Permission system references `stagingNotesRead` but no backend implementation

**Files affected**:
- `apps/webapp/src/features/staging-directions/staging-directions-tab.component.tsx`

**Impact**: **HIGH** - Feature promised but not delivered, misleading to users

**Recommendation**:

1. **Either implement the feature properly**:
   - Create actual component files for each tab
   - Implement data models for staging elements
   - Add API endpoints for managing staging directions
   - Connect to database

2. **Or remove/hide the feature** until ready:
   - Remove from play page tabs
   - Remove permission references
   - Document as upcoming feature

3. **Minimal viable implementation**:
   - Create basic CRUD for each staging element type
   - Start with CharactersList (most important)
   - Add simple text-based management for Props, Costumes, etc.

---

### 79. **Planning Feature Lacks Core Functionality** (Rank: 2) ⚠️

**Issue**: Planning feature appears to have partial implementation

**Analysis Findings**:
- `planning-tab.component.tsx` has two tabs: Rehearsals/Meetings and Availabilities
- `meetings-planning.component.tsx` and `availabilities-planning.component.tsx` exist
- But **no data persistence** - likely same issue as script editing
- **No collaboration features** for coordinating with cast/crew
- Missing calendar integration
- Missing conflict detection

**Files affected**:
- `apps/webapp/src/features/planning/` (all files)

**Impact**: **HIGH** - Feature appears functional but likely doesn't persist data

**Recommendation**:

1. **Implement data persistence**:
   - Add API endpoints for planning data
   - Create database schema for rehearsals, meetings, availabilities
   - Connect planning components to actual data

2. **Add collaboration features**:
   - Shared calendars
   - RSVP system for rehearsals
   - Conflict detection between schedules
   - Notification system for schedule changes

---

### 80. **Blocking Feature Appears Incomplete** (Rank: 3) ⚠️

**Issue**: Blocking feature has minimal implementation

**Analysis Findings**:
- `blocking-tab.component.tsx` exists but only shows a `<div className={styles.blockingPanel}></div>`
- Uses Script component in read-only mode (`isEditable={false}`)
- **No actual blocking visualization** or tools
- **No scene layout** or blocking notation
- Permission system references `blockingRead` but no real functionality

**Files affected**:
- `apps/webapp/src/features/blocking/blocking-tab.component.tsx`
- `apps/webapp/src/features/blocking/` (all files)

**Impact**: **MEDIUM** - Feature appears in UI but provides no value

**Recommendation**:

1. **Implement basic blocking features**:
   - Visual stage layout with draggable elements
   - Blocking notation system
   - Scene-by-scene blocking management
   - Save/load blocking data

2. **Integrate with script**:
   - Link blocking to specific scenes/lines
   - Show blocking notes alongside script
   - Visual indicators for character positions

---

## 👥 CRITICAL: Missing Collaboration Features

### 81. **No Real-time Collaboration Support** (Rank: 2) ⚠️

**Issue**: No collaborative editing capabilities for multi-user scripts

**Analysis Findings**:
- **No WebSocket implementation** anywhere in the codebase
- **No real-time updates** when other users edit scripts
- **No presence indicators** to show who else is viewing/editing
- **No cursor tracking** or live collaboration
- **No conflict resolution** for simultaneous edits
- tRPC uses HTTP, not WebSockets

**Files affected**:
- All webapp and API files (missing collaboration infrastructure)

**Impact**: **HIGH** - Cannot support multi-user workflows, which is essential for theater productions

**Recommendation**:

1. **Add Real-time Infrastructure**:
   - Implement WebSocket server for real-time updates
   - Use Socket.io or native WebSocket API
   - Add presence tracking
   - Add live cursor positions

2. **Real-time Data Sync**:
   - Broadcast changes to all connected clients
   - Implement operational transformation (OT) or CRDT for conflict resolution
   - Add optimistic UI updates
   - Show user presence and activity

3. **Collaboration UI**:
   - User presence indicators
   - Live cursors with user avatars
   - Change notifications
   - Comment/annotation system
   - Version history and diffs

**Example Implementation**:
```typescript
// Server-side WebSocket setup
import { WebSocketServer } from 'ws';
import { Server } from 'http';

const wss = new WebSocketServer({ server: httpServer });

interface Client {
  ws: WebSocket;
  userId: string;
  playId: string;
  cursorPosition: { lineId: string; position: number } | null;
}

const clients = new Map<string, Client>();

wss.on('connection', (ws, req) => {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const playId = url.searchParams.get('playId');
  const userId = url.searchParams.get('userId');
  
  if (!playId || !userId) {
    ws.close(1008, 'Missing playId or userId');
    return;
  }
  
  clients.set(ws.id, { ws, userId, playId, cursorPosition: null });
  
  // Broadcast to room
  const broadcast = (message: CollaborationMessage, excludeId?: string) => {
    clients.forEach((client, id) => {
      if (client.playId === playId && id !== excludeId) {
        client.ws.send(JSON.stringify(message));
      }
    });
  };
  
  ws.on('message', (data) => {
    const message = JSON.parse(data.toString()) as CollaborationMessage;
    
    switch (message.type) {
      case 'CURSOR_MOVE':
        updateClientCursor(ws.id, message.position);
        broadcast(message, ws.id);
        break;
      case 'CHANGE':
        // Apply change to database
        applyChangeToDatabase(message.change);
        broadcast(message, ws.id);
        break;
      case 'COMMENT':
        // Save comment to database
        saveComment(message.comment);
        broadcast(message, ws.id);
        break;
    }
  });
});
```

---

### 82. **No Conflict Resolution for Concurrent Edits** (Rank: 2) ⚠️

**Issue**: No mechanism to handle concurrent edits from multiple users

**Analysis Findings**:
- Even if persistence worked, **no conflict resolution** exists
- **Last-write-wins** approach would lose user data
- **No versioning system** for scripts
- **No merge algorithms** (OT, CRDT, or even simple diff3)
- **No locking mechanism** to prevent concurrent edits

**Impact**: **HIGH** - Data loss in collaborative scenarios, user frustration

**Recommendation**:

1. **Implement Basic Conflict Resolution**:
   - Add optimistic locking (version numbers)
   - Reject edits if version mismatch
   - Notify users of conflicts

2. **Advanced Conflict Resolution**:
   - Implement Operational Transformation (OT)
   - Or Conflict-free Replicated Data Types (CRDT)
   - Add merge conflict UI for manual resolution

3. **Locking System**:
   - Optional: Add line/document locking
   - Visual indicators for locked content
   - Request lock / release lock system

---

## 🔐 CRITICAL: Permission and Access Control Issues

### 83. **Permission System references Non-existent Features** (Rank: 3) ⚠️

**Issue**: Permission system includes features that don't exist or aren't implemented

**Analysis Findings**:
- `permission-protected.component.tsx` defines mapping:
  ```typescript
  const PATH_TO_PERM: Record<PlaySubPath, PlayPermission> = {
    script: 'scriptRead',        // ✅ Implemented
    'staging-notes': 'stagingNotesRead',  // ❌ Feature incomplete
    blocking: 'blockingRead',    // ❌ Feature incomplete  
    memorize: 'memorizeRead',    // ⚠️ Partial implementation
    planning: 'planningRead',    // ⚠️ Partial implementation
    settings: 'settingsRead',    // ✅ Implemented
  };
  ```
- **Blocking and Staging features** are essentially placeholders but have permission checks
- **No read/write permission differentiation** in most cases
- **No fine-grained permissions** (e.g., per-line editing)

**Files affected**:
- `apps/webapp/src/features/play-admin/permission-protected.component.tsx`
- `apps/api/src/domains/plays/` (permission handling)

**Impact**: **MEDIUM** - Misleading permissions, inconsistent user experience

**Recommendation**:

1. **Clean up permission system**:
   - Remove permissions for non-existent features
   - Or implement those features
   - Document which features are actually available

2. **Enhance permission granularity**:
   - Add read vs write permissions
   - Add per-line or per-section permissions
   - Add role-based access control

3. **Implement permission UI**:
   - Visual indicators for restricted content
   - Request access workflows
   - Permission management UI for admins

---

### 84. **No User Roles or Role-Based Access Control** (Rank: 3) ⚠️

**Issue**: Only basic read permissions, no role system

**Analysis Findings**:
- Permissions appear to be **binary** (can read or cannot read)
- **No roles** defined (admin, editor, viewer, etc.)
- **No hierarchical permissions** (owner vs member vs guest)
- **No permission inheritance**
- **Clark integration** suggests user system exists but roles are not leveraged

**Impact**: **MEDIUM** - Cannot implement complex collaboration workflows

**Recommendation**:

1. **Define Role System**:
   - Owner (full control)
   - Admin (manage users, settings)
   - Editor (edit content)
   - Viewer (read-only)
   - Guest (limited access)

2. **Implement Role-Based Permissions**:
```typescript
// Role definitions
const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin', 
  EDITOR: 'editor',
  VIEWER: 'viewer',
  GUEST: 'guest'
} as const;

// Permission matrix
const PERMISSIONS = {
  [ROLES.OWNER]: ['*'],
  [ROLES.ADMIN]: ['manage_users', 'edit_settings', 'edit_content', 'delete_content'],
  [ROLES.EDITOR]: ['edit_content', 'create_content'],
  [ROLES.VIEWER]: ['read_content'],
  [ROLES.GUEST]: ['read_content']
};

// Role assignment
interface PlayMember {
  userId: string;
  role: Role;
  grantedBy: string;
  grantedAt: Date;
}
```

3. **UI for Role Management**:
   - Role assignment interface
   - Permission matrix display
   - Role inheritance visualization

---

## 🔄 CRITICAL: Missing Core Application Features

### 85. **No Script Versioning or History** (Rank: 2) ⚠️

**Issue**: No version control or history for script changes

**Analysis Findings**:
- UI has `saveChangesAsNewVersion` but this only creates local state
- **No server-side versioning** - versions not persisted
- **No version comparison/diff** functionality
- **No rollback/restore** capabilities
- **No version annotations** or descriptions
- **No branching/merging** for versions

**Files affected**:
- Script editing and version management features

**Impact**: **HIGH** - Cannot track changes over time, no audit trail

**Recommendation**:

1. **Implement Script Versioning**:
   - Create versions table in database
   - Add version metadata (author, timestamp, description)
   - Implement version diff algorithm
   - Add version comparison UI

2. **Version Management**:
   - List all versions
   - Restore from any version
   - Delete old versions
   - Tag important versions (milestones)

3. **Version Comparison UI**:
   - Side-by-side diff view
   - Inline change highlighting
   - Change acceptance/rejection

---

### 86. **No Import/Export Functionality** (Rank: 3) ⚠️

**Issue**: No way to import existing scripts or export to standard formats

**Analysis Findings**:
- **Script import feature exists** in play-admin (`init-import-script`, `upload-file-for-script-import`)
- But **no export functionality** for existing scripts
- **No standard format support** (Final Draft, Celtx, Fountain, etc.)
- **No PDF/Word export**
- **No JSON import/export** for data portability

**Impact**: **MEDIUM** - Cannot migrate existing work, vendor lock-in

**Recommendation**:

1. **Add Export Functionality**:
   - Export to PDF (for printing)
   - Export to Word/DOCX (for compatibility)
   - Export to Fountain (industry standard screenwriting format)
   - Export to JSON (for data portability)

2. **Enhance Import Functionality**:
   - Support Fountain format import
   - Support Final Draft import
   - Support Celtx import
   - Add import templates and guides

3. **File Format Conversion**:
```typescript
// Export service
class ScriptExportService {
  async exportToPDF(script: Script): Promise<Blob> {
    // Use PDF generation library
    return this.pdfGenerator.generate(script);
  }
  
  async exportToFountain(script: Script): Promise<string> {
    // Convert to Fountain format
    let fountain = '# ' + script.title + '\n\n';
    
    for (const line of script.lines) {
      if (line.type === 'heading') {
        fountain += line.headingLevel + '. ' + line.text + '\n\n';
      } else if (line.type === 'chartext') {
        fountain += line.character + '\n' + line.text + '\n\n';
      } else {
        fountain += line.text + '\n\n';
      }
    }
    
    return fountain;
  }
  
  async exportToJSON(script: Script): Promise<string> {
    return JSON.stringify(script, null, 2);
  }
}
```

---

### 87. **No Offline Support or Progressive Web App Features** (Rank: 3) ⚠️

**Issue**: No PWA features or offline capability

**Analysis Findings**:
- **No service worker** registered
- **No manifest file** for PWA installation
- **No offline caching** strategy
- **No background sync** for changes made offline
- **Network status detection exists** but only shows notifications
- **No app-like experience** on mobile devices

**Files affected**:
- Missing `src/main.tsx` service worker registration
- Missing `public/manifest.json`
- Missing service worker files

**Impact**: **MEDIUM** - Poor mobile experience, no offline functionality

**Recommendation**:

1. **Add Service Worker**:
   - Implement Workbox or custom service worker
   - Cache static assets for offline use
   - Implement background sync for offline changes

2. **Add PWA Manifest**:
```json
{
  "name": "Marivo",
  "short_name": "Marivo",
  "description": "Professional script writing and collaboration platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#fef8eb",
  "theme_color": "#1f313c",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

3. **Add Offline Detection and Queuing**:
   - Queue changes made offline
   - Auto-sync when connection restored
   - Offline mode UI indicators

---

### 88. **No Search or Find/Replace Functionality** (Rank: 3) ⚠️

**Issue**: No comprehensive search capabilities

**Analysis Findings**:
- **Search panel exists** (`script-search-panel.component.tsx`)
- But appears to be **local-only** - no server-side search
- **No full-text search** across all scripts
- **No find/replace** functionality
- **No advanced search** (regex, filters, etc.)
- **No search indexing** for performance

**Impact**: **MEDIUM** - Difficult to navigate large scripts, find specific content

**Recommendation**:

1. **Enhance Local Search**:
   - Find/replace functionality
   - Match highlighting
   - Search history

2. **Add Server-Side Search**:
   - Full-text search across all scripts
   - Advanced filtering (by character, scene, date, etc.)
   - Search indexing with PostgreSQL full-text search or dedicated search engine

3. **Search UI Improvements**:
   - Keyboard shortcuts for search
   - Search suggestions
   - Recent searches
   - Saved search filters

---

### 89. **No Character Management System** (Rank: 3) ⚠️

**Issue**: Characters appear to be managed but no dedicated system

**Analysis Findings**:
- Characters are **hardcoded** in script data (`characters: { [id: string]: string }`)
- **No character database** or management UI
- **No character profiles** (descriptions, notes, etc.)
- **No character relationships** or metadata
- **No casting management**

**Impact**: **MEDIUM** - Difficult to manage large casts, missing theatrical features

**Recommendation**:

1. **Create Character Management**:
   - Dedicated character database table
   - Character CRUD operations
   - Character profiles with metadata
   - Character avatars/images

2. **Enhanced Character Features**:
   - Character relationships and connections
   - Casting management
   - Character arcs and development tracking
   - Character-specific notes and annotations

3. **Character UI**:
   - Character list with filtering
   - Character detail pages
   - Character timeline visualization
   - Cast list with roles and status

---

## 🎯 Feature Completion Matrix

| Feature | Status | Priority | Dependencies |
|---------|--------|----------|--------------|
| **Script Editing** | ⚠️ Partial | Critical | API persistence, local storage |
| **Script Persistence** | ❌ Missing | Critical | API endpoints, local sync |
| **Real-time Collaboration** | ❌ Missing | High | WebSocket server, conflict resolution |
| **Versioning/History** | ❌ Missing | High | Database schema, diff algorithms |
| **Import/Export** | ⚠️ Partial | Medium | File format parsers |
| **Search** | ⚠️ Basic | Medium | Full-text indexing |
| **Character Management** | ❌ Missing | Medium | Database schema, UI |
| **Staging Directions** | ❌ Placeholder | High | Complete implementation |
| **Blocking** | ❌ Placeholder | Medium | Visual layout system |
| **Planning** | ⚠️ Partial | Medium | Database schema, calendar integration |
| **PWA/Offline** | ❌ Missing | Medium | Service worker, manifest |

---

## 🚨 Critical Business Impact Assessment

### Revenue & User Retention Risks:

1. **Data Loss = User Churn**: Users will abandon the platform if they lose work
2. **Missing Collaboration = Limited Market**: Cannot sell to theater groups/teams without collaboration
3. **Incomplete Features = Reputation Damage**: Users expect complete features, not placeholders
4. **No Offline = Mobile Limitation**: Cannot compete with native apps without offline support

### Technical Debt Amplification:

1. **Half-implemented features** create maintenance burden
2. **Missing infrastructure** (collaboration, persistence) will be increasingly difficult to add later
3. **Inconsistent user experience** across features erodes trust
4. **Placeholder code** needs to be replaced or completed

---

## 🎯 Immediate Action Plan: Feature Completion

### Phase 1: Data Safety (Week 1-2) - CRITICAL
1. ✅ **Fix data persistence** - Add localStorage + server sync
2. ✅ **Create API write endpoints** for scripts
3. ✅ **Implement conflict resolution** (basic version checking)

### Phase 2: Core Features (Week 3-4) - HIGH
1. ✅ **Implement versioning system**
2. ✅ **Add export functionality** (PDF, JSON)
3. ✅ **Complete character management**

### Phase 3: Collaboration (Week 5-6) - HIGH  
1. ✅ **Add real-time WebSocket infrastructure**
2. ✅ **Implement presence tracking**
3. ✅ **Add live collaboration UI**

### Phase 4: Feature Completion (Week 7-8) - MEDIUM
1. ✅ **Complete Staging Directions feature**
2. ✅ **Enhance Blocking feature**
3. ✅ **Finish Planning feature**

### Phase 5: Polish (Week 9+) - MEDIUM
1. ✅ **Add PWA support**
2. ✅ **Enhance search functionality**
3. ✅ **Add role-based permissions**

---

_This missing features analysis identifies **14 critical gaps** in the current implementation that must be addressed to make the application production-ready and competitive in the script writing market._

---

# 🚨 IMMEDIATE ACTION REQUIRED

## The Application is NOT Ready for Use

**STOP DEVELOPMENT AND FIX THESE FIRST**:

### 1. Data Loss Prevention (URGENT)
- **Problem**: Users lose all work on page refresh
- **Solution**: Implement localStorage persistence + server sync immediately
- **Effort**: 2-3 days
- **Impact**: Application becomes usable

### 2. Server API Completion (URGENT) 
- **Problem**: No way to save script changes to database
- **Solution**: Add write endpoints for script data to API
- **Effort**: 3-5 days
- **Impact**: Data persistence becomes permanent

### 3. Feature Honesty (HIGH)
- **Problem**: Placeholder features misleading users
- **Solution**: Either implement or remove placeholder features
- **Effort**: Varies by feature
- **Impact**: User trust and reputation

## Recommendation

**Do not deploy to production** until Phases 0 and 1 are complete. The current state represents a **severe data loss risk** and will result in **user churn and reputation damage**.

---

*This analysis now provides the most comprehensive improvement roadmap for the marivo repository, covering infrastructure, code quality, webapp enhancements, and critical missing features that must be addressed for production readiness.*

