# Contributing

Thanks for your interest in contributing to @ts-utilities/core! We welcome contributions from the community.

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/ts-collection/core.git`
3. Install dependencies: `bun install`
4. Run tests: `bun run test:run`
5. Build the project: `bun run build`

## Code Style

This project uses Biome for code formatting and linting. Run these commands before committing:

```bash
bun run lint:fix
bun run format:write
```

## Testing

- Write tests for new features in the appropriate test file
- Run the full test suite: `bun run test:run`
- Ensure all tests pass before submitting a PR

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Add tests if applicable
4. Ensure all tests pass and code is formatted
5. Submit a pull request with a clear description of the changes

## Commit Convention

This project follows conventional commits. Use prefixes like:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `test:` for test changes
- `refactor:` for code refactoring

## License

By contributing to this project, you agree that your contributions will be licensed under the ISC License.
