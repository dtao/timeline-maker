# Timeline Maker

A lightweight, dependency-free app for creating milestone timelines from date
entries, with optional time support.

## Features

- Editable milestone title, date, and status fields
- Shared people list for milestone owners, with initials, Gravatar email lookup,
  or uploaded local avatar images
- Direct visualization editing for titles, dates, owners, and status
- Multiple saved timelines with select, create, duplicate, delete, and rename
- Date-only inputs by default, with an optional "Specify times" mode
- Optional red current-date marker
- Completed milestones shown with reduced opacity and a green check signal
- Overdue pending milestones shown with an amber warning signal and thicker border
- Close milestones stack into non-overlapping label rows with elbow connectors
- SVG timeline download
- Browser-local persistence across page refreshes

Uploaded avatar images are resized and saved once per person in browser-local
storage with the rest of the timeline data.

Milestones can be edited from the visualization by clicking a title, dragging a
milestone marker to reschedule, clicking an owner avatar, or clicking a status
marker.

## Run

Open `index.html` in a browser.
