# Security Policy

## Supported Versions

Only the latest published version of `@stellarbuild/stellar-tx-builder` receives
security fixes. We encourage all users to stay up to date with the latest release.

| Version | Supported |
|---|---|
| Latest (current) | ✅ Yes |
| Older minor versions | ❌ No — please upgrade |

---

## Scope

`stellar-tx-builder` is a **client-side transaction construction library**. It does not:

- Store, transmit, or manage private keys on your behalf
- Make network requests except during `.build()` (to load account data from Horizon) and `.submit()` (to broadcast the signed transaction)
- Implement cryptographic primitives — all signing is delegated to `@stellar/stellar-sdk`

Security concerns in scope include:

- Input validation bypasses that could lead to malformed or unintended transactions
- Dependency vulnerabilities with exploitable impact on library consumers
- Information leakage through error messages
- Incorrect handling of asset codes, addresses, or amounts that could cause fund loss

Out of scope (report to upstream instead):

- Vulnerabilities in `@stellar/stellar-sdk` → [Stellar JS SDK Security](https://github.com/stellar/js-stellar-sdk/security)
- Vulnerabilities in the Stellar network protocol → [Stellar Core Security](https://github.com/stellar/stellar-core/blob/master/SECURITY.md)
- Horizon API vulnerabilities → [Stellar SDF Security Policy](https://www.stellar.org/bug-bounty-program)

---

## Reporting a Vulnerability

**Please do not open a public GitHub issue to report a security vulnerability.**

We take all security reports seriously. If you discover a potential security
issue in this library, please disclose it responsibly using one of the following
methods:

### Option 1: GitHub Private Vulnerability Reporting (Preferred)

Use GitHub's built-in private reporting feature:

1. Go to the [Security tab](https://github.com/stellarbuild/stellar-tx-builder/security) of this repository.
2. Click **"Report a vulnerability"**.
3. Fill in the report form with as much detail as possible.

This channel is end-to-end private and preferred for all security disclosures.

### Option 2: Email

Send an encrypted or plaintext report to:

**hello@stellarbuild.io**

Subject line: `[SECURITY] stellar-tx-builder — <brief description>`

Include in your report:

- A description of the vulnerability
- Steps to reproduce (proof-of-concept code if possible)
- The potential impact and attack surface
- Any suggested remediation

---

## Response Timeline

| Stage | Target Time |
|---|---|
| Acknowledgement of report | Within **48 hours** |
| Initial triage and severity assessment | Within **5 business days** |
| Patch development begins | Within **10 business days** for Critical/High severity |
| Coordinated disclosure | Agreed with reporter, typically **90 days** maximum |

---

## Disclosure Policy

We follow a **coordinated disclosure** model:

1. The vulnerability is reported privately.
2. We acknowledge and investigate.
3. A fix is developed and tested.
4. The fix is released in a new patch version.
5. A security advisory is published on GitHub.
6. The reporter is credited (unless they prefer to remain anonymous).

We will not take legal action against researchers who discover and responsibly
disclose security vulnerabilities in accordance with this policy.

---

## Security Best Practices for Consumers

When using `stellar-tx-builder`:

- **Never log or expose keypairs** or secret seeds in your application code.
- **Always validate recipient addresses** in your application layer before passing them to the builder.
- **Use timebounds** (`setTimebounds`) on all transactions to limit the validity window.
- **Pin your dependency versions** in production using a lockfile (`package-lock.json`).
- **Review Dependabot alerts** and upgrade promptly when security patches are released.
- **Prefer testnet** for development and integration testing to avoid accidental fund exposure.
