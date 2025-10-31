# Contributing to IOC Framework

Thank you for your interest in contributing to the IOC Framework! We welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [License](#license)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and professional in all interactions.

## How to Contribute

There are many ways to contribute:

- **Report bugs**: Open an issue describing the bug, including steps to reproduce
- **Suggest features**: Open an issue with your feature proposal
- **Improve documentation**: Submit PRs to improve README, examples, or code comments
- **Fix bugs**: Look for issues labeled "bug" or "good first issue"
- **Add features**: Discuss major features in an issue before implementing

## Development Setup

1. **Fork and clone the repository**:

   ```bash
   git clone https://github.com/YOUR_USERNAME/ioc.git
   cd ioc
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Run tests**:

   ```bash
   npm test
   ```

4. **Build the project**:
   ```bash
   npm run build
   ```

## Coding Standards

- **TypeScript**: Use TypeScript for all code
- **Formatting**: Use Prettier (configuration included in `.prettierrc`)
- **Linting**: Ensure code passes all linting checks
- **Comments**: Add JSDoc comments for public APIs
- **Types**: Avoid `any` types; use proper type annotations

## Testing

- Write tests for all new features and bug fixes
- Tests are located in `src/tests/`
- Run tests with: `npm test`
- Ensure all tests pass before submitting a PR

## Submitting Changes

1. **Create a branch**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Write clear, descriptive commit messages
   - Keep commits focused and atomic
   - Add tests for new functionality

3. **Test your changes**:

   ```bash
   npm test
   npm run build
   ```

4. **Push to your fork**:

   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request**:
   - Provide a clear description of the changes
   - Reference any related issues
   - Explain the motivation and context

## Pull Request Guidelines

- **Title**: Use a clear, descriptive title
- **Description**: Explain what the PR does and why
- **Tests**: Include tests for new features
- **Documentation**: Update relevant documentation
- **Breaking Changes**: Clearly mark any breaking changes

## Commit Message Format

Use clear, descriptive commit messages:

```
type: short description

Longer explanation if needed.

Fixes #123
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Test additions or changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `chore`: Build/tooling changes

## License

By contributing to IOC Framework, you agree that your contributions will be licensed under the MIT License (see [LICENSE](LICENSE)).

You certify that:

- You have the right to submit the contribution
- Your contribution is your original work or properly attributed
- You understand your contribution will be publicly available

## Questions?

If you have questions about contributing, feel free to:

- Open an issue for discussion
- Ask in your pull request
- Contact the maintainers

Thank you for contributing to IOC Framework!
