# AutoPost Composer Components

This document describes the "use client" components built for the ClipProfit AutoPost composer feature.

## Location
`src/app/(app)/dashboard/autopost/_components/`

## Components

### 1. **campaign-brief.tsx** (CampaignBrief)
Collapsible campaign brief card at the top of the composer.

**Features:**
- Displays campaign name as heading
- Shows requirements, content guidelines, prohibited content
- Overlay asset info notification
- Collapse/expand toggle (persists to localStorage per campaignId)
- Styled with warning colors for prohibited content

**Props:**
```typescript
campaign: {
  id: string;
  name: string;
  description: string | null;
  contentGuidelines: string | null;
  requirements: string | null;
}
```

### 2. **video-upload.tsx** (VideoUpload)
Video upload dropzone with presigned S3 upload flow.

**Features:**
- Accepts MP4/MOV files up to 500MB
- Drag-and-drop + click upload
- Progress bar during upload (XHR with onprogress)
- Video validation via `/api/autopost/validate-video`
- States: idle, uploading, validating, ready, error
- Video preview thumbnail when ready
- Cancel/Retry buttons

**Props:**
```typescript
{
  onUploadComplete: (objectKey: string, videoUrl: string) => void;
  onError: (message: string) => void;
}
```

**Flow:**
1. File selection (drag/click)
2. Client-side validation (format, size)
3. POST `/api/autopost/upload-url` → get presigned URL
4. XHR PUT to presigned URL with progress tracking
5. POST `/api/autopost/validate-video` to validate
6. Callback with objectKey + videoUrl

### 3. **overlay-picker.tsx** (OverlayPicker)
3x3 position grid + S/M/L size selector for overlay placement.

**Features:**
- 3x3 grid of position buttons (9:16 phone aspect ratio)
- Each button shows dot at position
- Selected button has accent border + bg
- Three toggle buttons for size: S/M/L

**Props:**
```typescript
{
  position: string;
  size: string;
  onPositionChange: (position: string) => void;
  onSizeChange: (size: string) => void;
  defaultPosition?: string;
}
```

**Position Values:**
- `top-left`, `top-center`, `top-right`
- `middle-left`, `middle-center`, `middle-right`
- `bottom-left`, `bottom-center`, `bottom-right`

**Size Values:**
- `small` (10% of canvas width)
- `medium` (20% of canvas width)
- `large` (30% of canvas width)

### 4. **canvas-preview.tsx** (CanvasPreview)
Canvas element showing video frame with overlay composited.

**Features:**
- 270x480px canvas (9:16 aspect ratio)
- Loads video and renders first frame
- Loads overlay image and composites at selected position/size
- Updates on position/size change
- Shows placeholder when video/overlay not ready
- Disclaimer text about final render differences

**Props:**
```typescript
{
  videoObjectKey: string | null;
  overlayUrl: string | null;
  position: string;
  size: string;
}
```

**Implementation:**
- Creates hidden `<video>` and `<img>` elements
- On video `loadeddata`, seeks to 0
- On `seeked`, draws frame to canvas
- Calculates overlay position (20px padding, relative to canvas)
- Calculates overlay size based on percentage

### 5. **caption-editor.tsx** (CaptionEditor)
Caption textarea with hashtag guard.

**Features:**
- Textarea (min 3 rows, resizable)
- Character count display (bottom right)
- Hashtag guard: checks if required hashtags are present
- Warning message if required hashtags are missing
- Shows which hashtags will be re-appended

**Props:**
```typescript
{
  caption: string;
  onChange: (caption: string) => void;
  requiredHashtags: string[];
}
```

### 6. **schedule-picker.tsx** (SchedulePicker)
Post Now / Schedule toggle + datetime picker.

**Features:**
- Two toggle buttons: "Post Now" (default) and "Schedule"
- When scheduled, reveals datetime-local input
- Min time is current time
- Converts to UTC on change

**Props:**
```typescript
{
  scheduledAt: string | null;
  onChange: (scheduledAt: string | null) => void;
}
```

### 7. **composer.tsx** (Composer) - MAIN COMPOSER
Orchestrates all form components and submission.

**Features:**
- Manages state for: videoKey, position, size, caption, postType, scheduledAt, igAccountId
- Renders components in order: CampaignBrief → VideoUpload → OverlayPicker → CanvasPreview → CaptionEditor → PostType selector → SchedulePicker
- Submit button states: disabled until video uploaded + caption not empty
- Submit button labels: "Composite & Post" (now) or "Composite & Schedule" (scheduled)
- Post type selector: FEED / REEL / STORY toggle buttons (defaults to REEL)
- IG account selector: dropdown if multiple accounts, auto-selected if single

**Props:**
```typescript
{
  campaign: {
    id: string;
    name: string;
    description: string | null;
    bannerUrl: string | null;
    bannerVideoUrl: string | null;
    contentGuidelines: string | null;
    requirements: string | null;
    contentAssetUrls: string[];
    deadline: string;
    creatorCpv: string;
    contentType: string | null;
  };
  igAccounts: {
    id: string;
    platformUsername: string;
    platformUserId: string;
    followerCount: number;
  }[];
  userId: string;
}
```

**Submit Flow:**
1. POST `/api/autopost/submit` with all form data
2. Returns `{ scheduledPostId, status }`
3. Redirects to `/dashboard/autopost/status/{scheduledPostId}`

## Styling

All components use:
- Inline `style={{}}` with CSS variables
- Tailwind for layout (flex, grid, gap, p-, m-, rounded-, text-sm)
- NO shadcn/ui or other component libraries

**CSS Variables Used:**
- Colors: `--bg-primary`, `--bg-elevated`, `--text-primary`, `--text-secondary`, `--text-muted`
- Accent: `--accent`, `--accent-hover`, `--accent-bg`, `--accent-foreground`
- Status: `--success`, `--success-bg`, `--success-text`, `--warning-bg`, `--warning-text`, `--error`, `--error-bg`
- Borders: `--border`

## Key Implementation Details

1. **Video Upload Flow**: Uses XMLHttpRequest for progress tracking instead of fetch
2. **Canvas Preview**: Creates hidden DOM elements for reliable frame extraction
3. **Hashtag Guard**: Uses memoization to prevent unnecessary re-renders
4. **LocalStorage**: Campaign brief expansion state persists per campaign
5. **State Initialization**: Uses initializer functions to avoid lint errors
6. **Required Hashtags**: Hardcoded to `["#ClipProfit"]` in composer

## Files Summary

| File | Size | Exports |
|------|------|---------|
| campaign-brief.tsx | 4.6KB | CampaignBrief (named) |
| video-upload.tsx | 8.9KB | VideoUpload (named) |
| overlay-picker.tsx | 3.0KB | OverlayPicker (named) |
| canvas-preview.tsx | 3.9KB | CanvasPreview (named) |
| caption-editor.tsx | 2.2KB | CaptionEditor (named) |
| schedule-picker.tsx | 2.6KB | SchedulePicker (named) |
| composer.tsx | 6.6KB | Composer (named) |
| autopost-client.tsx | 4.9KB | AutoPostClient (named) |

**Total: 36.7KB of production-ready React components**

## Quality Checks

- ✅ All components are "use client"
- ✅ TypeScript strict mode compliant
- ✅ ESLint passes (0 errors, 0 warnings)
- ✅ Named exports only (no defaults)
- ✅ Proper prop typing with interfaces
- ✅ No hardcoded magic numbers (uses maps/constants)
- ✅ Accessibility: semantic HTML, proper labels
- ✅ Mobile responsive: Tailwind breakpoints
- ✅ Error handling: try/catch, error states, user feedback

