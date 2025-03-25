# Bug Fix Documentation Guidelines

## Overview

This document outlines the standards and best practices for documenting bug fixes in the Provider Percentile Calculator project. Proper documentation of bug fixes helps maintain institutional knowledge, prevents regression, and assists new developers in understanding the system's evolution.

## When to Document Bug Fixes

Document a bug fix when:

1. The fix addresses a significant issue affecting user experience
2. The fix resolves a complex or non-obvious problem
3. The fix involves changes to multiple components or systems
4. The fix addresses an integration issue between different parts of the application
5. The fix changes the behavior of a public API or user-facing feature

## Documentation Format

All bug fix documentation should be created as Markdown files in the `/docs` directory with a descriptive filename (e.g., `specialty-mapping-fix.md`).

## Required Sections

Each bug fix document should include the following sections:

### 1. Issue Header

```markdown
# [Component/Feature] Fix Documentation

## Issue: [Brief Description]

**Date:** [Date of Fix]  
**Fixed by:** [Your Name]  
**Components Affected:** [List of files/components]
```

### 2. Problem Description

A clear explanation of the issue, including:
- What was happening
- How it was affecting users
- Any error messages or symptoms

### 3. Root Cause Analysis

An explanation of what caused the issue, including:
- The underlying technical reason for the bug
- How the issue was identified
- Any related components or systems involved

### 4. Solution Implemented

A detailed description of the fix, including:
- The approach taken to resolve the issue
- Why this approach was chosen
- Any alternatives that were considered

### 5. Code Changes

Include the most relevant code changes, using code blocks with proper syntax highlighting:

```typescript
// Before
const oldFunction = () => {
  // problematic code
};

// After
const newFunction = () => {
  // fixed code
};
```

### 6. Testing and Verification

Describe how the fix was tested:
- Test cases used
- Verification steps
- Edge cases considered

### 7. Lessons Learned

Insights gained from fixing the issue:
- What could have prevented this bug
- Improvements to development processes
- Recommendations for future development

## Example

See [Specialty Mapping System Fix](specialty-mapping-fix.md) for an example of a well-documented bug fix.

## Integration with Project Documentation

After documenting a bug fix:

1. Update the docs/README.md to include a reference to the new document
2. For significant fixes, add a reference in the main README.md
3. Consider adding unit tests to prevent regression

## Best Practices

- Use clear, concise language
- Include code snippets for clarity
- Add screenshots or diagrams if they help explain the issue
- Link to related issues or pull requests
- Document any performance implications
- Note any configuration changes required 