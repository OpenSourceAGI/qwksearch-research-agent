#!/usr/bin/env bash
#
# merge.sh
#
# First:
#   1. Stage all tracked and untracked changes.
#   2. Commit them with message "." if changes exist.
#   3. Immediately sync the current branch:
#      - Fetch origin.
#      - Merge the current branch's remote counterpart, if it exists.
#      - Push the current branch without force-pushing.
#
# Then, for every open same-repository PR targeting master:
#   1. Merge origin/master into the PR head branch locally.
#   2. Resolve content conflicts in favor of origin/master.
#   3. Push the updated PR branch.
#   4. Request a GitHub merge.
#
# Fork PRs are skipped.
# This script does not create PRs.
#
# Initial synchronization conflicts are NOT automatically resolved.
# If one occurs, the script aborts its merge and stops.
#
# macOS compatible:
# - Bash 3.2 compatible.
# - Uses macOS base64 -D.
#
# DRY_RUN=true prints planned writes without performing them.
# Reads reflect the current repository, not simulated future state.

set -Eeuo pipefail

BASE_BRANCH="${BASE_BRANCH:-master}"
MERGE_METHOD="${MERGE_METHOD:-merge}"
REQUIRE_GREEN_CHECKS="${REQUIRE_GREEN_CHECKS:-true}"
DELETE_BRANCH_AFTER_MERGE="${DELETE_BRANCH_AFTER_MERGE:-true}"
DRY_RUN="${DRY_RUN:-false}"

OWN_MERGE_ACTIVE="false"

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Error: required command not found: $1" >&2
    exit 1
  }
}

run() {
  if [[ "$DRY_RUN" == "true" ]]; then
    printf '[dry-run]'
    printf ' %q' "$@"
    printf '\n'
  else
    "$@"
  fi
}

cleanup() {
  local exit_code=$?

  trap - EXIT

  if [[ "$OWN_MERGE_ACTIVE" == "true" ]] &&
     git rev-parse -q --verify MERGE_HEAD >/dev/null 2>&1; then
    echo "Aborting the unfinished merge started by this script..." >&2
    git merge --abort || {
      echo "WARNING: merge abort failed; inspect git status." >&2
    }
  fi

  exit "$exit_code"
}

sync_current_branch() {
  local branch="$1"
  local remote_ref="refs/remotes/origin/$branch"

  echo "Synchronizing current branch: $branch"
  echo "Fetching origin..."
  run git fetch origin --prune

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] If origin/$branch exists, merge it before pushing."
    run git merge --ff --no-edit "$remote_ref"
  else
    if git show-ref --verify --quiet "$remote_ref"; then
      echo "Integrating origin/$branch into $branch..."

      OWN_MERGE_ACTIVE="true"

      # Fast-forward if possible; otherwise make a normal merge.
      # Do not automatically choose a side for initial-sync conflicts.
      if ! git merge --ff --no-edit "$remote_ref"; then
        echo "Error: could not integrate origin/$branch." >&2
        echo "The script will abort any merge it started." >&2
        echo "Resolve the branch synchronization manually, then rerun." >&2
        exit 1
      fi

      OWN_MERGE_ACTIVE="false"
    else
      echo "No origin/$branch found; the push will create it."
    fi
  fi

  echo "Pushing current changes on branch: $branch"
  run git push --set-upstream origin \
    "HEAD:refs/heads/$branch"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] Current-branch synchronization planned."
  else
    echo "Current branch synchronized: $branch"
  fi
}

update_base_branch() {
  echo "Updating $BASE_BRANCH..."
  run git fetch origin --prune

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] Check out or create $BASE_BRANCH from origin/$BASE_BRANCH."
    run git merge --ff-only "origin/$BASE_BRANCH"
    return 0
  fi

  if ! git show-ref --verify --quiet \
    "refs/remotes/origin/$BASE_BRANCH"; then
    echo "Error: origin/$BASE_BRANCH does not exist." >&2
    exit 1
  fi

  if git show-ref --verify --quiet "refs/heads/$BASE_BRANCH"; then
    git checkout "$BASE_BRANCH"
  else
    git checkout --track -b "$BASE_BRANCH" "origin/$BASE_BRANCH"
  fi

  # Refuse local-only base commits rather than implicitly include them
  # in every PR update.
  if ! git merge-base --is-ancestor \
    HEAD "refs/remotes/origin/$BASE_BRANCH"; then
    echo "Error: local $BASE_BRANCH has commits absent from origin/$BASE_BRANCH." >&2
    echo "Reconcile the base branch explicitly, then rerun." >&2
    exit 1
  fi

  git merge --ff-only "origin/$BASE_BRANCH"
}

merge_base_into_pr() {
  local incoming="origin/$BASE_BRANCH"
  local conflict_file

  echo "Merging $incoming into the PR branch..."

  if [[ "$DRY_RUN" == "true" ]]; then
    run git merge --ff --no-edit -X theirs "$incoming"
    return 0
  fi

  OWN_MERGE_ACTIVE="true"

  if git merge --ff --no-edit -X theirs "$incoming"; then
    OWN_MERGE_ACTIVE="false"
    return 0
  fi

  if ! git rev-parse -q --verify MERGE_HEAD >/dev/null 2>&1; then
    echo "Error: merge failed without an active merge to resolve." >&2
    exit 1
  fi

  # Do not treat an unrelated failure, such as a hook failure, as
  # permission to create a commit automatically.
  if [[ -z "$(git ls-files --unmerged)" ]]; then
    echo "Error: merge failed, but no unresolved paths were found." >&2
    exit 1
  fi

  echo "Resolving remaining conflicted paths using $incoming..."

  while IFS= read -r -d '' conflict_file; do
    printf '  Taking incoming version: %q\n' "$conflict_file"

    # Stage 3 is the incoming/master version.
    # If absent, resolve this path as deleted.
    if [[ -n "$(git ls-files --unmerged -- "$conflict_file" |
      awk '$3 == 3 { print; exit }')" ]]; then
      git checkout --theirs -- "$conflict_file"
      git add -- "$conflict_file"
    else
      git rm -f -- "$conflict_file"
    fi
  done < <(git diff --name-only --diff-filter=U -z)

  if [[ -n "$(git ls-files --unmerged)" ]]; then
    echo "Error: unresolved paths remain:" >&2
    git diff --name-only --diff-filter=U >&2
    exit 1
  fi

  git commit --no-edit
  OWN_MERGE_ACTIVE="false"
}

require_command git
require_command gh
require_command jq
require_command base64
require_command awk

case "$MERGE_METHOD" in
  merge|squash|rebase) ;;
  *)
    echo "Error: MERGE_METHOD must be merge, squash, or rebase." >&2
    exit 1
    ;;
esac

for setting in \
  "$REQUIRE_GREEN_CHECKS" \
  "$DELETE_BRANCH_AFTER_MERGE" \
  "$DRY_RUN"; do
  case "$setting" in
    true|false) ;;
    *)
      echo "Error: boolean settings must be true or false." >&2
      exit 1
      ;;
  esac
done

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
  echo "Error: run this inside the target Git repository." >&2
  exit 1
}

current_branch="$(git symbolic-ref --quiet --short HEAD)" || {
  echo "Error: HEAD is detached. Check out a branch first." >&2
  exit 1
}

# Refuse pre-existing operations before installing cleanup traps.
if git rev-parse -q --verify MERGE_HEAD >/dev/null 2>&1 ||
   [[ -n "$(git ls-files --unmerged)" ]] ||
   [[ -d "$(git rev-parse --git-path rebase-merge)" ]] ||
   [[ -d "$(git rev-parse --git-path rebase-apply)" ]] ||
   [[ -d "$(git rev-parse --git-path sequencer)" ]] ||
   git rev-parse -q --verify CHERRY_PICK_HEAD >/dev/null 2>&1 ||
   git rev-parse -q --verify REVERT_HEAD >/dev/null 2>&1; then
  echo "Error: an unfinished Git operation or unresolved conflicts exist." >&2
  echo "Finish or abort that operation before running this script." >&2
  exit 1
fi

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Explicitly resolve GitHub operations against origin.
origin_url="$(git remote get-url origin)"
repo_name="$(gh repo view "$origin_url" --json nameWithOwner --jq '.nameWithOwner')"

echo "Repository: $repo_name"
echo "Preparing current branch: $current_branch"

if [[ -n "$(git status --porcelain)" ]]; then
  echo 'Committing all current changes with message "."...'
  run git add --all
  run git commit -m "."
else
  echo "No uncommitted changes found."
fi

# Immediately sync after committing:
# fetch remote changes, merge them, then push the current changes.
# Also sync when there was nothing new to commit.
sync_current_branch "$current_branch"

update_base_branch

PR_COUNT=0
MERGED_COUNT=0
PENDING_COUNT=0
FAILED_COUNT=0
SKIPPED_COUNT=0
PLANNED_COUNT=0

pr_records="$(
  gh pr list \
    --repo "$repo_name" \
    --state open \
    --base "$BASE_BRANCH" \
    --limit 1000 \
    --json number,headRefName,title,isCrossRepository \
    --jq '.[] | @base64'
)"

while IFS= read -r encoded_pr; do
  [[ -z "$encoded_pr" ]] && continue

  PR_COUNT=$((PR_COUNT + 1))

  pr_json="$(printf '%s' "$encoded_pr" | base64 -D)"
  pr_number="$(printf '%s' "$pr_json" | jq -r '.number')"
  branch="$(printf '%s' "$pr_json" | jq -r '.headRefName')"
  title="$(printf '%s' "$pr_json" | jq -r '.title')"
  is_fork="$(printf '%s' "$pr_json" | jq -r '.isCrossRepository')"

  echo
  echo "================================================================"
  echo "PR #$pr_number: $title"
  echo "Branch: $branch -> $BASE_BRANCH"
  echo "================================================================"

  if [[ "$is_fork" == "true" ]]; then
    echo "Skipping fork PR; its head branch is not on origin."
    SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
    continue
  fi

  if [[ "$branch" == "$BASE_BRANCH" ]]; then
    echo "Skipping PR with head branch equal to the base branch."
    SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
    continue
  fi

  update_base_branch

  # Fetch the exact head branch into its remote-tracking ref.
  run git fetch origin \
    "+refs/heads/$branch:refs/remotes/origin/$branch"

  # Preserve local-only commits instead of overwriting them with checkout -B.
  if [[ "$DRY_RUN" != "true" ]] &&
     git show-ref --verify --quiet "refs/heads/$branch"; then
    if ! git merge-base --is-ancestor \
      "refs/heads/$branch" "refs/remotes/origin/$branch"; then
      echo "WARNING: local $branch has commits absent from origin/$branch." >&2
      echo "Skipping this PR to preserve local work." >&2
      SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
      continue
    fi
  fi

  run git checkout -B "$branch" "origin/$branch"

  merge_base_into_pr

  echo "Pushing updated PR branch..."
  run git push --set-upstream origin \
    "HEAD:refs/heads/$branch"

  # Guard the GitHub merge against a head update after our push.
  if [[ "$DRY_RUN" == "true" ]]; then
    head_sha="<updated-PR-head-SHA>"
  else
    head_sha="$(git rev-parse HEAD)"
  fi

  merge_args=(
    pr merge "$pr_number"
    --repo "$repo_name"
    "--$MERGE_METHOD"
    --match-head-commit "$head_sha"
  )

  if [[ "$DELETE_BRANCH_AFTER_MERGE" == "true" ]]; then
    merge_args+=(--delete-branch)
  fi

  if [[ "$REQUIRE_GREEN_CHECKS" == "true" ]]; then
    merge_args+=(--auto=false)
  else
    merge_args+=(--auto)
  fi

  echo "Requesting GitHub merge for PR #$pr_number..."

  if run gh "${merge_args[@]}"; then
    if [[ "$DRY_RUN" == "true" ]]; then
      PLANNED_COUNT=$((PLANNED_COUNT + 1))
    else
      pr_state="$(
        gh pr view "$pr_number" \
          --repo "$repo_name" \
          --json state \
          --jq '.state'
      )"

      if [[ "$pr_state" == "MERGED" ]]; then
        MERGED_COUNT=$((MERGED_COUNT + 1))
        echo "PR #$pr_number merged."
      else
        PENDING_COUNT=$((PENDING_COUNT + 1))
        echo "Merge request accepted; PR #$pr_number is not merged yet."
      fi
    fi
  else
    FAILED_COUNT=$((FAILED_COUNT + 1))
    echo "WARNING: merge request failed for PR #$pr_number." >&2
    echo "The PR branch update was already pushed." >&2
    echo "Check required checks, reviews, queue rules, or head changes." >&2
    echo "Continuing with remaining PRs." >&2
  fi
done <<< "$pr_records"

echo
echo "Summary:"
echo "  PRs found:                $PR_COUNT"
echo "  PRs merged:               $MERGED_COUNT"
echo "  Accepted but not merged:  $PENDING_COUNT"
echo "  Merge commands failed:    $FAILED_COUNT"
echo "  PRs skipped:              $SKIPPED_COUNT"
echo "  Dry-run merge requests:   $PLANNED_COUNT"

# Leave the repository on the updated base branch.
update_base_branch

if [[ "$FAILED_COUNT" -gt 0 ]]; then
  exit 1
fi