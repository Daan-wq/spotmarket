# Signal Reject Clip Action

## Goal
Let admins reject a submission directly from the Signals page when a signal shows bot/fraud evidence.

## Approach
- Add a destructive "Clip afwijzen" action for open `BOT_SUSPECTED` signals.
- Use the existing submission review endpoint with `REJECTED` and `BOT_TRAFFIC`.
- After the rejection succeeds, resolve the signal and refresh the page.
- Keep the action behind a confirmation dialog.

## Verification
- Add a focused component test for the bot-signal action.
- Run the focused test, lint for the edited component, TypeScript, and build.
