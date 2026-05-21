# Admin Clip Review Minimal Plan

## Goal

Simplify admin clip review so reviewers only open the submitted post, approve, or reject with a required rejection note.

## Scope

- Remove the scorecard form and scorecard display from `/admin/review`.
- Remove manual baseline/current view inputs from submission approval.
- Let approval use the stored API-refreshed `viewCount` and existing `baselineViews`.
- Keep rejection notes explicit and required in the review controls.

## Verification

- Run lint and build for the Next.js app.
- Commit and push the master worktree after verification.
