# Code Rules

This folder contains rules that Claude should follow when writing code for this project.

## How Rules Work

- Rules in this folder are automatically loaded by Claude Code
- Each `.md` file in this folder defines rules for specific scenarios
- Rules help maintain consistency across the codebase

## Example Rule Files

Create files like:
- `typescript.md` - TypeScript conventions
- `react.md` - React component patterns
- `api.md` - API design guidelines
- `testing.md` - Test writing standards

## Rule File Format

```markdown
# Rule Name

## When to Apply
[Describe when this rule applies]

## Rules
1. Rule one
2. Rule two

## Examples

### Good
```code
// good example
```

### Bad
```code
// bad example
```
```

## Project-Specific Rules

Add your project's coding standards here to ensure Claude follows them consistently.
