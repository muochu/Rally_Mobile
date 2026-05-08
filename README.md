# Rally Mobile

Rally is a tennis scheduling app built with Expo, TypeScript, and Expo Router.

## Prerequisites

- Node.js 20+
- npm 10+
- Xcode (for iOS simulator)

## Setup

1. Install dependencies:
   - `npm install`
2. Create your local env file:
   - `cp .env.example .env`
3. Fill in all required environment variables in `.env`.
4. Start the app:
   - `npm run ios` (or `npm run start`)

## Tooling

- Lint: `npm run lint`
- Format check: `npm run format`
- Tests: `npm run test`
- Pre-commit hook runs `lint-staged` via Husky

## Project Structure

- App routes: `src/app`
- Shared libraries: `src/lib`
- Theme tokens: `src/theme`
- Tests: `tests/unit`, `tests/e2e`
