# Bug #01: Language Parameter Inconsistency

**Bug ID:** BUG-001  
**Date Identified:** December 14, 2025  
**Priority:** Critical 🔴  
**Severity:** High - Breaks user-facing functionality  
**Status:** Open  
**Estimated Fix Time:** 30 minutes  

---

## Affected Files

- [`src/components/RecordingButton.tsx`](../../src/components/RecordingButton.tsx) - Line 36
- [`src/App.tsx`](../../src/App.tsx) - Line 131 (correct implementation)

---

## Description

The application handles the "auto-detect language" setting inconsistently across two components. When a user selects "Auto-detect" for transcription language, `RecordingButton.tsx` converts it to `"en"` (English), while `App.tsx` correctly passes `null` to enable auto-detection via the Whisper API.

### User-Facing Impact

- Users who select "Auto-detect" language will always get English transcription when using the recording button in the main UI
- Only the global hotkey path (handled by App.tsx) correctly auto-detects language
- Non-English speakers expecting auto-detection will receive incorrect transcriptions
- This violates the SRS requirement FR-D015 for multi-language support

---

## Root Cause Analysis

### Technical Explanation

The OpenAI Whisper API accepts `null` or omission of the language parameter to enable automatic language detection. The codebase has two different recording flows:

1. **Global Hotkey Flow** (App.tsx) - Correctly implements auto-detect
2. **UI Button Flow** (RecordingButton.tsx) - Incorrectly defaults to English

### Current Code (Incorrect)

```typescript:src/components/RecordingButton.tsx
// Line 36
const lang = settings.language === "auto" ? "en" : settings.language;
```

This explicitly converts auto-detect to English, preventing the Whisper API from performing automatic language detection.

### Correct Implementation Reference

```typescript:src/App.tsx
// Lines 129-131
// Get language from settings - pass null for auto-detect
const currentSettings = useAppStore.getState().settings;
const lang = currentSettings.language === "auto" ? null : currentSettings.language;
```

### Why This Is Problematic

1. **Functional Failure:** Auto-detect feature doesn't work via UI button
2. **User Confusion:** Same setting produces different behavior depending on input method
3. **Data Quality:** Non-English audio incorrectly transcribed as English gibberish
4. **SRS Violation:** Breaks multi-language support requirements

---

## Reproduction Steps

### Prerequisites
- SpeakEasy desktop app installed
- OpenAI API key configured
- Audio input device available

### Steps to Reproduce

1. Open SpeakEasy settings
2. Set "Transcription Language" to "Auto-detect"
3. Click the recording button in the main UI window
4. Speak in a non-English language (e.g., Spanish, Filipino)
5. Stop recording
6. Observe transcription result

**Expected Result:** Text transcribed in the spoken language  
**Actual Result:** Text transcribed as if English was spoken (poor quality)

### Comparison Test

1. Repeat steps 1-4 above
2. Instead of clicking the button, use the global hotkey (Ctrl+Space)
3. Observe transcription result

**Result:** Correctly transcribes in the spoken language (demonstrates inconsistency)

---

## Proposed Fix

### Solution

Change line 36 in `RecordingButton.tsx` to match the pattern in `App.tsx`:

#### Before (Incorrect)
```typescript
const lang = settings.language === "auto" ? "en" : settings.language;
```

#### After (Correct)
```typescript
const lang = settings.language === "auto" ? null : settings.language;
```

### Complete Context

```typescript:src/components/RecordingButton.tsx
const handleClick = async () => {
  if (recordingState === "idle") {
    // ... start recording code ...
  } else if (recordingState === "recording") {
    stopRecording();

    try {
      if (!apiKey) {
        // ... error handling ...
      }

      // Call Tauri backend to transcribe - always use English unless specified
      const lang = settings.language === "auto" ? null : settings.language; // ← FIX HERE
      const result = await invoke<{
        text: string;
        language: string;
        duration_ms: number;
      }>("transcribe_audio", {
        apiKey,
        language: lang,  // This will now correctly pass null for auto-detect
      });

      // ... rest of the code ...
    }
  }
};
```

### Alternative Approaches Considered

1. **Centralized Helper Function:**
   ```typescript
   // utils/language.ts
   export const normalizeLanguageCode = (language: string): string | null => {
     return language === "auto" ? null : language;
   };
   ```
   - Pros: Single source of truth, easier to maintain
   - Cons: Overkill for such a simple operation
   - Recommendation: Good for future if more language logic is added

2. **Backend Handling:**
   - Let the backend convert "auto" to null
   - Pros: Centralized logic, frontend stays simple
   - Cons: Frontend should own its data contracts
   - Recommendation: Not preferred, frontend should send correct values

**Recommended:** Direct fix as shown above (simplest, matches existing pattern)

---

## Testing Plan

### Unit Tests

Create test file: `src/components/__tests__/RecordingButton.test.tsx`

```typescript
describe('RecordingButton language handling', () => {
  it('should pass null for auto-detect language', async () => {
    // Arrange
    const mockSettings = { language: 'auto', /* ... */ };
    const mockInvoke = jest.fn();
    
    // Act
    // Trigger recording stop with auto-detect enabled
    
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith(
      'transcribe_audio',
      expect.objectContaining({
        language: null  // Should be null, not "en"
      })
    );
  });

  it('should pass language code when specific language selected', async () => {
    // Arrange
    const mockSettings = { language: 'es', /* ... */ };
    const mockInvoke = jest.fn();
    
    // Act
    // Trigger recording stop with Spanish selected
    
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith(
      'transcribe_audio',
      expect.objectContaining({
        language: 'es'
      })
    );
  });
});
```

### Integration Tests

```typescript
describe('RecordingButton integration', () => {
  it('should correctly transcribe Spanish audio with auto-detect', async () => {
    // Use test audio file with Spanish speech
    // Verify transcription is in Spanish, not garbled English
  });

  it('should match hotkey behavior for auto-detect', async () => {
    // Compare results from button vs hotkey with same audio
    // Verify both produce identical transcription
  });
});
```

### Manual Testing Checklist

- [ ] Set language to "Auto-detect" in settings
- [ ] Record English speech via button → Verify English transcription
- [ ] Record Spanish speech via button → Verify Spanish transcription
- [ ] Record Filipino speech via button → Verify Filipino transcription
- [ ] Set language to "English" explicitly → Verify still works
- [ ] Set language to "Spanish" explicitly → Verify still works
- [ ] Compare button vs hotkey results → Verify identical behavior
- [ ] Check API logs → Verify `language: null` is sent for auto-detect

### Edge Cases to Verify

1. **Empty/null settings.language:** Should not crash
2. **Unsupported language code:** Backend should handle gracefully
3. **API key missing:** Should fail gracefully regardless of language setting
4. **Network error during transcription:** Should not affect language parameter

---

## Related Context

### Lessons Learned References

No previous documentation found in [`lessons-learned/`](../../lessons-learned/) regarding language handling patterns. This is a new discovery.

### SRS Requirements

From [`speakeasy-srs.md`](../../speakeasy-srs.md):

**FR-D015: Multi-Language Support**
> Users can select their preferred transcription language...Future: Auto-detect language option

**Acceptance Criteria #5:**
> User can switch languages without restart

**Acceptance Criteria #6:**
> Future: Auto-detect language option

This bug prevents the auto-detect feature from working correctly via the UI button.

### Transform Feature Plan

[`TRANSFORM_FEATURE_PLAN.md`](../../TRANSFORM_FEATURE_PLAN.md) references transcription but doesn't specify language handling patterns. This fix should be documented as a pattern for future features.

### Related Bugs

- **None directly related**
- Future consideration: Create a centralized language utility if more language logic is added

---

## Implementation Checklist

- [ ] Update `src/components/RecordingButton.tsx` line 36
- [ ] Add unit tests for language parameter handling
- [ ] Run existing test suite to verify no regressions
- [ ] Manual test with multiple languages
- [ ] Verify behavior matches hotkey flow
- [ ] Update any relevant documentation
- [ ] Add code comment explaining null = auto-detect
- [ ] Consider adding to lessons-learned after fix

---

## Post-Fix Validation

### Success Criteria

1. ✅ Auto-detect setting passes `null` to API from both button and hotkey
2. ✅ Non-English audio correctly transcribed when auto-detect enabled
3. ✅ Explicit language selection still works correctly
4. ✅ No regression in existing functionality
5. ✅ Unit tests pass
6. ✅ Manual test checklist completed

### Rollback Plan

If the fix causes issues:
1. Revert the single line change
2. Disable auto-detect option in UI until properly fixed
3. Document known limitation in release notes

---

## Notes

- This is a **critical bug** because it breaks advertised functionality
- The fix is **trivial** (one line) but has **high impact**
- Should be included in next hotfix release
- Consider adding a linter rule to catch similar inconsistencies

**Discovered By:** Code review analysis  
**Verified By:** [Pending]  
**Fixed By:** [Pending]  
**Fix Date:** [Pending]
