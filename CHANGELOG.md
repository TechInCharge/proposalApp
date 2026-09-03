# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-09-04

### Added

- Project scaffold: Next.js (App Router) + TypeScript + Tailwind
- Prisma schema for users, products, section templates, customers, brand
  profiles, proposals, proposal products/sections, and BoQ items
- Auth.js (NextAuth v5) credentials login with `ADMIN` / `AUTHOR` roles
- Route protection via `src/proxy.ts` and `requireUser` / `requireRole` helpers
- `{{token}}` placeholder resolver for section bodies
- Seed script (admin user, sample product with sections, default brand profile)
- Dashboard shell, login page, `/api/health`
- docker-compose Postgres and GitHub Actions CI
