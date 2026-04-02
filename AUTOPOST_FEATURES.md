# AutoPost Status Polling & Post Queue Components

## Overview
Built status polling hook and UI components for the ClipProfit AutoPost feature to display real-time post processing status.

## Files Created

### 1. Hook: `src/hooks/useAutopostStatus.ts`
Custom React hook for polling scheduled post status.

**Features:**
- Polls `/api/autopost/status/[id]` every 5 seconds
- Stops polling when post reaches terminal state (PUBLISHED or FAILED)
- Provides retry functionality
- Type-safe PostStatus interface with all status values
- Proper error handling and loading states

**Exported:**
- `PostStatus` interface
- `useAutopostStatus(scheduledPostId)` hook

### 2. Component: `src/components/dashboard/autopost/_components/post-status-card.tsx`
Live status card that displays post processing state with visual feedback.

**Features:**
- Shows real-time status with animated spinner
- Status states: PENDING, RENDERING, QUEUED, PUBLISHING, PUBLISHED, FAILED
- Success state with green background, IG permalink, and timestamp
- Error state with red background, error message, and retry button
- Inline SVG icons (checkmark, error, spinner)
- CSS animation for spinner (autopost-spin)
- Dismissible on successful publish
- CSS variable styling (--bg-elevated, --accent, --success-bg, --error-bg)
- Responsive, compact design (80px min height)

**Props:**
- `scheduledPostId: string` - ID to poll
- `campaignName: string` - Display name
- `onDismiss?: () => void` - Callback when dismissed

### 3. Component: `src/components/dashboard/autopost/_components/post-queue.tsx`
Container managing multiple post status cards in a queue.

**Features:**
- Displays multiple posts with count
- Most recent post at top (reversed order)
- Posts can be dismissed when PUBLISHED
- Automatically hides when no posts remain
- Manages visibility state locally

**Props:**
- `posts: QueuedPost[]` - Array of posts to display

**Exported Interface:**
- `QueuedPost` - `{ scheduledPostId: string; campaignName: string }`

## Design & Styling

- **Inline CSS Variables:** All components use CSS variables for theming
  - `--bg-elevated` - Card background
  - `--border` - Border color
  - `--text-primary` - Main text
  - `--text-secondary` - Secondary text
  - `--text-muted` - Muted text
  - `--accent` - Primary accent color
  - `--success-bg` - Success state background
  - `--error-bg` - Error state background

- **Tailwind Classes:** Flexbox layout (flex, gap, p-, rounded-)
- **Icons:** Inline SVG with proper stroke styling
- **Animations:** CSS keyframe spinner animation (autopost-spin)

## Integration Guide

### Using PostQueue in a page:

```tsx
import { PostQueue } from "@/components/dashboard/autopost/_components/post-queue";

export function MyDashboard() {
  const [queuedPosts, setQueuedPosts] = useState<QueuedPost[]>([
    { scheduledPostId: "123", campaignName: "Summer Campaign" }
  ]);

  return (
    <div>
      <PostQueue posts={queuedPosts} />
    </div>
  );
}
```

### Using PostStatusCard individually:

```tsx
import { PostStatusCard } from "@/components/dashboard/autopost/_components/post-status-card";

export function StatusMonitor() {
  return (
    <PostStatusCard
      scheduledPostId="123"
      campaignName="My Campaign"
      onDismiss={() => console.log("dismissed")}
    />
  );
}
```

## API Contract

The hook expects the endpoint `/api/autopost/status/[id]` to return:

```typescript
{
  id: string;
  status: "PENDING" | "RENDERING" | "QUEUED" | "PUBLISHING" | "PUBLISHED" | "FAILED";
  errorMessage: string | null;
  igPermalink: string | null;
  publishedAt: string | null;
  igMediaId: string | null;
}
```

## Notes

- All components use "use client" directive
- No shadcn/ui dependencies
- Compatible with existing ClipProfit styling system
- Spinner animation is self-contained in component
- Safe for multiple simultaneous posts in a queue
