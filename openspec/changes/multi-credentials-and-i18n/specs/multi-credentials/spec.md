## ADDED Requirements

### Requirement: Import Multiple Cookies Files
The system SHALL allow users to upload multiple Netscape cookies format text files.

#### Scenario: Successful upload of a new cookies file
- **WHEN** user uploads a valid Netscape cookies `.txt` file
- **THEN** the system SHALL save the file content separately, generate a unique ID for it, and add it to the uploaded cookies list

### Requirement: View and Manage Cookies List
The system SHALL allow users to view the list of uploaded cookies files and delete any of them.

#### Scenario: View cookies list
- **WHEN** user views the credentials panel
- **THEN** the system SHALL display all uploaded cookies files showing their names and file sizes

#### Scenario: Delete a cookies file
- **WHEN** user clicks the delete button for a specific cookies file
- **THEN** the system SHALL remove the corresponding file from the server and update the list

### Requirement: Merge Cookies for Tasks
The system SHALL merge all uploaded cookie files when performing video parsing or starting download tasks.

#### Scenario: Merge cookies for download task
- **WHEN** a task execution begins and multiple cookies files are uploaded
- **THEN** the system SHALL combine all Netscape cookies contents into a single temporary file and use it as the `--cookiefile` parameter for yt-dlp
