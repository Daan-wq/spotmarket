import type { CoursePlatform } from "@prisma/client";

interface QuestionSeed {
  prompt: string;
  options: string[];
  correctIndex: number;
}

interface LessonSeed {
  slug: string;
  title: string;
  estMinutes: number;
  isPublished: boolean;
  contentMd: string;
  questions: QuestionSeed[];
}

interface SectionSeed {
  slug: string;
  title: string;
  isPublished: boolean;
  badgeSlug: string;
  badgeTitle: string;
  lessons: LessonSeed[];
}

export interface CourseSeed {
  slug: string;
  platform: CoursePlatform;
  title: string;
  description: string;
  isPublished: boolean;
  sections: SectionSeed[];
}

const COMING_SOON_BODY = `_Coming soon._

This lesson is being written. Check back later.`;

const COMING_SOON_QUESTIONS: QuestionSeed[] = [];

// ─────────────────────────────────────────
// FOUNDATIONS
// ─────────────────────────────────────────
const FOUNDATIONS_COURSE: CourseSeed = {
  slug: "foundations",
  platform: "FOUNDATIONS",
  title: "Foundations",
  description:
    "Everything you need to know to submit clips, earn money, and win bounties on ClipProfit.",
  isPublished: true,
  sections: [
    {
      slug: "get-paid",
      title: "Get Paid",
      isPublished: true,
      badgeSlug: "foundations-get-paid",
      badgeTitle: "Earnings Pro",
      lessons: [
        {
          slug: "submitting-clips",
          title: "Submitting Clips",
          estMinutes: 4,
          isPublished: true,
          contentMd: `# Submitting Clips

Once you've joined a campaign and created content, it's time to submit your clips for tracking and payment.

## Pre-submission checklist

Before you submit, make sure your clip:

- Has been posted to a verified social account
- Follows all campaign requirements
- Uses the required hashtags or sounds (if applicable)
- Tags the required accounts (if applicable)
- Meets the minimum duration requirement
- Is publicly visible (not private or unlisted)

## How to submit

1. Open **Dashboard → Campaigns**
2. Click the campaign you want to submit to
3. Click **Submit Clip**
4. Paste your clip URL
5. Select the platform
6. Click **Submit**

## What happens after you submit

- **Verification** — your clip is checked for account ownership, platform match, and campaign requirements.
- **Tracking starts** — once verified, ClipProfit polls views and engagement every hour.
- **Performance monitoring** — you can watch the clip's earnings accumulate in real time.

## General requirements

These apply to **every** campaign on top of campaign-specific rules:

- Minimum **1,000 views** before a clip qualifies for tracking.
- Maximum **10 video submissions per platform per day**.

## Tracking statuses

| Status | What it means |
| --- | --- |
| **Pending** | Submitted, awaiting verification |
| **Tracking** | Active, earning money |
| **Paused** | Campaign paused, temporary hold |
| **Stopped** | Campaign ended or clip removed |
| **Rejected** | Failed verification or violates rules |

## Best practices

- Post during peak hours — generally 6–9 PM in your audience's timezone.
- Use trending sounds, hashtags, and formats.
- Reply to comments fast — early engagement boosts the algorithm.
- Quality over quantity. One viral clip earns more than ten mediocre ones.`,
          questions: [
            {
              prompt:
                "What is the minimum number of views before a clip qualifies for tracking?",
              options: ["100", "1,000", "10,000", "100,000"],
              correctIndex: 1,
            },
            {
              prompt: "What is the maximum number of video submissions per platform per day?",
              options: ["3", "5", "10", "Unlimited"],
              correctIndex: 2,
            },
            {
              prompt: "What does the 'Pending' status mean?",
              options: [
                "The clip has been rejected",
                "The clip is submitted and awaiting verification",
                "The clip is actively earning",
                "The campaign has ended",
              ],
              correctIndex: 1,
            },
          ],
        },
        {
          slug: "earnings-and-payouts",
          title: "Earnings & Payouts",
          estMinutes: 5,
          isPublished: true,
          contentMd: `# Earnings & Payouts

Your earnings are based on the **views** your clips generate. Each campaign sets its own per-1,000-view rate.

## Example

A TikTok clip in a campaign that pays **$15 per 1,000 views**:

\`\`\`
Clip views:        50,000
Campaign rate:     $15 per 1,000 views
Minimum threshold: 5,000 views

Calculation: (50,000 / 1,000) × $15 = $750
\`\`\`

You'd earn **$750** for that single clip.

## Minimum view thresholds

Most campaigns require a minimum number of views before paying out:

- Below threshold → not eligible for payment
- At or above threshold → eligible for payment

Only clips that meet or exceed the minimum get paid.

## Campaign caps

Campaigns can set caps to control budget:

| Cap type | What it limits | Example |
| --- | --- | --- |
| **Per clip** | Max earnings per individual clip | $500 / clip |
| **Per campaign** | Max total earnings across all your clips | $2,000 / campaign |
| **Total budget** | Campaign stops when the budget is depleted | $50,000 total |

Once a cap is reached, view tracking stops on your clip. **Submit early** to maximize earnings.

## Payment methods

Set your preferred payment method in **Dashboard → Settings**:

- **PayPal** — fastest (1–3 business days). Email must match your PayPal account exactly.
- **Crypto** — USDT, USDC, SOL USDC, BTC, ETH. Triple-check your wallet address; transactions are irreversible.
- **iDEAL / other** — contact support to arrange.

## Payment timeline

1. **Campaign ends** — tracking stops, final view counts lock in.
2. **Admin review (1–3 days)** — fraud checks, compliance, payment calc, final approval.
3. **Payment processing (3–5 days)** — funds sent to your method.
4. **You receive payment** — PayPal 1–3 days, crypto 1–24 hours, bank transfer 3–7 days.

## Where to track earnings

**Dashboard → Payments** shows total earned, pending, paid, plus per-campaign and per-platform breakdowns.`,
          questions: [
            {
              prompt: "How are earnings calculated?",
              options: [
                "Per clip submitted",
                "Per 1,000 views, at the campaign's rate",
                "A flat fee per campaign",
                "Per follower",
              ],
              correctIndex: 1,
            },
            {
              prompt:
                "What happens if a clip doesn't meet the minimum view threshold?",
              options: [
                "It earns half the rate",
                "It still earns the base rate",
                "It is not eligible for payment",
                "It is automatically deleted",
              ],
              correctIndex: 2,
            },
            {
              prompt: "How long does PayPal take after a campaign is approved?",
              options: [
                "Instant",
                "1–3 business days",
                "1–24 hours",
                "3–7 business days",
              ],
              correctIndex: 1,
            },
          ],
        },
        {
          slug: "bounties",
          title: "Bounties",
          estMinutes: 4,
          isPublished: true,
          contentMd: `# Bounties

Bounties are special rewards on top of your view-based earnings. They reward exceptional performance.

## Types of bounties

### View milestones

First clipper to reach a view threshold wins:

- First to **100K views**: $500
- First to **500K views**: $1,000
- First to **1M views**: $2,500

Only the first clipper to hit each threshold gets paid.

### Engagement bounties

Calculated at campaign end:

- Highest engagement rate: $300
- Most shares: $400
- Most comments: $300

### Creative bounties

Admin-judged based on quality:

- Best creative execution: $1,000
- Most on-brand content: $750
- Viral clip of the week: $500

## How to win

- **Submit early** — more time to accumulate views means a better shot at milestone bounties.
- **Drive engagement** — replies, shares, and comments compound into views.
- **Stand out** — original creative beats generic templates.

## Where to find bounties

Open any campaign and scroll to the **Available Bounties** section. You'll see every bounty type, the reward, and your progress toward it.

## Eligibility

Your clip must meet the campaign's minimum view threshold and pass all verification checks to qualify for bounties.`,
          questions: [
            {
              prompt: "Which clipper wins a view-milestone bounty?",
              options: [
                "Every clipper who hits the threshold",
                "Only the first clipper to reach it",
                "The clipper with the most followers",
                "A random eligible clipper",
              ],
              correctIndex: 1,
            },
            {
              prompt: "When are engagement bounties calculated?",
              options: [
                "At submission",
                "Hourly",
                "At campaign end",
                "Never — they're admin-judged",
              ],
              correctIndex: 2,
            },
            {
              prompt: "What's required to be eligible for a bounty?",
              options: [
                "10K followers minimum",
                "Posting on every platform",
                "Meeting the campaign minimum view threshold and passing verification",
                "Being invited by an admin",
              ],
              correctIndex: 2,
            },
          ],
        },
        {
          slug: "pot-system",
          title: "The Pot System",
          estMinutes: 3,
          isPublished: true,
          contentMd: `# The Pot System

Some campaigns use a **performance-based pot** for bonus rewards on top of view-rate earnings.

## How pots work

1. The campaign sets a pot value (e.g. $10,000).
2. Your performance is ranked against other clippers in the campaign.
3. Top performers split the pot when the campaign ends.

## Example

\`\`\`
Total pot:       $10,000
Your views:      500,000 (20% of total campaign views)
Your pot share:  $10,000 × 20% = $2,000
\`\`\`

This is **in addition** to your base view-rate earnings.

## How to maximize pot share

- Push for total view share, not just clip count.
- Submit early so views accumulate over the full campaign.
- Lean into the campaign's hooks — pot ranking rewards what the brand actually wants.`,
          questions: [
            {
              prompt: "How is your pot share calculated?",
              options: [
                "Equal split across all clippers",
                "Based on your % of total campaign views",
                "First-come, first-served",
                "Admin discretion",
              ],
              correctIndex: 1,
            },
            {
              prompt: "Is the pot share in addition to your view-rate earnings or instead of them?",
              options: ["Instead of", "In addition to", "Half each", "Only one campaign type uses pots"],
              correctIndex: 1,
            },
            {
              prompt: "What's the best way to maximize pot share?",
              options: [
                "Submit as many low-quality clips as possible",
                "Wait until the last day to submit",
                "Drive total view share over the full campaign",
                "Only post on TikTok",
              ],
              correctIndex: 2,
            },
          ],
        },
      ],
    },
    {
      slug: "cross-platform",
      title: "Cross-Platform Strategy",
      isPublished: false,
      badgeSlug: "foundations-cross-platform",
      badgeTitle: "Cross-Platform Pro",
      lessons: [
        {
          slug: "cross-platform-strategy",
          title: "Cross-Platform Strategy",
          estMinutes: 6,
          isPublished: false,
          contentMd: COMING_SOON_BODY,
          questions: COMING_SOON_QUESTIONS,
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────
// TIKTOK
// ─────────────────────────────────────────
const TIKTOK_COURSE: CourseSeed = {
  slug: "tiktok",
  platform: "TIKTOK",
  title: "TikTok",
  description:
    "Warm up new accounts, beat the trust score, and post for maximum distribution on TikTok.",
  isPublished: true,
  sections: [
    {
      slug: "warmup",
      title: "Account Warmup",
      isPublished: true,
      badgeSlug: "tiktok-warmup",
      badgeTitle: "Warmup Master",
      lessons: [
        {
          slug: "tiktok-warmup-day-1",
          title: "Warmup — Day 1",
          estMinutes: 5,
          isPublished: true,
          contentMd: `# TikTok Warmup — Day 1

TikTok doesn't trust new accounts. They've dealt with too many bots, so every new account passes through a trust-scoring system. Most people sink without realising the system exists.

Day 1 is about looking human. Don't post yet.

## What to do

- **Set up the profile fully.** Username, profile picture, name, bio. No links yet.
- **Spend 20–30 minutes scrolling the For You feed.** Watch full videos. Don't skip aggressively.
- **Like 5–10 videos** that match the niche you'll post in.
- **Follow 3–5 accounts** in that same niche. Don't go on a follow spree.
- **Read comments. Don't post comments yet.**

## What NOT to do

- Don't post any video.
- Don't add a link to your bio.
- Don't follow then unfollow.
- Don't only watch one tight category — TikTok wants to see breadth before it sees focus.
- Don't use images that match TikTok's duplicate database.

The trust score watches everything you do in the first 72 hours. Look like a real new user.`,
          questions: [
            {
              prompt: "Should you post a video on Day 1?",
              options: [
                "Yes, immediately",
                "Only if it's a re-upload",
                "No",
                "Only after 1 hour",
              ],
              correctIndex: 2,
            },
            {
              prompt: "Why does TikTok score new accounts?",
              options: [
                "To rank creators by skill",
                "Because they've dealt with too many bots",
                "To assign starting follower counts",
                "It's a paid feature",
              ],
              correctIndex: 1,
            },
            {
              prompt: "Which behavior is OK on Day 1?",
              options: [
                "Adding a link to your bio",
                "Following and unfollowing in bursts",
                "Liking 5–10 niche videos and watching the For You feed",
                "Posting two videos to test reach",
              ],
              correctIndex: 2,
            },
          ],
        },
        {
          slug: "tiktok-warmup-day-2",
          title: "Warmup — Day 2",
          estMinutes: 4,
          isPublished: true,
          contentMd: `# TikTok Warmup — Day 2

Day 2 deepens the signals. You're still not posting.

## What to do

- **Scroll For You for 20–30 minutes.** Same as Day 1.
- **Comment on 2–3 videos** in your niche. Real, short comments — not "🔥".
- **Save 2 videos to favourites.**
- **Watch a few longer videos to completion.** Watch-time is a strong human signal.
- **Briefly explore an adjacent niche** (5 minutes max) so the algorithm sees breadth.

## What NOT to do

- Don't post.
- Don't add a bio link.
- Don't mass-follow.
- Don't switch accounts on the same device repeatedly — TikTok flags this.

If you've followed Day 1 + Day 2 cleanly, your trust score is climbing. Tomorrow you'll do the warmup post.`,
          questions: [
            {
              prompt: "What's a strong human signal on Day 2?",
              options: [
                "Watching long videos to completion",
                "Posting a short clip to test",
                "Adding 5 links to bio",
                "Following 50 accounts in 5 minutes",
              ],
              correctIndex: 0,
            },
            {
              prompt: "What kind of comments should you leave?",
              options: [
                "Just emojis like 🔥",
                "Real, short comments on niche content",
                "Links to your other accounts",
                "Don't comment at all",
              ],
              correctIndex: 1,
            },
            {
              prompt: "Should you switch between accounts on the same device on Day 2?",
              options: [
                "Yes, freely",
                "Only with a VPN",
                "No — TikTok flags this",
                "Only on Wi-Fi",
              ],
              correctIndex: 2,
            },
          ],
        },
        {
          slug: "tiktok-warmup-day-3",
          title: "Warmup — Day 3 (the warmup post)",
          estMinutes: 5,
          isPublished: true,
          contentMd: `# TikTok Warmup — Day 3

Day 3 is the warmup post. This single video decides whether the trust check passes.

## Rules for the warmup post

- **Original content.** No re-uploads. No images that match TikTok's duplicate database.
- **Niche-aligned.** It must match the content you'll post going forward.
- **Strong first frame.** A real hook — text overlay or a striking visual in the first second.
- **Under 30 seconds** unless your niche genuinely needs longer.
- **Use 1 trending sound** that's relevant to the niche. Not the loudest trend — a relevant one.
- **No bio link yet.** That comes after the trust check passes.

## What to do after posting

- Don't refresh views obsessively.
- Reply to early comments naturally — engage like a human.
- Don't post a second video for 24 hours.

The next 24 hours are the trust check. Tomorrow's lesson explains how to read the result.`,
          questions: [
            {
              prompt: "What should the warmup post be?",
              options: [
                "A re-upload of a viral clip",
                "Original, niche-aligned content under 30 seconds with a strong first frame",
                "A long-form vlog",
                "A static image carousel",
              ],
              correctIndex: 1,
            },
            {
              prompt: "Should you add a bio link before the warmup post?",
              options: [
                "Yes",
                "Only on Day 1",
                "No — wait until the trust check passes",
                "It doesn't matter",
              ],
              correctIndex: 2,
            },
            {
              prompt: "When should you post the next video?",
              options: [
                "Immediately after",
                "Within 1 hour",
                "Wait at least 24 hours",
                "Never post a second video",
              ],
              correctIndex: 2,
            },
          ],
        },
        {
          slug: "tiktok-24h-check",
          title: "The 24-Hour Trust Check",
          estMinutes: 4,
          isPublished: true,
          contentMd: `# The 24-Hour Trust Check

24 hours after the warmup post, the views on that video tell you whether the trust check passed.

## How to read the result

- **0–200 views** → likely shadowbanned. Account is flagged. Don't post more — you'll bury yourself deeper.
- **200–1,000 views** → soft restriction. Trust score is low. Wait 48 more hours, drop another carefully crafted video.
- **1,000–10,000 views** → trust check passed. Normal new-account distribution. Start posting on a steady cadence.
- **10,000+ views** → strong trust score. Lean in fast.

## If you got shadowbanned

- Stop posting on that account.
- Don't try to "fix" it with more posts. You can't.
- Either start a fresh account on a clean device + IP, or contact TikTok support if you genuinely think it's an error.

## If you passed

- Add the bio link now.
- Post 1–2 videos per day during the first week.
- Keep the trending-sound habit and the strong-hook discipline from Day 3.

The warmup is the foundation everything else is built on. Skip it and the rest of your strategy doesn't matter.`,
          questions: [
            {
              prompt: "After 24 hours, fewer than 200 views likely means what?",
              options: [
                "Strong account",
                "Shadowban / flagged account",
                "Average new-account result",
                "TikTok bug",
              ],
              correctIndex: 1,
            },
            {
              prompt: "What should you do if you got 1,000–10,000 views?",
              options: [
                "Stop posting forever",
                "Start a new account",
                "Trust check passed — start posting on a steady cadence",
                "Pay TikTok to boost",
              ],
              correctIndex: 2,
            },
            {
              prompt: "When can you safely add a link to your bio?",
              options: [
                "Day 1",
                "Day 2",
                "Right before the warmup post",
                "Once the trust check has passed",
              ],
              correctIndex: 3,
            },
          ],
        },
      ],
    },
    {
      slug: "tiktok-posting",
      title: "TikTok Posting Basics",
      isPublished: true,
      badgeSlug: "tiktok-posting",
      badgeTitle: "TikTok Posting Pro",
      lessons: [
        {
          slug: "tiktok-best-practices",
          title: "TikTok Best Practices",
          estMinutes: 5,
          isPublished: true,
          contentMd: `# TikTok Best Practices

A short playbook for getting consistent reach on TikTok once your trust score is healthy.

## Length

Keep clips **under 30 seconds** for maximum engagement. The shorter your clip, the higher your average completion rate — and completion drives distribution.

## Trends

- Jump on trending sounds, formats, and challenges within **24–48 hours** of the trend breaking.
- Don't ride trends after they've peaked — late entries get throttled.

## Posting cadence

- **2–3 videos per day** during active campaigns.
- Don't post the same hook back-to-back. Vary the cold open.

## Engagement

- Reply to comments **within the first hour** of posting.
- Reply with video where it makes sense — duets, stitches, and video replies feed the algorithm.

## What works on TikTok

- Quick viral moments and reactions
- Trending dances and challenges
- 15–30 second educational tips
- Comedy and skit content
- Lifestyle and tutorial content

## Pro tips

- The **first frame** must hook viewers instantly. Open with motion, text, or a question.
- Use text overlays and effects for clarity — many viewers watch on mute first.
- Post during **peak evening hours (7–9 PM local)**.
- Cross-post the same idea to Reels and Shorts, but cut a separate edit for each platform.`,
          questions: [
            {
              prompt: "What's the recommended max length for a TikTok clip?",
              options: ["10 seconds", "Under 30 seconds", "60 seconds", "3 minutes"],
              correctIndex: 1,
            },
            {
              prompt: "How fast should you reply to comments?",
              options: [
                "Within the first hour",
                "Within a week",
                "Never",
                "Only after 24 hours",
              ],
              correctIndex: 0,
            },
            {
              prompt: "Best time window to jump on a trending sound?",
              options: [
                "Within 24–48 hours of the trend breaking",
                "Two weeks after",
                "Only when the trend has peaked",
                "Trends don't matter",
              ],
              correctIndex: 0,
            },
          ],
        },
      ],
    },
    {
      slug: "tiktok-advanced",
      title: "TikTok Advanced",
      isPublished: false,
      badgeSlug: "tiktok-advanced",
      badgeTitle: "TikTok Strategist",
      lessons: [
        { slug: "tiktok-hooks", title: "Hooks That Stop the Scroll", estMinutes: 6, isPublished: false, contentMd: COMING_SOON_BODY, questions: COMING_SOON_QUESTIONS },
        { slug: "tiktok-editing", title: "Editing for Retention", estMinutes: 7, isPublished: false, contentMd: COMING_SOON_BODY, questions: COMING_SOON_QUESTIONS },
        { slug: "tiktok-algorithm", title: "Algorithm Deep Dive", estMinutes: 8, isPublished: false, contentMd: COMING_SOON_BODY, questions: COMING_SOON_QUESTIONS },
      ],
    },
  ],
};

// ─────────────────────────────────────────
// INSTAGRAM
// ─────────────────────────────────────────
const INSTAGRAM_COURSE: CourseSeed = {
  slug: "instagram",
  platform: "INSTAGRAM",
  title: "Instagram",
  description: "Make Reels that the Instagram algorithm actually pushes.",
  isPublished: true,
  sections: [
    {
      slug: "instagram-posting",
      title: "Instagram Posting Basics",
      isPublished: true,
      badgeSlug: "instagram-posting",
      badgeTitle: "Reels Pro",
      lessons: [
        {
          slug: "instagram-best-practices",
          title: "Instagram Best Practices",
          estMinutes: 5,
          isPublished: true,
          contentMd: `# Instagram Best Practices

## Format

- **Reels (15–90 seconds)** for maximum reach.
- Always **vertical 9:16**. Anything else gets squeezed.

## Cadence

- **1–2 Reels per day** during campaigns.
- Avoid posting two Reels back-to-back within an hour — it splits your own audience.

## Audio

- Lean on trending sounds and music. Instagram favours Reels using audio that's gaining momentum.
- Layer your own voice or text-to-speech on top of the trending audio when relevant.

## Captions and hashtags

- Write engaging, brand-relevant captions. The first line is a hook — same rules as a video hook.
- Use **20–30 targeted hashtags**. Mix big (1M+ posts), medium (100K–1M), and small (under 100K).

## Pro tips

- Add text overlays for accessibility — many Instagram viewers watch on mute.
- Use Instagram's built-in effects and filters for native feel.
- Cross-post your best Reels to Stories with a "watch the full one →" tap-through.
- Reply to DMs from engaged viewers — DM replies are a strong relationship signal.`,
          questions: [
            {
              prompt: "What's the recommended Reels length window?",
              options: ["1–5 seconds", "15–90 seconds", "Over 3 minutes", "Exactly 60 seconds"],
              correctIndex: 1,
            },
            {
              prompt: "What's the right Reels aspect ratio?",
              options: ["1:1 square", "16:9 horizontal", "9:16 vertical", "4:5 portrait"],
              correctIndex: 2,
            },
            {
              prompt: "How many hashtags should you use?",
              options: ["1–3", "5–10", "20–30", "100+"],
              correctIndex: 2,
            },
          ],
        },
        {
          slug: "instagram-reels-format",
          title: "Reels Format Deep Dive",
          estMinutes: 4,
          isPublished: true,
          contentMd: `# Reels Format Deep Dive

Three things separate Reels that explode from Reels that flop.

## 1. The first second

The first second is the hook. If the viewer doesn't lean in, the algorithm doesn't push the Reel.

- Open with motion, contrast, or a bold text overlay.
- Avoid logos, intros, or anything that makes viewers think "this is an ad".

## 2. Watch-time vs. completion

Instagram weighs **completion rate** heavily. A 15-second Reel with 80% completion will outperform a 60-second Reel with 20% completion.

- Cut tighter than feels comfortable.
- Don't pad. Every second must earn its place.

## 3. The loop

If a Reel ends in a way that makes viewers rewatch, completion rate goes over 100% and the algorithm goes wild.

- Match the last frame to the first frame so it loops cleanly.
- End on a punchline that pays off only on the second watch.`,
          questions: [
            {
              prompt: "Which signal does Instagram weigh heavily on Reels?",
              options: ["Likes only", "Completion rate", "Hashtag count", "Caption length"],
              correctIndex: 1,
            },
            {
              prompt: "Why design a Reel to loop?",
              options: [
                "It saves storage space",
                "Loops push completion rate over 100% and trigger more distribution",
                "Instagram requires it",
                "It doesn't matter",
              ],
              correctIndex: 1,
            },
            {
              prompt: "Best opening for a Reel?",
              options: [
                "A 3-second logo intro",
                "A talking-head greeting",
                "Motion, contrast, or a bold text overlay",
                "Black screen for suspense",
              ],
              correctIndex: 2,
            },
          ],
        },
        {
          slug: "instagram-captions-hashtags",
          title: "Captions & Hashtags",
          estMinutes: 4,
          isPublished: true,
          contentMd: `# Captions & Hashtags

The caption is part of the algorithm input — not just decoration.

## Captions

- **First line is a hook.** It's the only line visible before "more".
- Keep it scannable: short sentences, line breaks, no walls of text.
- End with a soft CTA — a question, a "save this for later", or a "follow for part 2".

## Hashtag strategy

Use **20–30 hashtags**, layered:

| Tier | Posts using it | Examples |
| --- | --- | --- |
| **Big** | 1M+ | broad-niche tags — pull volume |
| **Medium** | 100K–1M | mid-niche — main growth zone |
| **Small** | under 100K | hyper-niche — easier to rank in |

Rotate hashtag sets across posts. Reusing the exact same set every time looks spammy.

## Hashtag placement

- Either the **first line of the caption** (hidden by "more") or the **first comment**. Both work; pick one and be consistent.

## What not to do

- Don't use banned or low-quality hashtags — Instagram silently throttles posts that use them.
- Don't stuff unrelated tags. Distribution drops when hashtags don't match content.`,
          questions: [
            {
              prompt: "Which line of the caption needs to be a hook?",
              options: ["The last line", "The first line", "The middle", "It doesn't matter"],
              correctIndex: 1,
            },
            {
              prompt: "How should hashtag tiers be mixed?",
              options: [
                "Only big (1M+) tags",
                "Only small under-100K tags",
                "A layered mix of big, medium, and small tags",
                "Random tags",
              ],
              correctIndex: 2,
            },
            {
              prompt: "Where can hashtags be placed?",
              options: [
                "Only in DMs",
                "First line of the caption or in the first comment",
                "Only in Stories",
                "In the bio only",
              ],
              correctIndex: 1,
            },
          ],
        },
      ],
    },
    {
      slug: "instagram-advanced",
      title: "Instagram Advanced",
      isPublished: false,
      badgeSlug: "instagram-advanced",
      badgeTitle: "Instagram Strategist",
      lessons: [
        { slug: "instagram-warmup", title: "Account Warmup", estMinutes: 6, isPublished: false, contentMd: COMING_SOON_BODY, questions: COMING_SOON_QUESTIONS },
        { slug: "instagram-strategy", title: "Growth Strategy", estMinutes: 7, isPublished: false, contentMd: COMING_SOON_BODY, questions: COMING_SOON_QUESTIONS },
      ],
    },
  ],
};

// ─────────────────────────────────────────
// YOUTUBE
// ─────────────────────────────────────────
const YOUTUBE_COURSE: CourseSeed = {
  slug: "youtube",
  platform: "YOUTUBE",
  title: "YouTube",
  description: "Get YouTube Shorts pushed to the right viewers.",
  isPublished: true,
  sections: [
    {
      slug: "youtube-posting",
      title: "YouTube Posting Basics",
      isPublished: true,
      badgeSlug: "youtube-posting",
      badgeTitle: "Shorts Pro",
      lessons: [
        {
          slug: "youtube-shorts-best-practices",
          title: "Shorts Best Practices",
          estMinutes: 5,
          isPublished: true,
          contentMd: `# YouTube Shorts Best Practices

## Length

- **Under 60 seconds.** Shorts above 60 seconds are demoted to standard videos.
- Aim for the shortest version that delivers the payoff.

## The first 3 seconds

YouTube tracks the first-3-seconds drop-off rate hard. Open with:

- A bold visual or motion.
- A direct question.
- A pattern interrupt — sound, text, or scene change.

Avoid logos and slow intros.

## Thumbnails

Even Shorts get a thumbnail in some surfaces (subscriptions feed, sharing).

- Pick a **single high-contrast frame** with a clear focal point.
- Faces with clear emotion outperform abstract shots.

## Timing

- Post **6–9 PM local time** for maximum first-hour reach.
- Consistency beats single-post timing — same daily slot trains the algorithm.

## SEO

Shorts ARE indexed for search:

- Use trending keywords in the title.
- Add hashtags in the description (3 strong ones beat 20 weak ones).
- The first line of the description is what appears with the share preview.

## Engagement

- Respond to comments within the **first hour**.
- Pin a smart comment that drives replies.

## Cross-promotion

Cross-promote between your main channel and Shorts:

- Pin a Shorts playlist on your channel.
- Mention your long-form video in a Short, and link to the Short from the long-form.`,
          questions: [
            {
              prompt: "What's the max length for a YouTube Short?",
              options: [
                "30 seconds",
                "60 seconds",
                "3 minutes",
                "10 minutes",
              ],
              correctIndex: 1,
            },
            {
              prompt: "Best posting time window for YouTube Shorts?",
              options: [
                "3–5 AM local",
                "12–2 PM local",
                "6–9 PM local",
                "Only weekends",
              ],
              correctIndex: 2,
            },
            {
              prompt: "What's the most important window for retention?",
              options: [
                "The last 3 seconds",
                "The first 3 seconds",
                "The middle of the video",
                "The thumbnail only",
              ],
              correctIndex: 1,
            },
          ],
        },
        {
          slug: "youtube-thumbnails-seo",
          title: "Thumbnails & SEO for Shorts",
          estMinutes: 4,
          isPublished: true,
          contentMd: `# Thumbnails & SEO for Shorts

Shorts are pushed by the feed AND by search. Most clippers ignore the search half — that's where you can win.

## Title

- Front-load the keyword. The first 4 words matter most.
- Use a strong noun or verb, not a clever pun.
- Aim for **40–60 characters**.

## Description

- First line shows in the share card and at the top of the watch page.
- Include 2–3 hashtags relevant to the content.
- Add a link to a related video on your channel — not always to a website.

## Thumbnail (custom)

- High-contrast subject.
- Big, readable text (under 4 words).
- Clear emotion in the face if there's a person.
- Avoid full-bleed text; the corners get clipped on mobile previews.

## Hashtags vs keywords

- Hashtags are for surfacing in hashtag pages.
- Keywords in title + description are for surfacing in search.
- Both matter. Don't skip either.`,
          questions: [
            {
              prompt: "Where do title keywords matter most?",
              options: [
                "The last word",
                "The first 4 words",
                "Only in lowercase",
                "Only emojis matter",
              ],
              correctIndex: 1,
            },
            {
              prompt: "How many hashtags should the description include?",
              options: ["None", "2–3 relevant tags", "30+", "Only banned ones"],
              correctIndex: 1,
            },
            {
              prompt: "What's a good thumbnail rule?",
              options: [
                "Tiny text in the corner",
                "Black-and-white with no subject",
                "High contrast, big readable text under 4 words, clear emotion",
                "No thumbnail at all",
              ],
              correctIndex: 2,
            },
          ],
        },
      ],
    },
    {
      slug: "youtube-advanced",
      title: "YouTube Advanced",
      isPublished: false,
      badgeSlug: "youtube-advanced",
      badgeTitle: "YouTube Strategist",
      lessons: [
        { slug: "youtube-warmup", title: "Channel Warmup", estMinutes: 6, isPublished: false, contentMd: COMING_SOON_BODY, questions: COMING_SOON_QUESTIONS },
        { slug: "youtube-strategy", title: "Growth Strategy", estMinutes: 7, isPublished: false, contentMd: COMING_SOON_BODY, questions: COMING_SOON_QUESTIONS },
      ],
    },
  ],
};

// ─────────────────────────────────────────
// X
// ─────────────────────────────────────────
const X_COURSE: CourseSeed = {
  slug: "x",
  platform: "X",
  title: "X (Twitter)",
  description: "Post for reach and engagement on X.",
  isPublished: true,
  sections: [
    {
      slug: "x-posting",
      title: "X Posting Basics",
      isPublished: true,
      badgeSlug: "x-posting",
      badgeTitle: "X Posting Pro",
      lessons: [
        {
          slug: "x-best-practices",
          title: "X Best Practices",
          estMinutes: 5,
          isPublished: true,
          contentMd: `# X (Twitter) Best Practices

## Timing

X has clearer peaks than other platforms:

- **9 AM, 1 PM, 8 PM EST** are the highest-reach windows for most niches.
- Adjust to your audience's primary timezone.

## Format

- Keep text **concise and punchy** — front-load the value.
- Always include a visual where possible: image, GIF, or video.
- Single-tweet posts beat threads for new accounts.

## Hashtags

- **Sparingly**. 1–2 max, only if relevant.
- Tagging into a trending hashtag works only if your post genuinely fits the conversation.

## What works on X

- Breaking news and trending topics
- Viral memes and humor
- Hot takes and opinions
- Real-time event coverage
- Threaded content for established accounts

## Engagement

- Respond to replies and quote-tweets fast — first-hour engagement compounds.
- Quote-tweet with commentary instead of plain RT — quote-tweets get pushed harder.
- Use **polls and questions** to drive replies. Replies are a stronger signal than likes.

## Pro tips

- Threads work, but only if every tweet stands alone if pulled out of the thread.
- Use **Spaces** to build relationships with other creators in your niche.
- A pinned tweet should be your **best-performing** tweet, not your latest.`,
          questions: [
            {
              prompt: "What are the highest-reach time slots on X (EST)?",
              options: [
                "3 AM, 5 AM, 7 AM",
                "9 AM, 1 PM, 8 PM",
                "Only weekends",
                "Midnight only",
              ],
              correctIndex: 1,
            },
            {
              prompt: "How many hashtags should you use per X post?",
              options: ["20–30", "10", "1–2 max, only if relevant", "Always 5"],
              correctIndex: 2,
            },
            {
              prompt: "Quote-tweets vs plain retweets — which gets pushed harder?",
              options: [
                "Plain retweets",
                "Quote-tweets with commentary",
                "Both equally",
                "Neither — only original tweets matter",
              ],
              correctIndex: 1,
            },
          ],
        },
        {
          slug: "x-timing-threads",
          title: "Timing & Threads",
          estMinutes: 4,
          isPublished: true,
          contentMd: `# Timing & Threads on X

## Timing

- Cluster posts around the **9 AM / 1 PM / 8 PM** EST peaks.
- Don't post all three slots with the same hook — vary it.
- Track which slot lifts hardest for your specific niche; once you know, double down.

## Threads

A thread on X is a sequence of replies to your own tweet. The algorithm rewards threads when:

- The first tweet stands alone as a hook.
- Each subsequent tweet has its own mini-payoff.
- The last tweet has a clear CTA — follow, like, save, reply.

### Thread anatomy

1. **Tweet 1 — the hook.** A claim, a list promise, or a curiosity gap.
2. **Tweets 2–N — the body.** One idea per tweet. Tight, scannable.
3. **Last tweet — the CTA.** Ask for the follow or the reply.

## Polls and questions

Polls are an easy reply-driver:

- 2–4 options, with a clear "right" choice that nudges replies.
- 24-hour duration is the sweet spot.

## What to avoid

- Don't post identical threads back-to-back. The algorithm flags repetition.
- Don't post a thread if you don't have at least 4 strong tweets — short threads underperform single tweets.`,
          questions: [
            {
              prompt: "What's the best length for a thread?",
              options: [
                "2 tweets",
                "3 tweets",
                "At least 4 strong tweets",
                "30+ tweets",
              ],
              correctIndex: 2,
            },
            {
              prompt: "What's the role of the first tweet in a thread?",
              options: [
                "A disclaimer",
                "A hook that stands alone",
                "A table of contents",
                "It doesn't matter",
              ],
              correctIndex: 1,
            },
            {
              prompt: "Why use polls?",
              options: [
                "They are mandatory",
                "They drive replies, which are a stronger signal than likes",
                "They unlock paid features",
                "They auto-promote your account",
              ],
              correctIndex: 1,
            },
          ],
        },
      ],
    },
    {
      slug: "x-advanced",
      title: "X Advanced",
      isPublished: false,
      badgeSlug: "x-advanced",
      badgeTitle: "X Strategist",
      lessons: [
        { slug: "x-warmup", title: "Account Warmup", estMinutes: 6, isPublished: false, contentMd: COMING_SOON_BODY, questions: COMING_SOON_QUESTIONS },
        { slug: "x-strategy", title: "Growth Strategy", estMinutes: 7, isPublished: false, contentMd: COMING_SOON_BODY, questions: COMING_SOON_QUESTIONS },
      ],
    },
  ],
};

export const COURSE_SEEDS: CourseSeed[] = [
  FOUNDATIONS_COURSE,
  TIKTOK_COURSE,
  INSTAGRAM_COURSE,
  YOUTUBE_COURSE,
  X_COURSE,
];
