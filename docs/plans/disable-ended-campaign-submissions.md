# Disable Submissions For Ended Campaigns

## Summary

- Grey out and disable every creator-facing submit action when a campaign no longer accepts submissions.
- Add a server-side guard so direct `/api/submissions` calls cannot create submissions for ended campaigns.
- Treat a campaign as closed for submissions when its status is not `active` or its deadline date has passed.

## Implementation

- Add a shared campaign submission-state helper that keeps "ends today" submittable and closes campaigns only after the deadline date has passed.
- Reuse the helper in the campaign badge display, submission API, application join API, and creator UI submit entrypoints.
- Disable campaign detail, campaign list, application detail, submit page, account content picker, and video-grid submit actions for closed campaigns.
- Preserve existing history, earnings, contact, and submitted-clip viewing behavior.

## Verification

- Add focused unit coverage for the helper.
- Add API coverage for blocking ended campaign submissions.
- Run `npm run lint`, `npm run test`, and `npm run build`.
