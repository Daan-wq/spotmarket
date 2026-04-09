# Topr.io Creator Dashboard — Complete UI/UX Analysis

> **Purpose:** Reference spec for updating ClipProfit's creator dashboard. Every visible UI element, layout pattern, interaction, and UX flow is documented below.

---

## 1. Global Shell (Present on Every Page)

### 1.1 Left Sidebar Navigation
- **Width:** ~160px fixed, always visible (not collapsible in screenshots)
- **Background:** White/very light gray
- **Top:** Logo area — green diamond/leaf icon + "Topr" wordmark in dark bold text
- **Nav items (top to bottom):**
  1. **Campaigns** — icon: looping arrows / refresh-style icon, purple/indigo fill when active
  2. **My Videos** — icon: video/clapboard icon
  3. **Dashboard** — icon: grid/dashboard icon
  4. **Leaderboard** — icon: trophy/star icon
  5. **Notifications** — icon: bell icon
  6. **Profile** — icon: person silhouette icon
- **Active state:** Item gets a filled purple/indigo (#6366F1-ish) rounded pill background with white text and white icon. Inactive items are dark gray text with gray icons.
- **Bottom of sidebar — Balance widget:**
  - Small wallet icon + "Balance" label
  - Two columns: "Available" (left, dark text, shows dollar amount) and "Pending" (right, purple text, shows dollar amount)
  - Example: Available $0 | Pending $0
- **User footer (very bottom):**
  - Circular avatar (letter initial, teal/green background)
  - Username ("daan0529") in bold
  - Role label underneath: "Creator" in gray
  - Chevron/caret up icon — clicking reveals a popover menu with:
    - "Account" (person icon)
    - "Sign out" (exit/arrow icon)

### 1.2 Top Bar / Header
- **Left side:** Breadcrumb navigation — uses " > " separator. Examples: `Campaigns > Onefloe UGC > Contact Brand`. Each segment is a clickable link in gray, with the current page in darker/bolder text.
- **Left of breadcrumbs:** Small sidebar toggle icon (two vertical bars)
- **Right side:**
  - "Feedback" button — outlined/ghost style, has a chat bubble icon + "Feedback" text
  - Theme toggle icon — sun/gear icon to the right of Feedback (likely dark mode toggle)

---

## 2. Campaigns Page (`/campaigns`)

### 2.1 Tab Switcher (Top Center)
- Horizontal toggle with two options: **"My Campaigns"** and **"Marketplace"**
- Styled as a segmented control / pill toggle with a white background card
- Each option has an icon: My Campaigns (refresh/loop icon), Marketplace (shopping bag/store icon)
- Active tab has a subtle selected state (slightly different background)
- The Marketplace tab is shown as active in the screenshot

### 2.2 Search Bar
- Full-width search input centered below tabs
- Placeholder: "Find your perfect campaign..."
- Search icon (magnifying glass) on the left inside the input
- Rounded corners, light border

### 2.3 Filter Row
- Horizontal row of dropdown filters below the search bar:
  1. **Reward Rate** — dropdown, default "All rates"
  2. **Platform** — dropdown, default "All platforms"
  3. **Category** — dropdown, default "All categories"
  4. **Type** — dropdown, default "All types"
- Each dropdown has a chevron-down indicator
- Labels are to the left of each dropdown in gray

### 2.4 Recently Visited Section
- Section header: clock icon + "Recently Visited" in gray text
- Horizontal row of campaign cards (3 per row visible in desktop)

### 2.5 Campaign Cards (Marketplace Grid)
- **Layout:** Card grid, 3 columns on desktop
- **Card structure:**
  - **Top-left:** Brand logo (circular or square, ~40px)
  - **Title:** Campaign name in bold dark text, truncated with "..." if too long
  - **Reward rate:** Large bold text showing rate — e.g., "$1.2" or "$1" — followed by lighter "/1K views" text
  - **Progress bar:** Thin horizontal bar showing payout progress
  - **Progress text:** "$0 of $2000 paid out" on the left, percentage "0%" on the right
  - **Bottom row:** 
    - Platform icons (Instagram gradient icon, TikTok icon, YouTube icon) — small ~20px circular colored icons
    - "UGC" badge — small purple rounded pill on the far right
- **Card styling:** White background, subtle rounded border/shadow, light hover state likely
- **Empty state at bottom of "My Campaigns" tab:**
  - Large purple link/chain icon centered
  - "No campaigns yet" heading in bold
  - Subtext: "You haven't joined any campaigns yet. Explore the marketplace to find campaigns that match your style!"
  - CTA button: Purple filled button "Find my first campaign!" with a small icon

---

## 3. Campaign Detail Page (`/campaign/[id]`)

### 3.1 Top Bar
- **Back button:** "< Back" link, left-aligned
- **Right side:** Two ghost/outlined buttons:
  - "Share" — share icon + text
  - "Contact" — chat bubble icon + text

### 3.2 Campaign Header (Centered)
- **Campaign name:** Large bold heading centered (e.g., "Onefloe UGC")
- **Brand logo:** Large square/rectangular placeholder centered above name (gray background, brand logo inside)

### 3.3 Primary CTA
- **"+ Create Content for this Campaign"** — full-width (or nearly) purple/indigo filled button, centered, rounded, white text, plus icon on left
- This is the main action button on the page

### 3.4 Payout Progress Section
- **Label:** "PAID OUT" + bold percentage (e.g., "0%")
- **Progress text:** "$0.00 of $1.00 paid out"
- **Progress bar:** Thin horizontal bar (subtle, empty when 0%)

### 3.5 Campaign Metadata Row
- Horizontal row of key-value pairs:
  1. **REWARD** — Green pill badge showing rate: "$1 / 1K" 
  2. **TYPE** — Plain text: "UGC"
  3. **PAYOUT RANGE** — Plain text: "$0 - $100"
  4. **CATEGORY** — Plain text: "Products"
  5. **PLATFORMS** — Row of platform icons (Instagram, TikTok, YouTube)
- Labels are small gray uppercase text, values below in bold/darker text

### 3.6 Requirements Section
- **Header:** "REQUIREMENTS" in uppercase gray
- **Content:** Numbered steps displayed as horizontal pills/chips:
  1. "1/ Select any format in found in the google docs instruction"
  2. "2/ Post the video on your TikTok/instagram account"
  3. "3/ Upload the video to the campaign"
  4. "4/ The app will track the views and you can collect payouts per CPM"
- Each step is in a light gray rounded pill/chip with dark text

### 3.7 Available Content Section
- **Header:** "AVAILABLE CONTENT" in uppercase gray
- **Content:** Clickable link/button — "Onefloe Instructions and video formats" styled as an underlined link or chip

### 3.8 Your Submissions Section
- **Header:** "YOUR SUBMISSIONS" in uppercase gray
- **Subtext:** "See what content you've submitted to this campaign. We'll show it here as soon as your upload starts processing."
- **Empty state:** Large video play icon centered, "No submissions yet" heading, "Upload your first video to this campaign and it will appear here once processing begins." subtext
- **With submissions (post-submit state):**
  - Orange/yellow warning pill: "Under review by the company..."
  - Video thumbnail card:
    - Dark/black background with Instagram logo and "View on Instagram" text + external link icon
    - Top-left overlay: view count icon + "0", heart icon + "0"
    - Top-right: Platform icon badge (Instagram gradient square)
    - Bottom-right: Small info/settings icon circle

### 3.9 Biggest Earners Section
- **Header:** "BIGGEST EARNERS" in uppercase gray
- **Subtext:** "See what content performs best, submit your own and join this Content Reward's top earners"
- **Empty state:** "No Creators Posted Yet" centered text

---

## 4. Submit Content Modal

### 4.1 Modal Structure
- Centered overlay modal with white background, rounded corners, close X button top-right
- **Title:** "Submit Content" in bold

### 4.2 Form Fields
1. **Social media post** (required):
   - Text input field
   - Placeholder shows a URL (e.g., `https://www.instagram.com/reel/234567890`)
   - Validates link format — shows inline error if invalid:
     - Red error box with red circle exclamation icon: "Submission Error"
     - Error message: "Invalid social media link format. Use Instagram, TikTok, YouTube, or X links."
     - Error box has a close/dismiss X button
   - Below the input when a valid Instagram link is detected: "Connect your Instagram for more precise..." text link (seen partially in resubmit modal)

2. **Video Upload**:
   - Drag-and-drop zone with dashed border
   - Upload cloud icon centered
   - "Click or drag video here" text
   - Supported formats listed: "MP4, MOV, AVI, MKV, WebM • Max 2GB"

3. **Send a message to the brand** (optional):
   - Checkbox/toggle — circular checkbox, when checked turns green/teal with checkmark
   - When enabled, reveals a textarea below:
     - Placeholder: "Ask a question or share something about your submission..."
     - Resizable textarea

4. **Submit button:**
   - Full-width purple/indigo gradient button at the bottom
   - "Submit" text, rounded

### 4.3 Duplicate Submission Detection (Resubmit Flow)
- When a previously submitted URL is entered, a confirmation dialog appears inside the modal:
  - Blue info circle icon + "Video Already Submitted" heading in bold
  - "We already have this video recorded from your submission 2 minutes ago. Would you like to resubmit it to refresh your metrics?"
  - Warning text in red/orange: "This will reset your review status to pending for brand re-approval."
  - Two buttons:
    - "Cancel" — outlined/ghost button
    - "Yes, Resubmit" — orange/amber filled button

---

## 5. Share Campaign Modal

### 5.1 Modal Structure
- Centered overlay, white background, rounded corners, close X top-right
- Share icon + "Share Campaign" title in bold
- Subtitle: "Share this campaign with creators"

### 5.2 Campaign Link
- **Label:** "Campaign Link"
- Read-only text input showing the URL (e.g., `https://topr.io/protected/campaign/03c...`)
- "Copy" button to the right — clipboard icon + "Copy" text

### 5.3 Share Via Buttons
- **Label:** "Share via"
- 2x2 grid of social sharing buttons:
  1. **Twitter** — bird/X icon + "Twitter" text, outlined button
  2. **Facebook** — F icon + "Facebook" text, outlined button
  3. **LinkedIn** — LinkedIn icon + "LinkedIn" text, outlined button
  4. **WhatsApp** — phone icon + "WhatsApp" text, outlined button
- All buttons have the same size, rounded, outlined/ghost style with icons on the left

---

## 6. Contact Brand Page (`/campaign/[id]/contact`)

### 6.1 Pre-Submission State (No Submissions Yet)
- Centered card/container:
  - Video camera icon (gray) at top
  - **"No Submissions Yet"** heading in bold
  - Subtext: "You need to create content on this campaign first before contacting the brand"
  - **"Submit a Video"** — purple filled button with video icon

### 6.2 Post-Submission State (Messaging Interface)
- **Header:**
  - Brand name in bold (e.g., "Onefloe")
  - Subtitle: "You can send a message"
- **Messaging Rules Banner:**
  - Yellow/cream background with info circle icon
  - "Messaging Rules:" bold label
  - "You can send one message per submission. Wait for the brand to reply before sending another message."
- **Message/Submission Card:**
  - White card with rounded border, positioned in chat-like layout (right-aligned = creator's message)
  - "Video Submission" bold label
  - "Platform: **INSTAGRAM**" — platform name in bold
  - External link icon + "View original post" clickable link in blue
  - "Submitted 5-4-2026, 22:34:06" timestamp in gray
  - **Status badge:** "Pending Review" in a teal/green outlined pill with a refresh/spinner icon on the right side of the card
- **Message Input:**
  - Fixed bottom input bar
  - Text input: "Type your message..." placeholder
  - Send button (paper plane icon) on the right side of the input

---

## 7. My Videos Page (`/my-videos`)

### 7.1 Status Filter Tabs
- Horizontal tab row at the top:
  1. **Pending** — clock icon, count badge (yellow/orange): e.g., "2"
  2. **Flagged** — flag icon, count "0"
  3. **Rejected** — X circle icon, count "0"
  4. **Approved** — check circle icon, count "0"
  5. **All** — list icon, count: e.g., "2"
- Active tab is highlighted (the Pending tab has a colored/filled state)

### 7.2 Videos Table
- Full-width table with columns:
  1. **Date submitted** — relative time: "less than a minute ago", "1 minute ago"
  2. **Campaign** — Campaign name in bold (e.g., "Onefloe UGC") + "by [Brand]" in gray below
  3. **Status** — Colored pill badges:
     - "Pending" = yellow/amber pill
  4. **Money earned** — Dollar icon + amount: "$ $0"
  5. **Views** — Eye icon + count: "0"
  6. **Platform** — Platform icon (Instagram gradient square icon, ~24px)
- Table rows have subtle row borders/dividers
- Rows are clickable (navigate to video detail)

---

## 8. Video Detail Page (`/my-videos/[id]`)

### 8.1 Layout: Split View
- **Left ~55%:** Video player area — large black/dark container with centered play button (circle with triangle), platform badge overlay (Instagram icon top-center of video)
- **Right ~45%:** Detail panel

### 8.2 Detail Panel
- **Back link:** "← Back" at top
- **Campaign name:** "Onefloe UGC" in large bold text
- **Brand name:** "Onefloe" below in gray
- **Status badge:** "Pending" — yellow/orange outlined pill with clock icon

### 8.3 Earnings Card
- Light green/yellow background card:
  - Dollar icon + "Earned" label on left
  - "$0" large bold amount on right
  - "Pending approval" in smaller green text below the amount

### 8.4 Engagement Metrics
- 2x2 grid of metric boxes:
  1. **Views** — eye icon + "0"
  2. **Likes** — heart icon + "0"
  3. **Comments** — chat bubble icon + "0"
  4. **Shares** — share icon + "0"
- Below: **Engagement** — chart/trend icon + "0.00%"

### 8.5 Campaign Info
- **Section: "CAMPAIGN"** (uppercase gray label)
  - Campaign name: "Onefloe UGC"
  - Rate badge: "$1 per 1K views" in a small outlined pill/tag
  - Brand icon + "Onefloe" text below

### 8.6 Platform Info
- **Section: "PLATFORM"** (uppercase gray label)
  - Platform icon (Instagram) + "Instagram" text
  - "Original post" link with external link icon on the right

### 8.7 Dates
- **Section: "DATES"** (uppercase gray label)
  - Calendar icon + "Uploaded" label: "Apr 5, 2026" right-aligned

### 8.8 Action Buttons (Bottom)
- Three full-width outlined/ghost buttons stacked vertically:
  1. **"View Campaign"** — eye icon
  2. **"Contact Brand"** — chat bubble icon
  3. **"View Original Post"** — external link icon

---

## 9. Dashboard Page (`/dashboard`)

### 9.1 Filter Bar
- **Campaign filter:** Dropdown — "All Campaigns" with chevron
- **Time period toggles:** Segmented pill group:
  - "Last 7 days" (active/selected — purple filled)
  - "Last 14 days" (ghost)
  - "All Time" (ghost)
  - "Custom Range" with calendar icon (ghost)

### 9.2 Summary Stat Cards
- Horizontal row of 4 equal-width cards:
  1. **Total Views** — eye icon top-right, large bold "0", "Filtered period" gray subtext
  2. **Total Earned** — dollar icon top-right, large bold "$0", "Period earnings" gray subtext
  3. **Videos** — video icon top-right, large bold "0", "Total videos" gray subtext
  4. **Campaigns** — trend icon top-right, large bold "0", "Active campaigns" gray subtext
- Cards have white background, subtle border, rounded corners

### 9.3 Performance Over Time Chart
- **Title:** "Performance Over Time" — bold left-aligned
- **Legend/link:** "Click points for details" right-aligned with a small chart icon in green
- **Chart:** Line chart area:
  - Y-axis: "0K" labels (stacked)
  - X-axis: Date labels (e.g., "Mar 30", "Mar 31", "Apr 1", "Apr 2", etc.)
  - Single line (blue/purple) — flat at 0 when no data
  - Grid lines visible (light gray dotted)

### 9.4 Top Performing Videos Section
- **Title:** "Top Performing Videos" — bold
- **Empty state:** "No Creators Posted Yet" centered

---

## 10. Leaderboard Page (`/leaderboard`)

### 10.1 Personal Stats Card (Top)
- Centered card with user info:
  - Large circular avatar (teal, letter initial "D")
  - Username: "Daan"
  - Three rows of rank data:
    - **Today**: rank "#—", dollar amount "$0", views "0 views", "0 likes"
    - **Last 7d**: rank "#—", "$0", "0 views", "0 likes"
    - **Overall**: rank "#—", "$0", "0 views", "0 likes"
  - Columns: Period | Rank | Earnings | Views | Likes

### 10.2 Leaderboard Tables
- Three side-by-side columns/cards:
  1. **Today** — ranked list
  2. **Last 7 Days** — ranked list
  3. **All-Time** — ranked list

### 10.3 Leaderboard Row Structure
- **Rank number:** Colored badge for top 3 (1=gold, 2=silver, 3=bronze), plain number for 4-10
- **Avatar:** Circular user avatar (photo or initial letter with colored background)
- **Username:** Bold text
- **Earnings:** Right-aligned — "+$427.51" style (with + prefix for period views) or "$7.0K" for all-time
- Top 3 get the medal/colored rank badges; ranks 4-10 just show the number
- Lists show 3 entries for Today, 10 for Last 7 Days and All-Time

### 10.4 Footer
- "Updated: 8:00:00 PM" timestamp centered below all three columns

---

## 11. Creator Profile Page (`/profile`) — Leaderboard Public View

### 11.1 Profile Header
- **Top bar:** Breadcrumb "Leaderboard > Christie Zeb"
- Circular avatar (large, with photo or initial)
- Username bold heading: "Christie Zeb"
- Rank badge: "Rank #27" — purple/indigo pill badge
- Member duration: "Member for 5 days" — small gray text with clock icon
- **Stats row (right-aligned):** 
  - Video count: video icon + "29 Videos"
  - View count: eye icon + "465.8K Views"
  - Like count: heart icon + "419 Likes"

### 11.2 Videos Grid
- **Section header:** "Videos" bold left-aligned, "29 videos" count right-aligned in gray
- **Grid layout:** 4 columns on desktop
- **Video card structure:**
  - Video thumbnail (square/portrait ratio)
  - **Top-left overlay:** Eye icon + view count, heart icon + like count (white text on semi-transparent dark bg)
  - **Top-right overlay:** Platform icon badge (Instagram or TikTok circular icon)
  - **Below thumbnail:**
    - Campaign name: "Remakeit US UGC"
    - "By [Brand] · [time ago]" in gray
  - **Bottom-right of thumbnail:** Small circular info icon

---

## 12. Notifications Page (`/notifications`)

### 12.1 Filter Tabs
- Two tabs at top left:
  - **All** — filled/active state (blue/purple pill)
  - **Unread** — ghost/outline
- Check/checkmark icon to the right (mark all as read?)

### 12.2 Empty State
- Centered vertically and horizontally:
  - Bell icon with small orange/red accent (notification bell)
  - "You're all caught up" heading in bold
  - "New campaign updates, approvals, and payouts will appear here in real time." subtext in gray

---

## 13. Profile Page (`/profile`)

### 13.1 Profile Sidebar (Left Panel)
- **"Creator Profile"** heading at top
- User avatar (large circle, teal, letter initial) + username
- **Sub-navigation tabs (vertical):**
  1. **General** — person icon (active = purple filled background)
  2. **Balance** — wallet icon
  3. **Social Accounts** — link/chain icon
- Active tab: purple filled pill with white text

### 13.2 General Tab
- **Right panel header:**
  - Large circular avatar centered
  - "Change Avatar" ghost button below avatar
  - Username bold heading
  - Email in gray below
- **"Profile Information"** section:
  - "Edit Profile" button — small purple filled button, top-right of section, pencil icon
  - 3x2 grid of info cards:
    1. **FULL NAME** (person icon) — value: "Daan"
    2. **INDUSTRY** (building icon) — value: "Memes, sports"
    3. **EMAIL** (envelope icon) — value: email, "Cannot be changed" in small red/gray text
    4. **OBJECTIVE** (target icon) — value: "making 🍞" (with emoji)
    5. **COUNTRY** (pin icon) — value: "Netherlands"
    6. **MEMBER SINCE** (calendar icon) — value: "February 2026"
  - Each card has: small uppercase gray label, icon left of label, value in dark text below

### 13.3 Balance Tab
- **Two top cards side by side:**
  1. **AVAILABLE** — wallet icon, "Ready" green badge top-right
     - Large bold "$0"
     - "Ready to withdraw" with trend icon in gray
  2. **PENDING** — clock icon, info (?) icon top-right
     - Large bold "$0"
     - "5-10 business days" with clock icon in gray
- **CTA button:** "Withdraw funds from my Topr Wallet" — full-width purple filled button with arrow icon
- **Minimum note:** "Minimum withdrawal amount is $20. Current available: $0" in gray centered text
- **Withdrawal History section:**
  - Dollar icon + "Withdrawal History" heading
  - "Track your payment status and timing" subtitle
  - "Need Help?" button — ghost/outlined with question mark icon, top-right
  - **Table columns:** Date | Gross Amount | Platform Fee | Stripe Fees | Net Received | Country | Status
  - Empty state shows "No withdrawals yet" in one of the middle rows, with placeholder "-" dashes in all other rows

### 13.4 Social Accounts Tab
- **"Social Accounts"** heading
- Subtitle: "Connect your social media accounts to track views, likes, and engagement."
- **Platform rows:**
  - **TikTok:** TikTok icon (colored) + "TikTok" name + "Not connected" gray subtitle
    - "Connect" button — purple filled pill on the right
- (Only TikTok shown; Instagram presumably already connected or handled differently)

---

## 14. Design System Summary

### 14.1 Colors
- **Primary:** Purple/Indigo (#6366F1 or similar) — used for active nav items, buttons, badges, CTAs
- **Background:** Very light gray (#F9FAFB or similar) for page backgrounds
- **Cards:** White with subtle border or shadow
- **Text:** Dark gray/near-black for headings, medium gray for labels/subtext
- **Success/Earnings:** Green tones for earned amounts, available balance
- **Warning/Pending:** Yellow/amber for pending badges
- **Error:** Red for error messages and rejected states
- **Brand accents:** Teal/green for user avatars

### 14.2 Typography
- **Headings:** Bold, likely Inter or similar sans-serif
- **Body:** Regular weight, same font family
- **Labels:** Small uppercase, gray, tracking slightly wider
- **Numbers/amounts:** Bold, slightly larger than surrounding text

### 14.3 Component Patterns
- **Buttons:** Rounded (large border-radius ~8-12px), filled primary = purple gradient/solid, ghost/outlined = transparent with border
- **Badges/Pills:** Small rounded pills for status (Pending=yellow, Approved=green, Rejected=red), type labels (UGC=purple), rates (green)
- **Cards:** White bg, ~12px border-radius, subtle shadow or 1px light gray border
- **Tables:** Clean minimal design, no heavy borders, alternating subtle backgrounds possible
- **Modals:** Centered overlay, white card, rounded corners, close X top-right, dark backdrop
- **Empty states:** Always centered, icon + heading + descriptive subtext + CTA button
- **Breadcrumbs:** Gray text, " > " separator, current page darker
- **Progress bars:** Thin horizontal bars (~4px height), filled portion in purple/green

### 14.4 Layout Patterns
- **Sidebar:** Fixed left, ~160px
- **Content area:** Fills remaining width, max-width container centered with padding
- **Split views (Video Detail):** ~55/45 left-right split
- **Grids:** 3 columns for campaign cards, 4 columns for video thumbnails, 2 columns for profile info cards, 3 columns for leaderboard tables
- **Spacing:** Generous padding throughout (~24-32px content margins)

### 14.5 Interaction Patterns
- **Navigation:** Sidebar primary nav + breadcrumb secondary nav
- **Filtering:** Dropdown filters + segmented time period toggles + status tab filters
- **Modals:** Used for Submit Content, Share Campaign, and confirmations
- **Status flow:** Pending → Under Review → Approved/Rejected/Flagged
- **Contact gating:** Must have a submission before contacting the brand
- **Duplicate detection:** Warns on resubmission with confirmation dialog
- **Messaging:** One message per submission, must wait for brand reply (rate limited)

---

## 15. Key UX Flows (for implementation reference)

### 15.1 Content Submission Flow
1. Creator browses Marketplace → finds Campaign → clicks into detail page
2. Clicks "+ Create Content for this Campaign"
3. Modal opens: enters social media post URL → validates format (Instagram/TikTok/YouTube/X)
4. Optionally uploads video file (drag & drop, max 2GB)
5. Optionally toggles "Send a message to the brand" → writes message
6. Clicks Submit → submission appears in "Your Submissions" on campaign page with "Under review" status
7. Video also appears in My Videos table as "Pending"

### 15.2 Resubmission Flow
1. Creator enters a URL that was already submitted
2. System detects duplicate → shows "Video Already Submitted" confirmation
3. Warns: "This will reset your review status to pending for brand re-approval"
4. Creator can Cancel or "Yes, Resubmit"

### 15.3 Contact Brand Flow
1. Click "Contact" on campaign detail page
2. If no submissions → shown gated empty state: "No Submissions Yet" + "Submit a Video" CTA
3. If has submissions → messaging interface shown
4. Messaging rules displayed prominently: 1 message per submission, must wait for brand reply
5. Previous submissions shown as cards in the conversation with status badges
6. Text input at bottom for composing messages

### 15.4 Payout/Withdrawal Flow
1. Earnings accrue per CPM as views come in (shown as Pending)
2. After approval, funds move to Available balance
3. Profile → Balance tab → "Withdraw funds from my Topr Wallet" button
4. Minimum $20 withdrawal
5. Withdrawal history table tracks: Date, Gross Amount, Platform Fee, Stripe Fees, Net Received, Country, Status
6. Processing takes 5-10 business days
