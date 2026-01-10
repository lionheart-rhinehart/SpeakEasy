# /initial-setup-step4-project-start - Begin Building

Start the Build Phase by implementing a claimed feature. Load context, validate dependencies, create implementation checklist, and generate test stubs. This is Step 4 of the initial project setup workflow - where actual development begins.

## Usage

```
/initial-setup-step4-project-start [feature-id]
/initial-setup-step4-project-start                  # Lists available features
```

**Examples:**
```
/initial-setup-step4-project-start F-001
/initial-setup-step4-project-start user-authentication
```

## Prerequisites

1. `/initial-setup-step3-checkpoint-and-build-order` completed (build order exists)
2. `/pre-flight-check` run (worker ID assigned, feature claimed)
3. Feature exists in SRS at `docs/srs/SRS-*.md`
4. Dependencies for the feature are completed (or none required)

## Process

### Step 1: Verify Claim

Check that this worker has claimed this feature:

```
Verifying claim...

Worker: Chat-A
Claimed Feature: F-001 (User Authentication)
Build Order Status: in-progress
Claimed At: [timestamp]

✅ Claim verified. Proceeding with implementation prep.
```

**If not claimed:**
```
⚠️ Feature F-001 not claimed by this worker

Current claims for Chat-A: F-003, F-004
F-001 is claimed by: Chat-B

Options:
1. Run /pre-flight-check to claim available features
2. Choose from your claimed features: F-003, F-004
```

### Step 2: Load Feature Context

Read feature from SRS:
- `docs/srs/SRS-*.md` - Extract feature section

Extract:
- Feature ID and name
- Description and user stories
- Functional requirements
- Acceptance criteria
- Data models
- API endpoints
- UI components
- Test cases
- Dependencies

### Step 3: Dependency Check

**Check Implementation Status:**
```
Dependencies for: F-002 (User Profile)

✅ F-001 (User Authentication)    [completed by Chat-A]

Status: READY - All dependencies met
```

**If blocked:**
```
Dependencies for: F-004 (Shopping Cart)

❌ F-003 (Product Catalog)    [in-progress by Chat-B]

Status: BLOCKED - Wait for F-003 to complete, then run /pre-flight-check
```

### Step 4: Generate Implementation Checklist

Create a structured todo list based on feature spec:

```markdown
## Implementation Checklist: F-001 User Authentication

### Phase 1: Data Layer
- [ ] Create/update database models
  - [ ] User model with auth fields
  - [ ] Session/token model
- [ ] Create migrations
- [ ] Add seed data (if needed)

### Phase 2: Backend/API
- [ ] Implement API endpoints
  - [ ] POST /api/auth/login
  - [ ] POST /api/auth/register
  - [ ] POST /api/auth/logout
- [ ] Add validation schemas
- [ ] Implement business logic
- [ ] Add error handling
- [ ] Add password hashing

### Phase 3: Frontend/UI
- [ ] Create components
  - [ ] LoginForm component
  - [ ] RegisterForm component
- [ ] Add state management
- [ ] Connect to API
- [ ] Add loading/error states
- [ ] Add form validation

### Phase 4: Testing
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Write E2E tests (login flow)

### Phase 5: Documentation
- [ ] Update API documentation
- [ ] Add inline code comments

### Phase 6: Review
- [ ] Self-review against acceptance criteria
- [ ] Check all edge cases handled
- [ ] Security review
```

### Step 5: Pre-Implementation Validation

Check project state:
- [ ] File ownership boundaries respected
- [ ] No conflicting changes from other workers
- [ ] Dependencies properly integrated
- [ ] Test infrastructure ready

### Step 6: Generate Test Stubs

Create test file stubs based on feature spec:

**For TypeScript/Jest:**
```typescript
// tests/unit/auth.test.ts
describe('F-001: User Authentication', () => {
  describe('Login', () => {
    it('should authenticate valid credentials', () => {
      // TODO: Implement - AC-01
    });

    it('should reject invalid credentials', () => {
      // TODO: Implement - AC-02
    });
  });

  describe('Registration', () => {
    it('should create new user with valid data', () => {
      // TODO: Implement - AC-03
    });
  });
});
```

**For Python/pytest:**
```python
# tests/unit/test_auth.py
import pytest

class TestUserAuthentication:
    """Tests for F-001: User Authentication"""

    def test_login_valid_credentials(self):
        """AC-01: Should authenticate valid credentials"""
        # TODO: Implement
        pass

    def test_login_invalid_credentials(self):
        """AC-02: Should reject invalid credentials"""
        # TODO: Implement
        pass
```

### Step 7: Set Up Todo List

Use TodoWrite to create implementation tasks:

```
Implementation: F-001 User Authentication

□ Data Layer: Create User model
□ Data Layer: Create migrations
□ Backend: Implement POST /api/auth/login
□ Backend: Implement POST /api/auth/register
□ Backend: Add password hashing
□ Frontend: Create LoginForm
□ Frontend: Create RegisterForm
□ Testing: Write unit tests
□ Testing: Write integration tests
□ Review: Verify acceptance criteria
```

### Step 8: Output Summary

```
═══════════════════════════════════════════════════════════════
            READY TO IMPLEMENT: F-001 User Authentication
═══════════════════════════════════════════════════════════════

Worker: Chat-A
Feature: F-001 User Authentication
Status: in-progress
Dependencies: none (ready)

FILES TO CREATE/MODIFY:
├── src/models/user.ts              [Create]
├── src/api/auth/login.ts           [Create]
├── src/api/auth/register.ts        [Create]
├── src/components/LoginForm.tsx    [Create]
├── tests/unit/auth.test.ts         [Create]
└── tests/integration/auth.test.ts  [Create]

FILE OWNERSHIP:
├── src/features/auth/*     ✅ YOURS
├── src/components/auth/*   ✅ YOURS
└── tests/**/auth*          ✅ YOURS

ACCEPTANCE CRITERIA:
1. AC-01: Users can log in with email/password
2. AC-02: Invalid credentials show error message
3. AC-03: New users can register

EDGE CASES TO HANDLE:
- Invalid email format
- Weak password
- Duplicate registration
- Rate limiting

═══════════════════════════════════════════════════════════════
Start implementing! When done, run:
  /test-protocol   # Build and test
  /wrapup          # Mark complete, commit, and log
═══════════════════════════════════════════════════════════════
```

## Output

1. **Implementation Checklist** - Structured task list
2. **Test Stubs** - Created in appropriate test directories
3. **Todo List** - Tasks added to Claude Code todo
4. **Console Summary** - Quick reference for implementation

## Quality Checklist

Before completing:
- [ ] Worker claim verified
- [ ] Feature spec fully loaded
- [ ] Dependencies verified
- [ ] Implementation checklist complete
- [ ] Test stubs created
- [ ] Todo list populated
- [ ] Clear next steps provided

## Error Handling

**If feature not found:**
```
Feature 'F-099' not found in SRS

Available features in docs/srs/SRS-MyProject.md:
- F-001: User Authentication
- F-002: User Profile
- F-003: Product Catalog
```

**If not claimed:**
- Show current claims
- Suggest running `/pre-flight-check`

**If dependencies not met:**
- List blocking features and their workers
- Show expected completion

**If project not scaffolded:**
- Recommend running `/initial-setup-step3-checkpoint-and-build-order`
- List missing structure

## Development Workflow

After implementing the feature:
1. Run `/test-protocol` to build and test
2. Run `/wrapup` to mark complete, commit, and log
3. Next chat can claim dependent features via `/pre-flight-check`

## Related Commands

- `/initial-setup-step3-checkpoint-and-build-order` - Previous step (creates build queue)
- `/pre-flight-check` - Claim features from build order
- `/test-protocol` - Build and test before committing
- `/wrapup` - Mark complete, commit, and update log
