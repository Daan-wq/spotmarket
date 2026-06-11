# Antibot Page Audience

## Goal

Replace the recent-velocity, account-median, and comparable-video UI on the
anti-bot signal detail page with a clear audience-country analysis. Add four
anti-bot risk points for every percentage point of audience located in Asia.

## Implementation

1. Add a shared audience-risk utility that:
   - normalizes country shares stored as fractions or percentages;
   - identifies Asian country codes;
   - calculates `Asian audience percentage * 4` risk points.
2. Load the latest follower audience snapshot during metric polling and open
   signal recomputation, then pass its countries into the velocity scorer.
3. Add audience geography as explainable anti-bot evidence while preserving the
   existing 0-100 total score cap.
4. Load the same audience snapshot on the signal detail page and render a
   ranked country distribution with Asian-country and score-impact indicators.
5. Remove the recent-speed card, account-median card, and comparable-videos
   section.

## Verification

- Unit-test fraction and percentage normalization.
- Unit-test Asian-country scoring and non-Asian exclusions.
- Unit-test velocity scoring with high-Asia and missing-audience inputs.
- Run targeted Vitest suites.
- Run ESLint and TypeScript checks.
- Run the production build.
