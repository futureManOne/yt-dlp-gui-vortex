# restructure-layout-dashboard

## Purpose
Split the downloader client panel into three switchable boards based on a leftmost navigation sidebar menu, and optimize the wide right content column by adding a real-time disk space gauge and supported sites grid cards.

## Requirements

### Requirement: Leftmost Navigation Menu
The system SHALL display a vertical navigation sidebar on the far left of the application window, featuring tabs for navigation:
- **Download Home** (Icon for video download operations)
- **Cookie Import** (Icon for cookie files and configuration)
- **General Settings** (Icon for directory and formats setup)

#### Scenario: Switch views on tab click
- **WHEN** user clicks on the "Cookie Import" tab in the leftmost sidebar
- **THEN** the system hides the URL downloader and Settings, showing only the Cookie dropzone and browser extractor board

### Requirement: Disk Storage Status
The system SHALL request the backend to calculate the free disk storage space of the current download folder, displaying it on the dashboard card.

#### Scenario: Display free storage space
- **WHEN** general config is fetched or updated by the client
- **THEN** the dashboard renders the remaining disk space in a human-readable format (e.g., "120.5 GB Free")

### Requirement: Supported Sites Guide
The system SHALL render a grid of popular supported websites (e.g. Bilibili, YouTube, TikTok, Douyin) with styled hover effects on the right-side dashboard panel.

#### Scenario: Render guide grid
- **WHEN** the Download Home view is active
- **THEN** the right-side panel displays a "Supported Websites" grid to fill empty spacing and guide users
