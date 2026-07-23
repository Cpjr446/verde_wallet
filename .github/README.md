# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD automation.

## Workflows

### 1. CI (Continuous Integration)
**File**: `.github/workflows/ci.yml`

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests to `main` branch

**Jobs**:
1. **Lint**: Runs TypeScript type checking and ESLint
2. **Test**: Runs unit tests (if available)
3. **Build**: Creates a production build
4. **Deploy**: Deploys to Vercel (only on main branch)

**Environment Variables Required**:
- `VERCEL_TOKEN`: Vercel API token for deployment
- `VERCEL_ORG_ID`: Vercel organization ID
- `VERCEL_PROJECT_ID`: Vercel project ID

### 2. Release
**File**: `.github/workflows/release.yml`

**Triggers**:
- Push of tags matching `v*` pattern (e.g., `v1.0.0`)

**Jobs**:
1. **Release**: Creates a GitHub release with auto-generated changelog

**Features**:
- Automatically generates changelog from commit messages
- Uses conventional commits format
- Creates GitHub release with formatted changelog

## Setup Instructions

### 1. Configure GitHub Secrets

Go to **Settings > Secrets and variables > Actions** and add:

- `VERCEL_TOKEN`: Your Vercel API token
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID

### 2. Create a Release

To create a release, push a tag:

```bash
# Create a new version tag
git tag v1.0.0

# Push the tag to GitHub
git push origin v1.0.0
```

The release workflow will automatically:
- Build the application
- Generate a changelog
- Create a GitHub release

### 3. Changelog Configuration

The changelog is generated using `git-cliff` with configuration in `.github/cliff.toml`.

Commit messages should follow conventional commits format:
- `feat: add new feature`
- `fix: fix a bug`
- `refactor: refactor code`
- `perf: improve performance`
- `doc: update documentation`
- `test: add tests`
- `chore: maintenance tasks`

## Local Development

### Run CI Locally

```bash
# Install dependencies
npm ci

# Run type check
npm run typecheck

# Run lint
npm run lint

# Build
npm run build
```

### Test Deployment Locally

```bash
# Start development server
npm run dev

# Open http://localhost:9002
```

## Troubleshooting

### Build Failures

If the build fails:
1. Check the error message in the GitHub Actions log
2. Run `npm run build` locally to reproduce
3. Ensure all dependencies are installed (`npm ci`)

### Deployment Failures

If deployment fails:
1. Verify Vercel secrets are configured
2. Check Vercel project settings
3. Ensure the branch is `main`

### Lint Failures

If lint fails:
1. Run `npm run lint` locally
2. Fix any ESLint errors
3. Commit the fixes

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Deployment](https://vercel.com/docs)
- [Conventional Commits](https://www.conventionalcommits.org/)
