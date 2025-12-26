# Contributing to Modern Mermaid

First off, thank you for considering contributing to Modern Mermaid! It's people like you that make Modern Mermaid such a great tool.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Testing](#testing)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to support@gotoailab.com.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps to reproduce the problem**
* **Provide specific examples to demonstrate the steps**
* **Describe the behavior you observed and what behavior you expected**
* **Include screenshots if possible**
* **Include your environment details** (OS, browser, Node.js version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title**
* **Provide a detailed description of the suggested enhancement**
* **Provide specific examples to demonstrate the enhancement**
* **Explain why this enhancement would be useful**

### Your First Code Contribution

Unsure where to begin? You can start by looking through `good-first-issue` and `help-wanted` issues:

* **Good first issues** - issues which should only require a few lines of code
* **Help wanted issues** - issues which should be a bit more involved than beginner issues

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. Ensure the test suite passes
4. Make sure your code lints
5. Issue that pull request!

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/modern_mermaid.git
cd modern_mermaid

# Add upstream remote
git remote add upstream https://github.com/gotoailab/modern_mermaid.git

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## Pull Request Process

1. **Update Documentation**: Update the README.md with details of changes if needed
2. **Update Tests**: Add or update tests as needed
3. **Follow Code Style**: Ensure your code follows the project's coding standards
4. **Run Linter**: Make sure `pnpm lint` passes
5. **Build Successfully**: Ensure `pnpm build` completes without errors
6. **One Feature Per PR**: Keep pull requests focused on a single feature or fix
7. **Clear Description**: Provide a clear description of the problem and solution

## Coding Standards

### TypeScript

* Use TypeScript for all new code
* Avoid using `any` type unless absolutely necessary
* Use interfaces for object types
* Use proper type annotations

### React

* Use functional components with hooks
* Keep components small and focused
* Use meaningful component and variable names
* Implement proper error boundaries

### Styling

* Use Tailwind CSS utility classes
* Follow the existing design patterns
* Ensure responsive design
* Support dark mode

### File Organization

```
src/
├── components/       # React components
├── contexts/        # React contexts
├── hooks/           # Custom hooks
├── types/           # TypeScript types
├── utils/           # Utility functions
└── assets/          # Static assets
```

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

* **feat**: A new feature
* **fix**: A bug fix
* **docs**: Documentation only changes
* **style**: Changes that don't affect the code meaning
* **refactor**: Code change that neither fixes a bug nor adds a feature
* **perf**: Performance improvements
* **test**: Adding missing tests
* **chore**: Changes to the build process or auxiliary tools

### Examples

```
feat(editor): add syntax highlighting for Mermaid code

Implements real-time syntax highlighting with color-coded keywords
for better code readability.

Closes #123
```

```
fix(export): resolve transparent background export issue

Fixed an issue where transparent PNG exports included
background color. Updated html-to-image configuration.

Fixes #456
```

## Testing

```bash
# Run linter
pnpm lint

# Build project
pnpm build

# Preview build
pnpm preview
```

### Manual Testing Checklist

Before submitting a PR, please verify:

- [ ] All existing features still work
- [ ] New feature works as expected
- [ ] No console errors
- [ ] Responsive design works
- [ ] Dark mode works properly
- [ ] All diagram types render correctly
- [ ] Export functions work
- [ ] Annotation tools work

## Questions?

Feel free to:
* Open an issue with your question
* Join our [Discord community](https://discord.gg/tGxevHhz)
* Email us at support@gotoailab.com

Thank you for contributing! 🎉

