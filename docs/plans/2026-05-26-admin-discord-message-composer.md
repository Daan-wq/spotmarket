# Admin Discord Message Composer

## Goal
Build an admin-only Discord publishing page that can preview Discord Markdown, use live server channels and emojis, save drafts/templates, attach files, and send through the configured bot.

## Tasks
- [ ] Add Prisma storage for Discord message drafts/templates, including creator/updater references and indexes.
- [ ] Add Discord REST helpers for channels, emojis, and multipart message sending.
- [ ] Add admin APIs for channel/emoji lookup, template CRUD, and confirmed message sending.
- [ ] Add the `/admin/discord` page, sidebar item, composer toolbar, live preview, emoji picker, attachments, and send confirmation dialog.
- [ ] Add focused tests for preview rendering, Discord helpers/routes, template CRUD, and admin nav visibility.
- [ ] Run Prisma generation, tests, typecheck, and build.

## Done When
- [ ] Admins can choose a live Discord text/announcement channel.
- [ ] Admins can compose Discord Markdown, insert custom emojis, preview safely, attach files, and confirm before sending.
- [ ] Templates and drafts persist in the database.
- [ ] Successful sends are audit-logged without storing tokens or file contents.
