---
name: Fix Git Remote/Upstream and Push
overview: Resolve Git push issues by verifying the remote repository, correcting remote URLs as needed, and configuring upstream tracking for local branches.
todos:
  - id: verify-github-repo
    content: Check if https://github.com/lionheart-rhinehart/SpeakEasy.git exists and you have access.
    status: completed
  - id: set-remote-correct-url
    content: Update remote 'origin' URL if a different address is needed.
    status: completed
  - id: set-upstream-branch
    content: Run 'git push --set-upstream origin <branch>' for your active branch(es).
    status: completed
  - id: test-push
    content: Test normal 'git push' and confirm success on GitHub.
    status: completed
  - id: optional-auto-upstream
    content: Optionally, configure auto-upstream for future branches via global config.
    status: completed
---

### 1. Verify Remote Repository on GitHub

- Confirm that https://github.com/lionheart-rhinehart/SpeakEasy.git exists and you have proper access rights.
- If not, create the repository or request access as necessary.

### 2. Fix the Remote URL if Incorrect

- If the actual repository is under a different username or organization, update the `origin` remote URL accordingly.
- Use: `git remote set-url origin <correct-URL>` if needed.

### 3. Set Upstream Tracking for Your Local Branches

- For each local branch you wish to push (e.g., `master`, `plan-edit`):
    - Run: `git push --set-upstream origin <branch-name>`
    - This will both create the branch on GitHub and link future pushes.

### 4. (Optional) Automate Upstream for Future Branches

- Configure Git to always auto-setup upstream on first push:
    - `git config --global push.autoSetupRemote matching`

### 5. Retest and Confirm

- Try a simple `git push` and confirm that commits appear in the GitHub repository with no errors.