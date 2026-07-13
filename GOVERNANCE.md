# Governance

This document describes how the `stellar-tx-builder` project is governed —
who makes decisions, how decisions are made, and how the project evolves.

---

## Project Ownership

`stellar-tx-builder` is an open-source project created and maintained by
**StellarBuild** (https://stellarbuild.io). StellarBuild retains the final
decision-making authority on the project's direction, releases, and community
standards.

---

## Roles

### Users

Anyone who installs and uses the library. Users are encouraged to:
- Report bugs via the [issue tracker](https://github.com/stellarbuild/stellar-tx-builder/issues)
- Request features via [Feature Requests](https://github.com/stellarbuild/stellar-tx-builder/issues/new?template=feature_request.yml)
- Ask questions in [GitHub Discussions](https://github.com/stellarbuild/stellar-tx-builder/discussions)

### Contributors

Anyone who submits a pull request, files a bug report, improves documentation,
or participates constructively in discussions. Contributions of any size are
valued. See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

### Reviewers

Trusted community members who have made repeated high-quality contributions.
Reviewers may be invited to review pull requests and provide feedback, but do
not have merge authority.

Reviewers are recognised in the project's GitHub team `@stellarbuild/sdk-reviewers`.

### Maintainers

Maintainers have write access to the repository and can merge pull requests,
triage issues, and publish releases. Maintainers are members of
`@stellarbuild/maintainers`.

Current maintainers:
- StellarBuild Engineering Team (`@stellarbuild`)

### Project Lead

The Project Lead is ultimately responsible for the technical direction, release
cadence, and governance of the project. The current Project Lead is reachable
via **hello@stellarbuild.io**.

---

## Decision Making

### Day-to-day decisions

Routine decisions — bug fixes, dependency updates, documentation improvements,
minor features — are made by maintainers via the standard pull request review
process. Any maintainer may merge a PR that has at least **one approving review**
from another maintainer and passes all automated checks.

### Significant changes

Significant changes include:

- Breaking API changes
- New top-level exported symbols
- Changes to the build system or publishing pipeline
- Changes to governance or licensing

These require:
1. An issue or discussion thread open for at least **5 business days**.
2. A consensus among active maintainers (no unresolved objections).
3. Documented rationale in [docs/design-decisions.md](docs/design-decisions.md).

### Disputes

If maintainers cannot reach consensus, the Project Lead has the final vote.

---

## Becoming a Maintainer

Maintainership is earned through sustained, high-quality contributions over time.
To be considered:

1. Make at least **3 meaningful merged pull requests** (code, docs, or CI).
2. Be active in the community for at least **3 months**.
3. Demonstrate understanding of the project's design philosophy.
4. Be nominated by an existing maintainer.

Nominations are discussed privately among current maintainers. Decisions are
communicated to the nominee directly.

Maintainers who are inactive for more than **6 months** may be moved to
emeritus status, retaining recognition but relinquishing active privileges.

---

## Versioning and Releases

This project follows [Semantic Versioning 2.0.0](https://semver.org/):

- **PATCH** (`0.3.x`) — Backwards-compatible bug fixes
- **MINOR** (`0.x.0`) — New backwards-compatible features
- **MAJOR** (`x.0.0`) — Breaking changes

Releases are made by maintainers following the process described in
[docs/publishing.md](docs/publishing.md). Pre-releases (alpha, beta, rc) may be
published for significant upcoming versions.

---

## Amendments

This governance document may be updated by the Project Lead at any time.
Significant changes to governance will be announced in the
[GitHub Discussions](https://github.com/stellarbuild/stellar-tx-builder/discussions)
board and noted in [CHANGELOG.md](CHANGELOG.md).
