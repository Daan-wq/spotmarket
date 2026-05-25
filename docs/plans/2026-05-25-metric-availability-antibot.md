# Metric availability and anti-bot false positives

## Goal

Fetch every officially available per-video metric through the central OAuth metric pipeline, store whether each metric was actually available, and make anti-bot scoring ignore unavailable metrics instead of treating them as zero.

## Official API availability

- TikTok Display API video list exposes view, like, comment, share, video metadata, and cover/share URLs for the `video.list` scope. It does not expose save/favorite count for Display API videos.
- Instagram media insights with `instagram_business_manage_insights` can expose views, reach, likes, comments, saved, shares, total interactions, follows/profile visits, and Reel watch-time metrics, depending on media type.
- YouTube Data API exposes public video statistics such as views, likes, and comments. YouTube Analytics API with `yt-analytics.readonly` exposes additional owner analytics such as shares, estimated minutes watched, and average view duration.
- Facebook Graph API can expose video views/insights, comments, shares, reactions, reach, watch-time, and reaction breakdowns for owned page content. It does not expose a generic save count equivalent for the current page/reel fetch.

## Implementation plan

1. Add `metricAvailability` to `MetricSnapshot` and shared metric contracts.
2. Update each platform fetcher to return all known official metrics plus availability flags.
3. Store unavailable nullable summary fields as `null` on `CampaignSubmission`, while keeping required snapshot counters numeric for compatibility.
4. Update anti-bot scoring to only use available metrics and suppress engagement-collapse scoring when cumulative available engagement is healthy.
5. Update admin evidence/UI to show `Niet beschikbaar` for unavailable evidence values.
6. Add/adjust focused tests and run verification.
