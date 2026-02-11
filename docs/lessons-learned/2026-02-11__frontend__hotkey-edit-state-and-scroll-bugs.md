# Hotkey Edit State & Scroll Bugs

**Date:** 2026-02-11
**Area:** Frontend - Settings Panel
**Tags:** state-management, css-overflow, scroll, settings-panel, collapsible-section

## Summary

Settings panel hotkey actions had 5 interacting bugs preventing edit form access and independent list scrolling. Previous fix attempts (Dec 2025) focused on section reorganization and deferred loading but never addressed the underlying state management and overflow issues.

## Problems Found

### 1. State conflict blocks edit form (CRITICAL)
Edit button (`setEditingWebhook(webhook)`) did NOT clear `isAddingWebhook`. The edit form condition requires `!isAddingWebhook && editingWebhook?.id === webhook.id`. If user ever clicked "+ Add Action" without completing, all subsequent edit clicks silently failed.

### 2. No scroll-to-form
No `scrollIntoView` anywhere in the codebase. Edit form expands inline below visible area with no auto-scroll.

### 3. No independent list scrolling
Hotkey list container (`<div className="space-y-2">`) had no max-height or overflow. With many items, it pushed all sections below it down.

### 4. CollapsibleSection permanent overflow-hidden
`overflow-hidden` was always applied, even when fully expanded. This prevented any inner scrollable container from working. Needed for collapse animation but should be removed once expanded.

### 5. Incomplete state clearing
`updateWebhookAction()` didn't clear `isAddingWebhook`. `deleteWebhookAction()` didn't clear either state variable.

## Solutions

1. Edit onClick now clears `isAddingWebhook` before setting `editingWebhook`
2. Added `editFormRef` + `useEffect` with `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` on edit
3. Added `max-h-[320px] overflow-y-auto` to list container
4. Made `overflow-hidden` conditional via `isAnimating` timer (only during 300ms transition)
5. Added full state clearing to `updateWebhookAction()` and `deleteWebhookAction()`

## Prevention

- When two state variables interact in conditional rendering (`!stateA && stateB`), ensure ALL mutation points clear/set both appropriately
- Any dynamically expanding inline content needs `scrollIntoView` logic
- `overflow-hidden` for CSS animations should be conditional — apply only during transition, remove when stable
- List containers that can grow unbounded need independent scroll constraints

## References

- `src/components/SettingsPanel.tsx` - Lines 134-135 (state), 444-461 (helpers), 906 (list), 921 (edit form), 1079 (edit button)
- `src/components/CollapsibleSection.tsx` - Lines 22-35 (animation state), 84-87 (conditional overflow)
