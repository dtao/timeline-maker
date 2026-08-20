# Timeline Maker

A lightweight, dependency-free app for creating milestone timelines from date
entries, with optional time support.

## Features

- Editable milestone title, date, owner, and status fields
- Optional milestone details in the milestone edit dialog
- Milestone risks with optional owners, mitigation state, per-risk history, and
  small timeline risk-state dots
- Shared people list for milestone owners, with initials, Gravatar email lookup,
  or uploaded local avatar images
- Direct visualization editing for titles, dates, owners, status, adding
  milestones from the timeline axis or list view, and hover deletion
- Multiple saved timelines with select, create, duplicate, delete, and rename
- Timezone-aware date persistence using the user's local timezone
- Date-only inputs by default, with an optional "Specify times" mode
- Milestone status history with due date snapshots and optional comments
- Optional fixed timeline start/end range
- Optional red current-date marker
- Horizontal and vertical timeline layout modes
- Light gray weekend bands
- Planned, in-progress, and completed milestone statuses
- In-progress milestones shown with a blue play signal
- Completed milestones shown with reduced opacity and a green check signal
- Overdue planned milestones shown with an amber warning signal and thicker border
- Close milestones stack into non-overlapping label rows with elbow connectors
- SVG and PNG timeline download with title-and-date filenames
- JSON import/export for individual timelines and full data sets
- Browser-local persistence across page refreshes

Uploaded avatar images are resized and saved once per person in browser-local
storage with the rest of the timeline data.

Milestones can be edited from the visualization by clicking a title, dragging a
milestone marker to reschedule, clicking a status marker, or using the hover
edit icon to open the milestone dialog.

## Run

Open `index.html` in a browser.
