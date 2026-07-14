# Governance

This document describes how the `stellar-tx-builder` project is currently
governed, and how that's expected to change as the project grows.

---

## Current state

`stellar-tx-builder` is maintained by a single maintainer
([@T-kesh](https://github.com/T-kesh)). There is currently no formal
maintainer team, reviewer group, or nomination process — decisions on
direction, releases, and PR merges are made directly by the maintainer.

This document will be expanded with formal roles, a review process, and a
maintainer-nomination path once the project has active external contributors.
Until then, treat this as a placeholder that's honest about where the project
actually is rather than a description of a process that doesn't exist yet.

---

## How to get involved

- **Report bugs or request features:** open a
  [GitHub issue](https://github.com/stellarbuild/stellar-tx-builder/issues).
- **Contribute code or docs:** see [CONTRIBUTING.md](CONTRIBUTING.md) and open
  a pull request. All PRs are reviewed by the maintainer before merge.
- **Ask questions:** open a
  [discussion](https://github.com/stellarbuild/stellar-tx-builder/discussions)
  or an issue.

Contributors who submit sustained, high-quality PRs may be invited to take on
a more formal role as the project matures — but there's no fixed process for
that yet, and this document will be updated when there is.

---

## Versioning and releases

This project follows [Semantic Versioning 2.0.0](https://semver.org/):

- **PATCH** (`0.3.x`) — Backwards-compatible bug fixes
- **MINOR** (`0.x.0`) — New backwards-compatible features
- **MAJOR** (`x.0.0`) — Breaking changes

Releases are currently cut by the maintainer. See
[docs/publishing.md](docs/publishing.md) for the process.

---

## Amendments

This document may be updated at any time as the project and its contributor
base grow. Significant changes will be noted in [CHANGELOG.md](CHANGELOG.md).
