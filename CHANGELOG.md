# Changelog

All notable changes to this project are recorded here.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project follows [Semantic Versioning](https://semver.org/).

## [0.3.0] - 2026-09-26

### Added

- `docs/adr/0004-node-builtin-test-runner.md` — test the game rules with `node:test`, adding no test-framework dependency.

## [0.2.0] - 2026-09-26

### Added

- `docs/adr/0001-react-for-game-ui.md` — React for menus and HUD, plain canvas for the 60fps game loop.
- `docs/adr/0002-static-web-no-backend.md` — static local files, no server, no accounts, no network at runtime.
- `docs/adr/0003-original-art-not-original-assets.md` — original SVG art; no original sprites, names or audio.

### Changed

- `AGENTS.md` — corrected the repo inventory now that `docs/adr/` exists.

## [0.1.0] - 2026-09-26

### Added

- `AGENTS.md` — instructions for agent sessions: what the repo is, how the vendored skills are wired, and how to work here.
- `VERSION` — the project version number.
- `CHANGELOG.md` — this file.
- Git repository initialised (`.gitignore` excludes the generated `graphify-out/` folder).
- Versioning rules: bump the version on every change, update this changelog, and commit — all three, every time.
