# Agent Instructions Tests

This directory contains comprehensive validation tests for `agent_instructions.md`.

## Test Coverage

The test suite validates:

- **Document Structure**: Verifies proper XML/HTML tags, sections, and structure
- **Code Blocks**: Ensures all code blocks are properly formatted and closed
- **Capability Tags**: Validates proper nesting and completeness of capability definitions
- **Instructions Completeness**: Checks for all required instructions and guidelines
- **Examples Section**: Validates practical examples are present and properly formatted
- **XML/HTML Tag Validity**: Ensures all tags are properly opened and closed
- **Formatting Consistency**: Checks heading levels, list formatting, and spacing
- **Command Safety**: Validates warnings about destructive commands and restrictions
- **Best Practices**: Ensures project-specific guidelines are documented
- **Technical Accuracy**: Validates sed syntax, file paths, and command correctness
- **Escaping Guidelines**: Checks documentation of proper escaping techniques
- **Reference Snippets**: Validates presence and quality of reference examples
- **Content Readability**: Ensures reasonable line lengths and clear terminology
- **Edge Cases**: Validates warnings about multi-line edits and special cases
- **Git Integration**: Checks git command documentation and restrictions
- **Python/Node.js Integration**: Validates scripting integration examples
- **File Operations**: Checks documentation of file creation and manipulation
- **Tool-Specific Guidance**: Validates documentation for ast-grep, rg, fd, jq
- **Pattern Anchoring**: Ensures anchoring techniques are well-documented
- **Documentation Completeness**: Validates overall comprehensiveness
- **Consistency Checks**: Ensures consistent terminology and formatting

## Running Tests

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Test Organization

Tests are organized into logical describe blocks that mirror the structure of the documentation:
- Each major section has its own test group
- Tests progress from basic structure to detailed content validation
- Edge cases and advanced scenarios are covered separately

## Adding New Tests

When adding new tests:
1. Place them in the appropriate describe block based on what they validate
2. Use descriptive test names that clearly indicate what is being checked
3. Follow the existing pattern of expect assertions
4. Add comments for complex validation logic