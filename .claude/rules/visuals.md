# Visual Documentation

## When to Apply
When creating diagrams, flowcharts, architecture visuals, or any visual representation for documentation (markdown files, README, etc.).

## Rules

1. **Use Nano Banana for visuals** - Never create ASCII art diagrams. Use the `mcp__nano-banana__generate_image` tool instead.

2. **Save images to `docs/images/`** - Create the folder if it doesn't exist. Use descriptive filenames like `data-flow-diagram.png`, `workflow-diagram.png`, `architecture-overview.png`.

3. **Prompt style for diagrams** - Use prompts like:
   - "Clean modern infographic diagram..."
   - "Professional flowchart showing..."
   - "Software architecture diagram with..."
   - Include: "white background, flat design, vector-like clean lines, professional documentation style"

4. **Always add text summary** - Below the image, include a brief text description or bullet points for accessibility and searchability.

5. **Reference images with relative paths** - Use markdown: `![Description](docs/images/filename.png)`

## Examples

### Good
```markdown
## Architecture Overview

![Architecture Diagram](docs/images/architecture-overview.png)

**Components:** API Gateway → Auth Service → Database
```

### Bad
```markdown
## Architecture Overview

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│   API   │ ──▶ │  Auth   │ ──▶ │   DB    │
│ Gateway │     │ Service │     │         │
└─────────┘     └─────────┘     └─────────┘
```
```

## When NOT to Apply
- Inline code examples (use code blocks)
- Simple one-line flows in text (use arrows: `A → B → C`)
- Terminal output examples
