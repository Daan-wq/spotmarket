# Facebook App Review — How to Get Approved

> Source: [Rejection Guide](https://developers.facebook.com/docs/resp-plat-initiatives/appreview/tutorial/rejection-guide/) & [Common Mistakes](https://developers.facebook.com/docs/app-review/submission-guide/common-mistakes/)

---

## The 6 Instant-Rejection Triggers

These will get your **entire submission** rejected (not just one permission):

1. **App is inaccessible** — reviewer can't load it (web URL down, APK broken, iOS build wrong format)
2. **Facebook Login missing or broken** — they can't find the button or it doesn't work
3. **Fake Facebook accounts** — never provide real FB credentials; use Facebook's **Test User** system
4. **Missing screen recordings** — every permission/feature needs its own screencast demo
5. **App not finished** — placeholder content, broken features, or "coming soon" sections = rejected
6. **Requesting permissions you don't use yet** — "we'll need it later" is not accepted. Only request what's actively used NOW

---

## The 17 Specific Rejection Reasons (Grouped)

### Access/Testing Failures

- Web app not loading (URL wrong, behind VPN/internal network)
- Android APK won't install (must support Android 6.0+)
- iOS build wrong format (must be `.ipa`, zipped `.ipa`, or `.app` for Xcode 8.0+)
- Test credentials don't work
- Can't verify permissions during testing (screencast doesn't match reality)

### Login/Auth Issues

- Can't locate Facebook Login button
- Facebook Login button is broken
- Facebook Login in a custom WebView (in-app browsers can't share cookies — use the SDK properly)
- Can't test Instagram Business Account connection steps

### Policy Violations

- Misuse of Facebook brand (names like "FB Friend Smash", implying partnership)
- Canvas app redirects users off Facebook
- App incentivizes unapproved actions (e.g., rewarding users for Instagram likes/follows)
- App provides personality/character assessments (Section 1.10 — "minimal utility")
- Policy 1.7: app name/icon/description is misleading or deceptive
- Policy 8.9: requesting user data without meaningfully improving their experience

### Readiness

- App doesn't reflect final user experience (still in dev)
- Page Public Content Access requested without a valid use case

---

## Submission Checklist (What Reviewers Expect)

| Requirement | Details |
|---|---|
| **Screencast** | One per permission/feature. Show the FULL flow: login → use feature → result. Must match current app exactly |
| **Test User** | Created via Facebook's Test User system (not a fake account). Email + password included in submission |
| **App Verification Details** | Step-by-step instructions for reviewer. Include: where to find Login button, how to trigger each permission, any non-FB credentials needed |
| **Working URL/Build** | Web: publicly accessible URL. Android: APK link. iOS: Simulator build (.ipa/.app) |
| **All features complete** | No "coming soon", no broken flows, no placeholder UI |
| **Only needed permissions** | Every requested permission must be actively demonstrated in the screencast |

---

## Key Tactical Takeaways

1. **Test as the reviewer would** — Create a fresh Test User, follow your own instructions step-by-step, and screen record it. If YOU can't reproduce it, they can't either.

2. **One permission = one clear demo** — Don't bundle. Show each permission being used individually.

3. **Never reference future plans** — Everything you request must work RIGHT NOW in the submitted build.

4. **Branding matters** — Don't use "FB", "Insta", or anything resembling Meta's brands in your app name, icon, or description.

5. **No incentivized engagement** — You can incentivize login or entering a promotion. You CANNOT reward likes, follows, shares, or other engagement.

6. **Data must serve the user** — If you request data access, you must demonstrably improve the user's experience with it. "We collect it for analytics" isn't enough.

7. **Live apps updating?** — Create a Test App from the live app, develop there, then submit the Test App for review.
