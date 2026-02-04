# Contributing to GuardQuote

## Branch Protection

The `master` branch is protected. All changes must go through pull requests.

## Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow existing code style
   - Add tests if applicable
   - Update documentation

3. **Commit with clear messages**
   ```bash
   git commit -m "feat: Add new feature"
   git commit -m "fix: Fix bug in component"
   git commit -m "docs: Update README"
   ```

4. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a Pull Request on GitHub.

5. **Wait for review**
   - CI must pass (lint, build, tests)
   - Code owner (John) must approve
   - Address any feedback

## What NOT to do

- ❌ Push directly to `master`
- ❌ Force push to any branch
- ❌ Change CI/CD configuration without discussion
- ❌ Modify auth/security code without approval
- ❌ Delete or rename core files

## Architecture Decisions

This project uses:
- **Cloudflare** for CDN, tunnels, and Zero Trust Access
- **Pi cluster** for self-hosted backend
- **PostgreSQL** for database
- **Formula-based ML** for pricing (not external ML services)

If you think we should change any of these, open an issue first to discuss.

## Getting Help

- Questions? Ask John (john@vandine.us)
- Found a bug? Open an issue
- Feature idea? Open an issue first

## Code Style

- TypeScript strict mode
- React functional components
- TailwindCSS for styling
- Lucide icons
