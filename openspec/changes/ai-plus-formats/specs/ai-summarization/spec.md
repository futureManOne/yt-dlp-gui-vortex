## ADDED Requirements

### Requirement: Generate AI Summary
The system SHALL provide an API endpoint to generate an intelligent summary of a video based on its title and description.

#### Scenario: Request AI summary
- **WHEN** the frontend requests a summary via POST `/api/ai/summarize` with a title and description
- **THEN** the backend SHALL return a JSON object containing a generated `summary` string.

### Requirement: Display AI summary button
The frontend SHALL render a button to trigger the AI summary generation after a video is parsed.

#### Scenario: Trigger AI summary
- **WHEN** the user clicks the "AI 智能摘要" button on a parsed video card
- **THEN** the system SHALL show a loading state, fetch the summary, and display the result string below the button.
