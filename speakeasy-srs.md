# SpeakEasy - Software Requirements Specification (SRS)

**Version:** 1.0  
**Date:** November 26, 2024  
**Status:** Draft - Pending Approval  
**Author:** Technical Architecture Team  

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-11-26 | Technical Team | Initial draft |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [System Architecture](#6-system-architecture)
7. [Data Models](#7-data-models)
8. [API Specifications](#8-api-specifications)
9. [UI/UX Requirements](#9-uiux-requirements)
10. [Integration Specifications](#10-integration-specifications)
11. [Phased Delivery Roadmap](#11-phased-delivery-roadmap)
12. [Risk Assessment](#12-risk-assessment)
13. [Success Metrics](#13-success-metrics)
14. [Appendices](#14-appendices)

---

## 1. Executive Summary

### 1.1 Purpose

This Software Requirements Specification (SRS) defines the complete requirements for **SpeakEasy**, an enterprise voice-to-text application designed to provide high-accuracy speech transcription with system-wide hotkey activation, automatic clipboard management, and team collaboration features.

### 1.2 Business Objectives

| Objective | Description |
|-----------|-------------|
| **Cost Reduction** | Replace $25/user/month commercial solution with internal tool, targeting 60-70% cost savings |
| **Team Scalability** | Support 13+ users initially with architecture for 100+ users |
| **Workflow Integration** | System-wide functionality across all applications, not limited to browser |
| **Future Automation** | Enable integration with n8n, Zapier, Make.com for workflow automation |
| **Monetization Potential** | Track usage to support potential franchise billing model |

### 1.3 Target Users

- **Internal Team:** 13 initial users across US and Philippines locations
- **Franchise Owners:** Future rollout to franchise network
- **Franchise Staff:** Coaches, assistant managers, administrative staff

### 1.4 Success Criteria

| Metric | Target |
|--------|--------|
| Transcription Accuracy | ≥95% for English, ≥90% for Filipino |
| Transcription Latency | <5 seconds for typical dictation (<30 seconds) |
| System Resource Usage | <100MB RAM when idle, <300MB when recording |
| User Adoption | 100% of target users actively using within 30 days of launch |
| Cost per User | <$10/month at moderate usage (30 min/day) |

---

## 2. Product Overview

### 2.1 Product Description

SpeakEasy is a cross-platform desktop application with a companion web dashboard that enables users to:

1. **Dictate text** using a configurable global hotkey
2. **Receive high-accuracy transcriptions** via OpenAI Whisper API
3. **Automatically paste** transcribed text or copy to clipboard
4. **Access transcription history** for recovery and reference
5. **Manage personal and team vocabulary** for improved accuracy
6. **Track usage analytics** for cost management and billing decisions

### 2.2 Product Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Desktop App** | Tauri (Rust + React) | Core dictation functionality, system-wide hotkeys, audio capture |
| **Web Dashboard** | Next.js + React | Admin features, user management, analytics, settings |
| **Backend API** | Node.js/Express | Authentication, transcription proxy, data management |
| **Database** | Supabase (PostgreSQL) | User data, transcription history, vocabulary, analytics |
| **Transcription** | OpenAI Whisper API | Speech-to-text conversion |
| **Authentication** | Supabase Auth | User authentication, password reset, session management |

### 2.3 Key Features Summary

#### Desktop Application
- Global hotkey recording (configurable two-key combination)
- High-accuracy transcription (Whisper API)
- Smart auto-paste with clipboard fallback
- Audio feedback (start/stop sounds)
- System tray operation with visual indicators
- Transcription history with quick-access hotkey
- Personal vocabulary management
- Multi-language support
- Configurable user preferences

#### Web Dashboard
- User management (invite, edit, deactivate)
- Team vocabulary management
- Organization settings
- Usage analytics and reporting
- Custom sound upload (Super Admin)
- Integration management (future)
- Billing and cost tracking

### 2.4 Out of Scope (Version 1.0)

The following features are explicitly out of scope for the initial release but documented for future consideration:

- Real-time collaborative transcription
- Voice commands ("delete that", "new paragraph")
- Offline transcription (local Whisper model)
- Mobile applications (iOS/Android)
- Browser extension
- Video transcription
- Speaker diarization (multi-speaker identification)
- Custom model fine-tuning

---

## 3. User Roles & Permissions

### 3.1 Role Hierarchy

```
Super Admin
    │
    ├── Admin (Franchise Owner)
    │       │
    │       └── User (Coach/Staff)
    │
    ├── Admin (Franchise Owner)
    │       │
    │       └── User (Coach/Staff)
    │
    └── ... (additional franchises)
```

### 3.2 Role Definitions

#### 3.2.1 Super Admin

**Description:** Technical team and system owners with full platform access.

| Permission | Access |
|------------|--------|
| View all users across all organizations | ✅ |
| Create/edit/deactivate any user | ✅ |
| Promote users to Admin | ✅ |
| View system-wide analytics | ✅ |
| Manage global vocabulary | ✅ |
| Upload custom system sounds | ✅ |
| Configure API keys and integrations | ✅ |
| Access billing and cost data | ✅ |
| Manage organization settings | ✅ |
| Push vocabulary to all users or individuals | ✅ |

#### 3.2.2 Admin (Franchise Owner)

**Description:** Franchise owners who manage their own team of users.

| Permission | Access |
|------------|--------|
| View users in their organization | ✅ |
| Create/edit/deactivate users in their org | ✅ |
| View analytics for their organization | ✅ |
| Manage team vocabulary | ✅ |
| Configure organization settings | ✅ |
| View own usage and team usage | ✅ |
| Upload custom sounds | ❌ |
| Access system-wide settings | ❌ |
| View other organizations | ❌ |

#### 3.2.3 User (Coach/Staff)

**Description:** End users who use SpeakEasy for dictation.

| Permission | Access |
|------------|--------|
| Use dictation features | ✅ |
| Manage personal settings | ✅ |
| Manage personal vocabulary | ✅ |
| View own transcription history | ✅ |
| View own usage statistics | ✅ |
| Manage other users | ❌ |
| Access organization settings | ❌ |
| View team analytics | ❌ |

### 3.3 Role Promotion Rules

- **Super Admin** can promote any user to any role
- **Admin** can promote Users to Admin within their organization
- **Users** cannot promote anyone
- Each role can only manage roles below them in the hierarchy

### 3.4 Organization Structure

| Entity | Description |
|--------|-------------|
| **System** | Top-level container, managed by Super Admins |
| **Organization** | Franchise or team unit, managed by Admins |
| **User** | Individual user account, belongs to one Organization |

---

## 4. Functional Requirements

### 4.1 Desktop Application - Core Dictation

#### FR-D001: Global Hotkey Recording

**Description:** User can start and stop audio recording using a configurable global hotkey combination.

**User Story:** As a user, I want to press a hotkey combination to start recording my voice, and press it again to stop recording and receive the transcription, so that I can dictate text without switching applications.

**Acceptance Criteria:**
| # | Criteria |
|---|----------|
| 1 | Hotkey works regardless of which application is in focus |
| 2 | Hotkey is configurable by the user (modifier + key combination) |
| 3 | Available modifiers: Ctrl, Alt, Shift, or combinations thereof |
| 4 | Second key can be any alphanumeric or function key |
| 5 | First press starts recording, second press stops recording |
| 6 | Visual indicator shows recording state |
| 7 | Audio cue plays on start and stop |
| 8 | Hotkey configuration persists across app restarts |
| 9 | Default hotkey: Ctrl + Shift + Space |

**Priority:** P0 (Must Have)

---

#### FR-D002: Audio Capture

**Description:** System captures high-quality audio from the user's microphone during recording.

**User Story:** As a user, I want the app to capture my voice clearly so that transcription is accurate.

**Acceptance Criteria:**
| # | Criteria |
|---|----------|
| 1 | Captures audio from system default microphone |
| 2 | Allows user to select specific microphone in settings |
| 3 | Audio format: 16kHz sample rate minimum (Whisper optimal) |
| 4 | Audio encoded as WAV or MP3 for API transmission |
| 5 | Handles microphone permission requests appropriately |
| 6 | Displays error if no microphone available |
| 7 | Supports recording sessions up to 30 minutes |
| 8 | Audio buffered locally during recording |

**Priority:** P0 (Must Have)

---

#### FR-D003: Transcription Processing

**Description:** Recorded audio is sent to Whisper API and transcribed text is returned.

**User Story:** As a user, I want my recorded speech to be accurately transcribed into text.

**Acceptance Criteria:**
| # | Criteria |
|---|----------|
| 1 | Audio sent to backend API (not direct to Whisper) |
| 2 | Backend proxies to OpenAI Whisper API |
| 3 | Transcription returned within 5 seconds for <30 second recordings |
| 4 | Longer recordings scale linearly (roughly 1 second processing per 10 seconds audio) |
| 5 | User's selected language passed to API |
| 6 | Custom vocabulary applied via prompt parameter |
| 7 | Error handling for API failures with user notification |
| 8 | Retry logic (3 attempts with exponential backoff) |

**Priority:** P0 (Must Have)

---

#### FR-D004: Clipboard Management

**Description:** Transcribed text is automatically copied to clipboard.

**User Story:** As a user, I want my transcription automatically copied to the clipboard so I can paste it anywhere.

**Acceptance Criteria:**
| # | Criteria |
|---|----------|
| 1 | Transcription automatically copied to system clipboard |
| 2 | Clipboard updated immediately upon transcription completion |
| 3 | Previous clipboard contents replaced |
| 4 | Works with plain text (no formatting) |
| 5 | Clipboard accessible via standard Ctrl+V / Cmd+V |

**Priority:** P0 (Must Have)

---

#### FR-D005: Smart Auto-Paste

**Description:** Transcribed text is automatically pasted into the active text field when possible.

**User Story:** As a user, I want my transcription to automatically paste into the text field I'm working in, so I don't have to manually paste.

**Acceptance Criteria:**
| # | Criteria |
|---|----------|
| 1 | After transcription, system attempts to paste into active element |
| 2 | Paste simulates Ctrl+V / Cmd+V keypress |
| 3 | If no valid text input detected, text remains on clipboard only |
| 4 | User can configure auto-paste behavior: Always / Smart / Never |
| 5 | "Smart" mode (default): paste if text input detected, otherwise clipboard only |
| 6 | Works across different applications |
| 7 | Small delay (100-200ms) before paste to allow focus stabilization |

**Priority:** P0 (Must Have)

---

#### FR-D006: Audio Feedback

**Description:** Audio cues indicate recording start and stop.

**User Story:** As a user, I want to hear a sound when recording starts and stops so I know the system is responding.

**Acceptance Criteria:**
| # | Criteria |
|---|----------|
| 1 | Distinct sound plays when recording starts |
| 2 | Different distinct sound plays when recording stops |
| 3 | Stop sound is slightly longer/different to differentiate |
| 4 | Sounds are short and unobtrusive (<0.5 seconds) |
| 5 | Sound volume respects system volume settings |
| 6 | User can mute sounds in settings |
| 7 | Default sounds included with application |
| 8 | Super Admin can upload custom sounds (MP3/WAV, <1MB) |
| 9 | Custom sounds pushed to all users system-wide |

**Priority:** P1 (Should Have)

---

#### FR-D007: Visual Recording Indicator

**Description:** Visual feedback indicates when recording is active.

**User Story:** As a user, I want to see a visual indicator when recording is active so I know the system is listening.

**Acceptance Criteria:**
| # | Criteria |
|---|----------|
| 1 | System tray icon changes color when recording (e.g., red) |
| 2 | Icon returns to default color when not recording |
| 3 | Optional: Floating indicator window (user can enable/disable) |
| 4 | Floating indicator is small, unobtrusive, always-on-top |
| 5 | Floating indicator can be positioned by user |
| 6 | Default: Floating indicator disabled |

**Priority:** P1 (Should Have)

---

#### FR-D008: System Tray Operation

**Description:** Application runs in system tray with minimal UI footprint.

**User Story:** As a user, I want SpeakEasy to run quietly in the background without cluttering my screen.

**Acceptance Criteria:**
| # | Criteria |
|---|----------|
| 1 | Application minimizes to system tray |
| 2 | Closing main window keeps app running in tray |
| 3 | Tray icon provides right-click context menu |
| 4 | Menu options: Open, Settings, History, Pause, Quit |
| 5 | Double-click tray icon opens main window |
| 6 | Application starts minimized to tray (optional setting) |
| 7 | Application can be set to start on system boot |

**Priority:** P0 (Must Have)

---

### 4.2 Desktop Application - History & Vocabulary

#### FR-D009: Transcription History

**Description:** System maintains a history of recent transcriptions accessible to the user.

**User Story:** As a user, I want to access my recent transcriptions so I can recover text I may have lost or need to reference.

**Acceptance Criteria:**
| # | Criteria |
|---|----------|
| 1 | History stored locally on device |
| 2 | History synced to cloud for backup and cross-device access |
| 3 | History limit based on storage size (configurable, default 10MB) |
| 4 | Oldest entries automatically removed when limit reached |
| 5 | Each entry includes: text, timestamp, duration, language |
| 6 | User can copy any history entry to clipboard |
| 7 | User can delete individual history entries |
| 8 | User can clear all history |
| 9 | History persists across app restarts |
| 10 | History accessible via dedicated hotkey |

**Priority:** P0 (Must Have)

---

#### FR-D010: History Quick Access

**Description:** User can quickly access transcription history via hotkey.

**User Story:** As a user, I want to press a hotkey to quickly view my recent transcriptions without navigating through menus.

**Acceptance Criteria:**
| # | Criteria |
|---|----------|
| 1 | Dedicated configurable hotkey opens history panel |
| 2 | History opens as a popup/overlay (not full window) |
| 3 | Popup shows most recent entries first |
| 4 | User can scroll through history |
| 5 | Single click on entry copies to clipboard |
| 6 | Escape key or click outside closes popup |
| 7 | Popup is compact and unobtrusive |
| 8 | Default hotkey: Ctrl + Shift + H |

**Priority:** P1 (Should Have)

---

#### FR-D011: Personal Vocabulary

**Description:** Users can add custom words and phrases to improve transcription accuracy.

**User Story:** As a user, I want to add custom words that the transcription often gets wrong so accuracy improves over time.

**Acceptance Criteria:**
| # | Criteria |
|---|----------|
| 1 | User can add custom words/phrases via settings |
| 2 | Vocabulary entries: word/phrase + optional pronunciation hint |
| 3 | Vocabulary synced to cloud |
| 4 | Vocabulary sent to Whisper via prompt parameter |
| 5 | User can edit and delete vocabulary entries |
| 6 | User can import vocabulary from CSV |
| 7 | User can export vocabulary to CSV |
| 8 | No limit on personal vocabulary entries |

**Priority:** P1 (Should Have)

---

#### FR-D012: Team Vocabulary

**Description:** Admins can create shared vocabulary for their organization.

**User Story:** As an Admin, I want to create shared vocabulary for my team so everyone benefits from organization-specific terms.

**Acceptance Criteria:**
| # | Criteria |
|---|----------|
| 1 | Admin can add vocabulary entries for their organization |
| 2 | Team vocabulary automatically applied to all org users |
| 3 | Team vocabulary combined with personal vocabulary |
| 4 | Users can see team vocabulary (read-only) |
| 5 | Admin can edit/delete team vocabulary |
| 6 | Super Admin can create global vocabulary for all organizations |
| 7 | Super Admin can push vocabulary to specific users |

**Priority:** P2 (Nice to Have - Phase 3)

---

### 4.3 Desktop Application - Settings & Preferences

#### FR-D013: User Settings

**Description:** Users can configure application behavior to their preferences.

**User Story:** As a user, I want to customize how SpeakEasy works to match my workflow.

**Settings Available:**
| Setting | Options | Default |
|---------|---------|---------|
| Recording hotkey | Modifier(s) + Key | Ctrl+Shift+Space |
| History hotkey | Modifier(s) + Key | Ctrl+Shift+H |
| Auto-paste mode | Always / Smart / Never | Smart |
| Transcription display | Direct paste / Toast / Edit popup | Direct paste |
| Audio feedback | Enabled / Disabled | Enabled |
| Floating indicator | Enabled / Disabled | Disabled |
| Default language | [Language list] | English |
| Start on boot | Yes / No | No |
| Start minimized | Yes / No | Yes |
| History storage limit | 5MB / 10MB / 25MB / 50MB | 10MB |
| Microphone selection | [System microphones] | Default |

**Acceptance Criteria:**
| # | Criteria |
|---|----------|
| 1 | All settings accessible via Settings panel |
| 2 | Settings hotkey opens settings (configurable) |
| 3 | Settings synced to cloud |
| 4 | Settings apply immediately (no restart required) |
| 5 | Reset to defaults option available |

**Priority:** P1 (Should Have)

---

#### FR-D014: Transcription Display Options

**Description:** Users can choose how transcription results are displayed.

**User Story:** As a user, I want to choose whether to see my transcription before it's pasted.

**Options:**
| Option | Behavior |
|--------|----------|
| **Direct paste** | Transcription pasted/clipped immediately, no preview |
| **Toast notification** | Brief popup shows transcription, then auto-paste |
| **Edit popup** | Popup allows user to edit text before confirming paste |

**Acceptance Criteria:**
| # | Criteria |
|---|----------|
| 1 | User can select display mode in settings |
| 2 | Direct paste: fastest, no interruption |
| 3 | Toast: shows for 3 seconds, then pastes |
| 4 | Edit popup: text editable, Confirm/Cancel buttons |
| 5 | Edit popup: Enter key confirms, Escape cancels |
| 6 | Default: Direct paste |

**Priority:** P1 (Should Have)

---

#### FR-D015: Multi-Language Support

**Description:** Users can select their preferred transcription language.

**User Story:** As a user who speaks Filipino, I want to dictate in my language and receive accurate transcription.

**Acceptance Criteria:**
| # | Criteria |
|---|----------|
| 1 | Language selection available in settings |
| 2 | Primary languages: English, Filipino (Tagalog) |
| 3 | Additional languages available (Whisper supported list) |
| 4 | Language passed to Whisper API |
| 5 | User can switch languages without restart |
| 6 | Future: Auto-detect language option |

**Supported Languages (Initial):**
- English (en)
- Filipino/Tagalog (tl)
- Spanish (es)
- French (fr)
- German (de)
- Japanese (ja)
- Korean (ko)
- Chinese (zh)
- Additional languages per Whisper API support

**Priority:** P1 (Should Have)

---

### 4.4 Web Dashboard - User Management

#### FR-W001: User Invitation

**Description:** Admins can invite new users to the platform.

**User Story:** As an Admin, I want to invite new team members so they can use SpeakEasy.

**Acceptance Criteria:**
| # | Criteria |
|---|----------|
| 1 | Admin enters new user's email address |
| 2 | System sends invitation email with setup link |
| 3 | Link expires after 7 days |
| 4 | New user creates password on first login |
| 5 | User automatically assigned to Admin's organization |
| 6 | Admin can set initial role (User or Admin) |
| 7 | Super Admin can invite to any organization |
| 8 | Duplicate email addresses rejected |

**Priority:** P0 (Must Have)

---

#### FR-W002: User Management

**Description:** Admins can view and manage users in their organization.

**User Story:** As an Admin, I want to manage my team members' accounts.

**Acceptance Criteria:**
| # | Criteria |
|---|----------|
| 1 | List view of all users in organization |
| 2 | Search and filter users |
| 3 | View user details: name, email, role, status, last active |
| 4 | Edit user details: name, role |
| 5 | Deactivate user (soft delete) |
| 6 | Reactivate deactivated user |
| 7 | Resend invitation email |
| 8 | Super Admin can manage all users across all organizations |

**Priority:** P0 (Must Have)

---

#### FR-W003: Password Reset

**Description:** Users can reset forgotten passwords.

**User Story:** As a user who forgot my password, I want to reset it so I can regain access.

**Acceptance Criteria:**
| # | Criteria |
|---|----------|
| 1 | "Forgot Password" link on login page |
| 2 | User enters email address |
| 3 | Reset email sent with secure link |
| 4 | Link expires after 1 hour |
| 5 | User creates new password |
| 6 | Password requirements enforced (8+ chars, etc.) |
| 7 | Confirmation shown on success |
| 8 | Old sessions invalidated after password change |

**Priority:** P0 (Must Have)

---

### 4.5 Web Dashboard - Analytics

#### FR-W004: Usage Analytics

**Description:** Dashboard displays usage statistics and analytics.

**User Story:** As an Admin, I want to see how much my team is using SpeakEasy for planning and cost tracking.

**Metrics Available:**
| Metric | Description | Access Level |
|--------|-------------|--------------|
| Total minutes transcribed | Sum of all transcription time | All |
| Transcription count | Number of transcriptions | All |
| Average transcription length | Mean duration | Admin+ |
| Daily/weekly/monthly usage | Time-series data | Admin+ |
| Per-user breakdown | Usage by team member | Admin+ |
| Per-organization breakdown | Usage by franchise | Super Admin |
| Estimated cost | Based on API pricing | Admin+ |
| Peak usage times | When users are most active | Admin+ |

**Acceptance Criteria:**
| # | Criteria |
|---|----------|
| 1 | Users see their own usage stats |
| 2 | Admins see aggregate stats for their organization |
| 3 | Super Admins see system-wide stats |
| 4 | Date range selector (today, 7 days, 30 days, custom) |
| 5 | Data visualized in charts (line, bar) |
| 6 | Export to CSV option |
| 7 | Data refreshed at least every hour |

**Priority:** P1 (Should Have)

---

#### FR-W005: Cost Tracking

**Description:** Dashboard displays estimated costs based on usage.

**User Story:** As a Super Admin, I want to track costs to determine if we need to charge franchise owners.

**Acceptance Criteria:**
| # | Criteria |
|---|----------|
| 1 | Cost calculated based on Whisper API pricing ($0.006/min) |
| 2 | Cost shown per user, per organization, and system-wide |
| 3 | Cost projections based on current usage trends |
| 4 | Monthly cost summaries |
| 5 | Cost alerts configurable (e.g., notify when org exceeds $X) |

**Priority:** P2 (Nice to Have)

---

### 4.6 Web Dashboard - Organization Settings

#### FR-W006: Organization Settings

**Description:** Admins can configure organization-specific settings.

**User Story:** As an Admin, I want to configure settings that apply to my entire team.

**Settings Available:**
| Setting | Description | Access |
|---------|-------------|--------|
| Organization name | Display name | Admin |
| Default language | Default for new users | Admin |
| Usage limits | Max minutes per user per month | Super Admin |
| Allowed languages | Languages available to users | Super Admin |

**Priority:** P2 (Nice to Have)

---

#### FR-W007: Custom Sound Upload

**Description:** Super Admins can upload custom audio cues for the system.

**User Story:** As a Super Admin, I want to upload branded audio cues for the entire platform.

**Acceptance Criteria:**
| # | Criteria |
|---|----------|
| 1 | Upload interface for start sound and stop sound |
| 2 | Accepted formats: MP3, WAV |
| 3 | Maximum file size: 1MB |
| 4 | Maximum duration: 2 seconds |
| 5 | Preview uploaded sounds before saving |
| 6 | Sounds automatically pushed to all desktop apps |
| 7 | Desktop apps download new sounds on next sync |
| 8 | Revert to default option |

**Priority:** P2 (Nice to Have - Phase 3)

---

### 4.7 Authentication

#### FR-A001: User Login

**Description:** Users authenticate to access the application.

**Acceptance Criteria:**
| # | Criteria |
|---|----------|
| 1 | Login via email and password |
| 2 | "Remember me" option for persistent sessions |
| 3 | Session timeout after 30 days of inactivity |
| 4 | Same credentials work for desktop app and web dashboard |
| 5 | Invalid credentials show generic error (security) |
| 6 | Account lockout after 5 failed attempts (15 min) |

**Priority:** P0 (Must Have)

---

#### FR-A002: Session Management

**Description:** User sessions are managed securely.

**Acceptance Criteria:**
| # | Criteria |
|---|----------|
| 1 | JWT tokens for API authentication |
| 2 | Access tokens expire after 15 minutes |
| 3 | Refresh tokens expire after 30 days |
| 4 | Refresh token rotation on use |
| 5 | User can log out (invalidates tokens) |
| 6 | User can view active sessions (future) |
| 7 | User can revoke other sessions (future) |

**Priority:** P0 (Must Have)

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Requirement | Target | Priority |
|-------------|--------|----------|
| **NFR-P001:** Transcription latency | <5 seconds for recordings <30 seconds | P0 |
| **NFR-P002:** App startup time | <3 seconds to tray-ready state | P1 |
| **NFR-P003:** Hotkey response time | <100ms from keypress to recording start | P0 |
| **NFR-P004:** Memory usage (idle) | <100MB RAM | P1 |
| **NFR-P005:** Memory usage (recording) | <300MB RAM | P1 |
| **NFR-P006:** CPU usage (idle) | <1% CPU | P1 |
| **NFR-P007:** Web dashboard load time | <3 seconds initial load | P1 |
| **NFR-P008:** API response time | <500ms for non-transcription endpoints | P1 |

### 5.2 Reliability

| Requirement | Target | Priority |
|-------------|--------|----------|
| **NFR-R001:** System uptime | 99.5% availability | P0 |
| **NFR-R002:** Data durability | No transcription history loss | P1 |
| **NFR-R003:** Graceful degradation | App functions offline (local history) | P2 |
| **NFR-R004:** Error recovery | Auto-retry failed transcriptions | P1 |
| **NFR-R005:** Crash recovery | App restarts and recovers state | P1 |

### 5.3 Security

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **NFR-S001:** Data encryption in transit | TLS 1.2+ for all API communication | P0 |
| **NFR-S002:** Data encryption at rest | AES-256 for stored audio and transcriptions | P1 |
| **NFR-S003:** API key security | Keys stored server-side only, never in client | P0 |
| **NFR-S004:** Authentication security | Bcrypt password hashing, JWT tokens | P0 |
| **NFR-S005:** Audio data handling | Audio deleted from server after transcription | P1 |
| **NFR-S006:** RBAC enforcement | Role-based access enforced on all endpoints | P0 |
| **NFR-S007:** Audit logging | All admin actions logged | P1 |

### 5.4 Scalability

| Requirement | Target | Priority |
|-------------|--------|----------|
| **NFR-SC001:** Initial user capacity | 50 concurrent users | P0 |
| **NFR-SC002:** Growth capacity | Scale to 500 users without architecture changes | P1 |
| **NFR-SC003:** Concurrent transcriptions | Handle 20 simultaneous transcription requests | P1 |
| **NFR-SC004:** History storage | Support 50MB per user without performance degradation | P2 |

### 5.5 Compatibility

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **NFR-C001:** Windows support | Windows 10 and 11 | P0 |
| **NFR-C002:** macOS support | macOS 11 (Big Sur) and later | P0 |
| **NFR-C003:** Web browser support | Chrome, Firefox, Safari, Edge (latest 2 versions) | P0 |
| **NFR-C004:** Linux support | Ubuntu 20.04+ (future consideration) | P3 |

### 5.6 Usability

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **NFR-U001:** Onboarding | New user productive within 5 minutes | P1 |
| **NFR-U002:** Accessibility | WCAG 2.1 AA compliance for web dashboard | P2 |
| **NFR-U003:** Localization | UI in English (other languages future) | P3 |
| **NFR-U004:** Documentation | In-app help and user guide | P2 |

---

## 6. System Architecture

### 6.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                 CLIENTS                                       │
├────────────────────────────────┬─────────────────────────────────────────────┤
│      Desktop App (Tauri)       │           Web Dashboard (Next.js)           │
│  ┌──────────────────────────┐  │  ┌───────────────────────────────────────┐  │
│  │  - Audio Capture         │  │  │  - User Management                    │  │
│  │  - Hotkey Handling       │  │  │  - Analytics Dashboard                │  │
│  │  - Clipboard Management  │  │  │  - Settings Management                │  │
│  │  - Local Storage         │  │  │  - Vocabulary Management              │  │
│  │  - System Tray UI        │  │  │  - Admin Features                     │  │
│  └──────────────────────────┘  │  └───────────────────────────────────────┘  │
└────────────────────────────────┴─────────────────────────────────────────────┘
                │                                      │
                │              HTTPS/WSS              │
                └──────────────────┬───────────────────┘
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            BACKEND API                                        │
│                        (Node.js + Express)                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │    Auth     │ │Transcription│ │   User      │ │      Analytics          │ │
│  │   Service   │ │   Service   │ │   Service   │ │       Service           │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────────┘ │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │ Vocabulary  │ │   History   │ │Organization │ │       Webhook           │ │
│  │   Service   │ │   Service   │ │   Service   │ │       Service           │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
                │                      │                        │
                ▼                      ▼                        ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────────┐
│    Supabase           │ │    OpenAI API         │ │    Supabase Storage       │
│    (PostgreSQL)       │ │    (Whisper)          │ │    (Audio/Assets)         │
│                       │ │                       │ │                           │
│  - Users              │ │  - Speech-to-Text     │ │  - Custom Sounds          │
│  - Organizations      │ │  - Multi-language     │ │  - Temp Audio Storage     │
│  - Transcriptions     │ │                       │ │                           │
│  - Vocabulary         │ │                       │ │                           │
│  - Settings           │ │                       │ │                           │
│  - Analytics          │ │                       │ │                           │
└───────────────────────┘ └───────────────────────┘ └───────────────────────────┘
```

### 6.2 Desktop Application Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        TAURI APPLICATION                                    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                     REACT FRONTEND (WebView)                         │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────────┐  │  │
│  │  │   Tray UI   │ │  Settings   │ │   History   │ │   Overlays    │  │  │
│  │  │  Component  │ │    Panel    │ │    Panel    │ │  (Toast/Edit) │  │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └───────────────┘  │  │
│  │                                                                      │  │
│  │  ┌─────────────────────────────────────────────────────────────┐    │  │
│  │  │                    STATE MANAGEMENT (Zustand)                │    │  │
│  │  │  - Recording State  - Settings  - History  - User Session   │    │  │
│  │  └─────────────────────────────────────────────────────────────┘    │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                    │                                       │
│                          Tauri IPC Bridge                                  │
│                                    │                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                       RUST BACKEND                                   │  │
│  │                                                                      │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │  │
│  │  │  Global Hotkey  │  │  Audio Capture  │  │    Clipboard        │  │  │
│  │  │    Handler      │  │    Engine       │  │    Manager          │  │  │
│  │  │  (rdev crate)   │  │  (cpal crate)   │  │  (arboard crate)    │  │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘  │  │
│  │                                                                      │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │  │
│  │  │   System Tray   │  │   Local Store   │  │    Audio Player     │  │  │
│  │  │    Manager      │  │   (SQLite)      │  │    (rodio crate)    │  │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────│  │
│  │                                                                      │  │
│  │  ┌─────────────────────────────────────────────────────────────┐    │  │
│  │  │                    HTTP CLIENT (reqwest)                     │    │  │
│  │  │           API Communication with Backend                     │    │  │
│  │  └─────────────────────────────────────────────────────────────┘    │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Backend API Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          EXPRESS APPLICATION                                │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                         MIDDLEWARE LAYER                              │ │
│  │  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────┐  │ │
│  │  │  CORS   │ │  Auth    │ │  Rate   │ │  Error   │ │   Logging    │  │ │
│  │  │         │ │  JWT     │ │ Limiting│ │ Handler  │ │   (Winston)  │  │ │
│  │  └─────────┘ └──────────┘ └─────────┘ └──────────┘ └──────────────┘  │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                          ROUTE LAYER                                  │ │
│  │  /api/auth/*        - Authentication endpoints                        │ │
│  │  /api/transcribe    - Transcription endpoint                          │ │
│  │  /api/users/*       - User management                                 │ │
│  │  /api/orgs/*        - Organization management                         │ │
│  │  /api/vocabulary/*  - Vocabulary management                           │ │
│  │  /api/history/*     - Transcription history                           │ │
│  │  /api/analytics/*   - Usage analytics                                 │ │
│  │  /api/settings/*    - Settings management                             │ │
│  │  /api/webhooks/*    - Webhook management (future)                     │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                        SERVICE LAYER                                  │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐ │ │
│  │  │    Auth     │ │Transcription│ │    User     │ │   Organization  │ │ │
│  │  │   Service   │ │   Service   │ │   Service   │ │     Service     │ │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘ │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐ │ │
│  │  │ Vocabulary  │ │   History   │ │  Analytics  │ │    Settings     │ │ │
│  │  │   Service   │ │   Service   │ │   Service   │ │     Service     │ │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                      DATA ACCESS LAYER                                │ │
│  │                    Supabase Client (PostgreSQL)                       │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

### 6.4 Technology Stack Summary

| Layer | Technology | Justification |
|-------|------------|---------------|
| Desktop App | Tauri (Rust + WebView) | Small bundle, low memory, native OS access |
| Desktop UI | React + TypeScript | Component reusability, type safety |
| Desktop State | Zustand | Lightweight, simple API |
| Desktop Storage | SQLite (via Tauri) | Local persistence, fast queries |
| Web Dashboard | Next.js 14 | SSR, API routes, excellent DX |
| Web UI | React + TypeScript + Tailwind | Consistent with desktop, utility-first CSS |
| Backend API | Node.js + Express | Familiar stack, matches existing infrastructure |
| Database | Supabase (PostgreSQL) | Existing account, built-in auth, real-time |
| Authentication | Supabase Auth | Integrated with database, handles OAuth |
| File Storage | Supabase Storage | Integrated, S3-compatible |
| Transcription | OpenAI Whisper API | Best accuracy, multi-language |
| Hosting (API) | Vercel or Railway | Easy deployment, auto-scaling |
| Hosting (Web) | Vercel | Optimal for Next.js |

---

## 7. Data Models

### 7.1 Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  organizations  │       │      users      │       │ transcriptions  │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │──┐    │ id (PK)         │
│ name            │  │    │ organization_id │◄─┘    │ user_id (FK)    │◄─┐
│ settings (JSON) │  │    │ email           │  │    │ text            │  │
│ created_at      │  │    │ name            │  │    │ duration_ms     │  │
│ updated_at      │  └───►│ role            │  │    │ language        │  │
└─────────────────┘       │ status          │  │    │ audio_size      │  │
                          │ settings (JSON) │  │    │ created_at      │  │
                          │ created_at      │  │    └─────────────────┘  │
                          │ last_active_at  │  │                         │
                          └─────────────────┘  │    ┌─────────────────┐  │
                                    │          │    │ vocabulary      │  │
                                    │          │    ├─────────────────┤  │
                          ┌─────────────────┐  │    │ id (PK)         │  │
                          │  user_settings  │  │    │ user_id (FK)    │◄─┤
                          ├─────────────────┤  │    │ org_id (FK)     │  │
                          │ id (PK)         │  │    │ word            │  │
                          │ user_id (FK)    │◄─┘    │ hint            │  │
                          │ hotkey_record   │       │ scope           │  │
                          │ hotkey_history  │       │ created_at      │  │
                          │ auto_paste_mode │       └─────────────────┘  │
                          │ display_mode    │                            │
                          │ language        │       ┌─────────────────┐  │
                          │ audio_enabled   │       │  usage_logs     │  │
                          │ history_limit   │       ├─────────────────┤  │
                          │ updated_at      │       │ id (PK)         │  │
                          └─────────────────┘       │ user_id (FK)    │◄─┘
                                                    │ org_id (FK)     │
                          ┌─────────────────┐       │ minutes         │
                          │  system_sounds  │       │ cost            │
                          ├─────────────────┤       │ date            │
                          │ id (PK)         │       │ created_at      │
                          │ type            │       └─────────────────┘
                          │ file_url        │
                          │ uploaded_by     │
                          │ created_at      │
                          └─────────────────┘
```

### 7.2 Table Definitions

#### organizations
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Organization display name |
| settings | JSONB | DEFAULT '{}' | Organization-level settings |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

#### users
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| organization_id | UUID | FK → organizations.id | Parent organization |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email |
| name | VARCHAR(255) | NOT NULL | Display name |
| role | ENUM | NOT NULL | 'super_admin', 'admin', 'user' |
| status | ENUM | DEFAULT 'pending' | 'pending', 'active', 'inactive' |
| password_hash | VARCHAR(255) | | Bcrypt hash |
| settings | JSONB | DEFAULT '{}' | User preferences |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| last_active_at | TIMESTAMP | | Last activity |

#### transcriptions
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → users.id, NOT NULL | Owner |
| text | TEXT | NOT NULL | Transcribed text |
| duration_ms | INTEGER | NOT NULL | Recording duration |
| language | VARCHAR(10) | NOT NULL | Language code |
| audio_size_bytes | INTEGER | | Original audio size |
| created_at | TIMESTAMP | DEFAULT NOW hundredTH() | Creation timestamp |

#### vocabulary
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → users.id, NULLABLE | Owner (null = org/global) |
| organization_id | UUID | FK → organizations.id, NULLABLE | Org scope |
| word | VARCHAR(255) | NOT NULL | Word or phrase |
| hint | VARCHAR(255) | | Pronunciation hint |
| scope | ENUM | NOT NULL | 'personal', 'team', 'global' |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

#### user_settings
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → users.id, UNIQUE | Owner |
| hotkey_record | VARCHAR(50) | DEFAULT 'Ctrl+Shift+Space' | Recording hotkey |
| hotkey_history | VARCHAR(50) | DEFAULT 'Ctrl+Shift+H' | History hotkey |
| auto_paste_mode | ENUM | DEFAULT 'smart' | 'always', 'smart', 'never' |
| display_mode | ENUM | DEFAULT 'direct' | 'direct', 'toast', 'edit' |
| language | VARCHAR(10) | DEFAULT 'en' | Preferred language |
| audio_enabled | BOOLEAN | DEFAULT true | Audio feedback |
| history_limit_mb | INTEGER | DEFAULT 10 | History storage limit |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

#### usage_logs
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → users.id | User |
| organization_id | UUID | FK → organizations.id | Organization |
| minutes | DECIMAL(10,2) | NOT NULL | Minutes transcribed |
| estimated_cost | DECIMAL(10,4) | NOT NULL | Cost in USD |
| date | DATE | NOT NULL | Usage date |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

#### system_sounds
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| type | ENUM | NOT NULL | 'start', 'stop' |
| file_url | VARCHAR(500) | NOT NULL | Storage URL |
| uploaded_by | UUID | FK → users.id | Uploader |
| is_active | BOOLEAN | DEFAULT true | Currently in use |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

---

## 8. API Specifications

### 8.1 Authentication Endpoints

#### POST /api/auth/login
Authenticate user and receive tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "admin",
      "organizationId": "uuid"
    },
    "tokens": {
      "accessToken": "jwt...",
      "refreshToken": "jwt...",
      "expiresIn": 900
    }
  }
}
```

#### POST /api/auth/refresh
Refresh access token.

#### POST /api/auth/logout
Invalidate refresh token.

#### POST /api/auth/forgot-password
Initiate password reset.

#### POST /api/auth/reset-password
Complete password reset with token.

---

### 8.2 Transcription Endpoint

#### POST /api/transcribe
Transcribe audio file.

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data
```

**Request:**
```
audio: (binary file, WAV/MP3)
language: "en" (optional)
vocabulary: ["custom", "words"] (optional, JSON array)
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "transcriptionId": "uuid",
    "text": "Transcribed text appears here.",
    "language": "en",
    "durationMs": 5230,
    "processingTimeMs": 1250
  }
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "error": {
    "code": "TRANSCRIPTION_FAILED",
    "message": "Failed to process audio file"
  }
}
```

---

### 8.3 User Management Endpoints

#### GET /api/users
List users (filtered by role permissions).

#### POST /api/users/invite
Invite new user.

#### GET /api/users/:id
Get user details.

#### PATCH /api/users/:id
Update user.

#### DELETE /api/users/:id
Deactivate user.

---

### 8.4 Vocabulary Endpoints

#### GET /api/vocabulary
Get user's vocabulary (personal + team + global).

#### POST /api/vocabulary
Add vocabulary entry.

#### DELETE /api/vocabulary/:id
Remove vocabulary entry.

#### POST /api/vocabulary/import
Import vocabulary from CSV.

#### GET /api/vocabulary/export
Export vocabulary to CSV.

---

### 8.5 History Endpoints

#### GET /api/history
Get transcription history.

**Query Parameters:**
- `limit`: Number of entries (default: 50)
- `offset`: Pagination offset
- `from`: Start date filter
- `to`: End date filter

#### DELETE /api/history/:id
Delete history entry.

#### DELETE /api/history
Clear all history.

---

### 8.6 Analytics Endpoints

#### GET /api/analytics/usage
Get usage statistics.

**Query Parameters:**
- `period`: 'day', 'week', 'month', 'custom'
- `from`: Start date (for custom)
- `to`: End date (for custom)
- `groupBy`: 'user', 'organization', 'day'

**Response:**
```json
{
  "success": true,
  "data": {
    "totalMinutes": 1250.5,
    "totalTranscriptions": 847,
    "estimatedCost": 7.50,
    "breakdown": [
      {
        "date": "2024-11-25",
        "minutes": 45.2,
        "transcriptions": 32,
        "cost": 0.27
      }
    ]
  }
}
```

---

### 8.7 Settings Endpoints

#### GET /api/settings
Get user settings.

#### PATCH /api/settings
Update user settings.

#### GET /api/settings/sounds
Get current system sounds.

#### POST /api/settings/sounds
Upload new system sound (Super Admin only).

---

## 9. UI/UX Requirements

### 9.1 Desktop Application

#### Main Window
- **Dimensions:** 400x500px default, resizable
- **Components:**
  - Status indicator (recording/idle)
  - Quick settings access
  - History button
  - Minimize to tray button

#### System Tray
- **Icon States:**
  - Default: Application icon (gray/neutral)
  - Recording: Red/pulsing indicator
  - Error: Yellow warning indicator
- **Context Menu:**
  - Open SpeakEasy
  - Settings
  - History
  - Pause/Resume
  - Quit

#### Settings Panel
- **Tabs:**
  - General (hotkeys, language)
  - Recording (microphone, audio feedback)
  - Display (paste mode, display mode)
  - Account (profile, logout)
  - About (version, updates)

#### History Popup
- **Trigger:** Hotkey (Ctrl+Shift+H default)
- **Dimensions:** 350x400px
- **Features:**
  - Scrollable list of recent transcriptions
  - Timestamp for each entry
  - Single-click to copy
  - Right-click for more options (delete)
  - Search filter

#### Toast Notification
- **Position:** Bottom-right corner
- **Duration:** 3 seconds
- **Content:** Truncated transcription preview
- **Action:** Click to copy again

#### Edit Popup
- **Dimensions:** 400x200px
- **Components:**
  - Editable text area
  - Character count
  - Confirm button (Enter)
  - Cancel button (Escape)

### 9.2 Web Dashboard

#### Layout
- **Navigation:** Left sidebar
- **Content:** Main area with responsive grid
- **Header:** User menu, notifications

#### Pages
1. **Dashboard:** Usage overview, quick stats
2. **History:** Searchable transcription history
3. **Vocabulary:** Personal vocabulary management
4. **Team:** (Admin) User management
5. **Team Vocabulary:** (Admin) Team vocabulary
6. **Analytics:** (Admin) Usage charts and reports
7. **Settings:** User preferences
8. **Organization:** (Admin) Org settings

### 9.3 Design System

#### Colors
| Purpose | Color | Usage |
|---------|-------|-------|
| Primary | #3B82F6 | Buttons, links, accents |
| Secondary | #64748B | Secondary text, borders |
| Success | #22C55E | Success states |
| Warning | #F59E0B | Warnings |
| Error | #EF4444 | Errors, recording indicator |
| Background | #F8FAFC | Page background |
| Surface | #FFFFFF | Card backgrounds |
| Text | #1E293B | Primary text |

#### Typography
- **Font Family:** Inter, system-ui, sans-serif
- **Headings:** 600 weight
- **Body:** 400 weight
- **Sizes:** 12px, 14px, 16px, 18px, 24px, 32px

---

## 10. Integration Specifications

### 10.1 Future Integration Architecture

The system is designed to support third-party integrations in Phase 4.

#### Webhook Support
- **Events:**
  - `transcription.completed`
  - `transcription.failed`
  - `user.created`
  - `usage.threshold_reached`

#### Webhook Payload Example
```json
{
  "event": "transcription.completed",
  "timestamp": "2024-11-26T10:30:00Z",
  "data": {
    "transcriptionId": "uuid",
    "userId": "uuid",
    "text": "Transcribed text...",
    "language": "en",
    "durationMs": 5230
  }
}
```

### 10.2 Supported Platforms (Future)
- **n8n:** Native webhook integration
- **Zapier:** Zapier app (requires Zapier partnership)
- **Make.com:** Webhook integration
- **Custom:** REST API for direct integration

### 10.3 API Access (Future)
- API keys for external access
- Rate limiting per key
- Scoped permissions

---

## 11. Phased Delivery Roadmap

### Phase 1: MVP (Weeks 1-4)

**Goal:** Core dictation functionality, basic auth, Windows + Mac builds

| Feature | Priority | Effort |
|---------|----------|--------|
| Desktop app scaffold (Tauri) | P0 | 3 days |
| Global hotkey handling | P0 | 2 days |
| Audio capture | P0 | 2 days |
| Whisper API integration | P0 | 2 days |
| Clipboard management | P0 | 1 day |
| Auto-paste (basic) | P0 | 2 days |
| System tray | P0 | 2 days |
| Backend API scaffold | P0 | 2 days |
| Supabase auth integration | P0 | 2 days |
| User login/logout | P0 | 2 days |
| Basic transcription history | P0 | 2 days |
| Windows build | P0 | 2 days |
| Mac build | P0 | 2 days |

**Deliverable:** Working desktop app with dictation, auth, and basic history.

---

### Phase 2: Polish & Settings (Weeks 5-6)

**Goal:** User preferences, audio feedback, quality of life improvements

| Feature | Priority | Effort |
|---------|----------|--------|
| User settings panel | P1 | 3 days |
| Configurable hotkeys | P1 | 2 days |
| Audio feedback (sounds) | P1 | 2 days |
| Visual recording indicator | P1 | 1 day |
| Transcription display options | P1 | 2 days |
| History quick-access hotkey | P1 | 1 day |
| Multi-language support | P1 | 2 days |
| Personal vocabulary | P1 | 3 days |
| Password reset flow | P0 | 1 day |
| Bug fixes and polish | P1 | 3 days |

**Deliverable:** Full-featured desktop app with customization.

---

### Phase 3: Team Features (Weeks 7-9)

**Goal:** Web dashboard, user management, team features

| Feature | Priority | Effort |
|---------|----------|--------|
| Web dashboard scaffold | P1 | 3 days |
| Dashboard authentication | P1 | 2 days |
| User management (CRUD) | P1 | 3 days |
| User invitation flow | P1 | 2 days |
| Role-based access control | P1 | 2 days |
| Team vocabulary | P2 | 3 days |
| Usage analytics | P1 | 4 days |
| Organization settings | P2 | 2 days |
| Custom sound upload | P2 | 2 days |
| Cost tracking | P2 | 2 days |

**Deliverable:** Complete web dashboard for administration.

---

### Phase 4: Integrations & Advanced (Weeks 10-12+)

**Goal:** External integrations, voice commands, advanced features

| Feature | Priority | Effort |
|---------|----------|--------|
| Webhook system | P2 | 4 days |
| API key management | P2 | 2 days |
| n8n/Zapier documentation | P2 | 2 days |
| Extended history storage | P2 | 2 days |
| Voice commands (basic) | P3 | 5 days |
| Auto-correction rules | P3 | 3 days |
| Advanced analytics | P3 | 4 days |
| Mobile app planning | P3 | TBD |

**Deliverable:** Integration-ready platform with advanced features.

---

## 12. Risk Assessment

### 12.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Whisper API accuracy insufficient | Low | High | Test extensively; fallback to Deepgram |
| Global hotkey conflicts | Medium | Medium | Allow customization; avoid common combos |
| Cross-platform inconsistencies | Medium | Medium | Extensive testing; platform-specific code |
| Tauri limitations | Low | High | Evaluate early; fallback to Electron |
| Audio capture issues | Medium | High | Support multiple audio backends |

### 12.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| OpenAI API price increase | Low | Medium | Monitor costs; evaluate alternatives |
| User adoption resistance | Medium | High | Focus on UX; match existing tool behavior |
| Scope creep | High | Medium | Strict phase boundaries; prioritization |
| Support burden | Medium | Medium | Good documentation; in-app help |

### 12.3 Security Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| API key exposure | Low | Critical | Server-side only; never in client |
| User data breach | Low | Critical | Encryption; Supabase security |
| Session hijacking | Low | High | JWT best practices; short expiry |
| Audio interception | Low | Medium | TLS; delete audio after transcription |

---

## 13. Success Metrics

### 13.1 Key Performance Indicators (KPIs)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Transcription accuracy** | ≥95% | User feedback surveys, spot checks |
| **Transcription latency** | <5 sec (avg) | API logs |
| **User adoption** | 100% of team in 30 days | Active user count |
| **Daily active users** | >80% of total users | Login/usage data |
| **Cost per user** | <$10/month | Usage logs |
| **System uptime** | 99.5% | Monitoring |
| **User satisfaction** | >4.0/5.0 | Quarterly surveys |

### 13.2 Launch Criteria (MVP)

- [ ] All P0 features implemented and tested
- [ ] Windows and Mac builds functional
- [ ] Core workflow works end-to-end
- [ ] Authentication secure and tested
- [ ] <5 known critical bugs
- [ ] Basic documentation complete
- [ ] 3 internal users beta tested for 1 week

### 13.3 Post-Launch Monitoring

- Daily: Error rates, transcription volume, latency
- Weekly: User adoption, feature usage, costs
- Monthly: User satisfaction, feature requests, roadmap review

---

## 14. Appendices

### Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Transcription** | The text output from converting speech to text |
| **Hotkey** | A keyboard combination that triggers an action system-wide |
| **Whisper** | OpenAI's speech-to-text AI model |
| **Tauri** | Framework for building desktop apps with web technologies |
| **Supabase** | Open-source Firebase alternative (database + auth + storage) |

### Appendix B: Reference Documents

- OpenAI Whisper API Documentation
- Tauri v1 Documentation
- Supabase Documentation
- Existing system architecture documents (authentication-system.md, etc.)

### Appendix C: Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-11-26 | Technical Team | Initial draft |

---

## Document Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | | | |
| Technical Lead | | | |
| Development Lead | | | |

---

*End of Software Requirements Specification*
