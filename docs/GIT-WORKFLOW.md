# Git Workflow Guide

**Branch Strategy:** `main` ← `dev` ← feature branches

```
main (protected)     ← Production, PR-only merges
  ↑
dev                  ← Team integration branch
  ↑
feature/xxx          ← Individual work
```

---

## 🚀 Quick Reference

### Starting Work on an Issue

```bash
# 1. Make sure you're on dev and up to date
git checkout dev
git pull origin dev

# 2. Create feature branch from dev
git checkout -b feature/45-vector-elastic

# 3. Do your work...
# ...edit files, test, etc...

# 4. Stage and commit
git add -A
git commit -m "#45: Configure Vector for Elastic Stack output"

# 5. Push your branch
git push -u origin feature/45-vector-elastic

# 6. Create PR: feature branch → dev
# (via GitHub UI or CLI)
```

---

## 📋 Common Commands

### Branch Management

```bash
# List all branches
git branch -a

# Create and switch to new branch
git checkout -b feature/my-feature

# Switch to existing branch
git checkout dev

# Delete local branch (after merged)
git branch -d feature/old-branch

# Delete remote branch
git push origin --delete feature/old-branch
```

### Syncing

```bash
# Fetch latest from remote (doesn't merge)
git fetch origin

# Pull latest (fetch + merge)
git pull origin dev

# Pull with rebase (cleaner history)
git pull --rebase origin dev
```

### Staging & Committing

```bash
# Stage all changes
git add -A

# Stage specific file
git add path/to/file.ts

# Commit with message
git commit -m "#45: Brief description"

# Amend last commit (before push)
git commit --amend -m "Better message"

# See what's staged
git status
git diff --staged
```

### Stashing (Save Work Temporarily)

```bash
# Stash current changes
git stash

# Stash with message
git stash save "WIP: vector config"

# List stashes
git stash list

# Apply latest stash (keep in stash list)
git stash apply

# Pop latest stash (remove from stash list)
git stash pop

# Apply specific stash
git stash apply stash@{2}

# Drop a stash
git stash drop stash@{0}
```

### Rebasing

```bash
# Rebase current branch onto dev
git rebase dev

# Interactive rebase (squash commits)
git rebase -i HEAD~3

# Abort rebase if things go wrong
git rebase --abort

# Continue rebase after resolving conflicts
git rebase --continue
```

### Merging

```bash
# Merge dev into current branch
git merge dev

# Merge with no fast-forward (creates merge commit)
git merge --no-ff feature/my-feature

# Abort merge if conflicts are messy
git merge --abort
```

### Pull Requests (via GitHub CLI)

```bash
# Install gh if needed
# sudo apt install gh

# Authenticate
gh auth login

# Create PR from current branch to dev
gh pr create --base dev --title "#45: Vector Elastic integration" --body "Configures Vector output to Elastic Stack"

# List open PRs
gh pr list

# Check out a PR locally
gh pr checkout 123

# Merge PR
gh pr merge 123 --squash
```

---

## 🔧 Issue #45 Workflow

### Step 1: Create Feature Branch

```bash
cd ~/workspace/guard-quote-repo
git checkout dev
git pull origin dev
git checkout -b feature/45-vector-elastic
```

### Step 2: Work on the Issue

**On pi0 (monitoring):**
```bash
ssh pi0

# Check if Vector is installed
vector --version

# Edit Vector config
sudo nano /etc/vector/vector.toml

# Add Elastic output (example)
# [sinks.elastic]
# type = "elasticsearch"
# inputs = ["syslog", "auth_logs"]
# endpoints = ["http://<isaiah-tailscale-ip>:9200"]
# index = "guardquote-logs-%Y-%m-%d"

# Test config
vector validate

# Restart Vector
sudo systemctl restart vector
```

**On pi1 (services):**
```bash
ssh pi1

# Same process for API logs
sudo nano /etc/vector/vector.toml

# Restart
sudo systemctl restart vector
```

### Step 3: Document Changes

```bash
# Back on WSL
cd ~/workspace/guard-quote-repo

# Create/update config docs
mkdir -p configs/vector
# Copy configs here for reference
```

### Step 4: Commit and Push

```bash
git add -A
git status

git commit -m "#45: Configure Vector sinks for Elastic Stack

- Added Elasticsearch output to pi0 Vector config
- Added Elasticsearch output to pi1 Vector config
- Configured log sources: auth.log, syslog, API logs
- Waiting on Isaiah for Elastic endpoint details"

git push -u origin feature/45-vector-elastic
```

### Step 5: Create Pull Request

```bash
# Option A: GitHub CLI
gh pr create --base dev --title "#45: Vector Elastic integration"

# Option B: GitHub web UI
# Go to: https://github.com/jag18729/guard-quote/compare/dev...feature/45-vector-elastic
```

### Step 6: After PR Approved

```bash
# Merge to dev (via GitHub UI or CLI)
gh pr merge --squash

# Clean up local branch
git checkout dev
git pull origin dev
git branch -d feature/45-vector-elastic
```

---

## ⚠️ Conflict Resolution

```bash
# If you get conflicts during merge/rebase:

# 1. See what's conflicting
git status

# 2. Open conflicting files, look for:
# <<<<<<< HEAD
# your changes
# =======
# their changes
# >>>>>>> branch-name

# 3. Edit to resolve, remove markers

# 4. Stage resolved files
git add path/to/resolved-file.ts

# 5. Continue
git rebase --continue
# or
git merge --continue
```

---

## 🔗 Useful Aliases

Add to `~/.gitconfig`:

```ini
[alias]
    co = checkout
    br = branch
    ci = commit
    st = status
    lg = log --oneline --graph --all
    unstage = reset HEAD --
    last = log -1 HEAD
    pf = push --force-with-lease
```

---

## 📁 Branch Naming Convention

```
feature/45-vector-elastic    # New feature tied to issue
bugfix/52-login-error        # Bug fix tied to issue
hotfix/urgent-security       # Urgent production fix
docs/update-readme           # Documentation only
refactor/cleanup-api         # Code cleanup
```

---

*Created: Feb 7, 2026*
