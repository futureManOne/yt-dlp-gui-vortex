## ADDED Requirements

### Requirement: Centralized Translations File
The system SHALL organize all user interface texts into a centralized translation file supporting Chinese (zh) and English (en) languages.

#### Scenario: Translate string from key
- **WHEN** the translation function is called with a key and current language
- **THEN** the system SHALL return the translated text matching the language, or fallback to Chinese if the key does not exist in the requested language

### Requirement: Language Selection Control
The system SHALL provide a language selection dropdown in the Settings panel.

#### Scenario: Switch language in Settings
- **WHEN** user selects a new language (e.g. English) from the language selector
- **THEN** the system SHALL immediately update the interface language of all panels to the selected language and save the choice to localStorage
