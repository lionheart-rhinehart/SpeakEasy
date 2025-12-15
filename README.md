# SpeakEasy

## Git & GitHub Setup Instructions

### 1. Setting the Remote

Set the project to use your GitHub repository as origin:

```
git remote add origin https://github.com/lionheart-rhinehart/SpeakEasy.git
```
Or, if it already exists but is incorrect:
```
git remote set-url origin https://github.com/lionheart-rhinehart/SpeakEasy.git
```

### 2. Pushing Local Branches
Push your branches to GitHub:
```
git push -u origin master
```
(Repeat for other branches, e.g., `plan-edit`):
```
git push -u origin plan-edit
```

### 3. Troubleshooting
- **Remote repo does not exist:** Ensure it is created at GitHub and your remote URL is correct.
- **Authentication errors:** Make sure you are signed in with credentials for your GitHub account, and have permission for the repository.
- **Push errors about "no upstream configured":** Use `git push -u origin BRANCH_NAME` to set up tracking the first time you push a branch.
- **GitHub CLI errors:** Install [`gh`](https://cli.github.com/) and run `gh auth login` if not authenticated.

### 4. Automation Notes
- The wrapup script (`scripts/wrapup.mjs`) automatically pushes changes to your `origin` remote. If the remote repository does not exist or you are not authenticated, it will provide explicit error messages. See that script for details and logs.

---

For further setup or troubleshooting, see the repository [issues](https://github.com/lionheart-rhinehart/SpeakEasy/issues) or consult a team administrator.
