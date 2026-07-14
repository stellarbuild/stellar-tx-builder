# Security Policy

## Supported Versions

Only the latest published version of `@stellarbuild/stellar-tx-builder`
receives security fixes. All users are encouraged to stay up to date with the
latest release.

| Version | Supported |
|---|---|
| Latest (current) | ✅ Yes |
| Older minor versions | ❌ No — please upgrade |

---

## Scope

`stellar-tx-builder` is a **client-side transaction construction library**. It
does not:

- Store, transmit, or manage private keys on your behalf
- Make network requests except during `.build()` (to load account data from
  Horizon) and `.submit()` (to broadcast the signed transaction)
- Implement cryptographic primitives — all signing is delegated to
  `@stellar/stellar-sdk`

Security concerns in scope include:

- Input validation bypasses that could lead to malformed or unintended
  transactions
- Dependency vulnerabilities with exploitable impact on library consumers
- Information leakage through error messages
- Incorrect handling of asset codes, addresses, or amounts that could cause
  fund loss

Out of scope (report to upstream instead):

- Vulnerabilities in `@stellar/stellar-sdk` →
  [Stellar JS SDK Security](https://github.com/stellar/js-stellar-sdk/security)
- Vulnerabilities in the Stellar network protocol →
  [Stellar Core Security](https://github.com/stellar/stellar-core/blob/master/SECURITY.md)
- Horizon API vulnerabilities →
  [Stellar SDF Security Policy](https://www.stellar.org/bug-bounty-program)

---

## Reporting a Vulnerability

**Please do not open a public GitHub issue to report a security
vulnerability.**

Use GitHub's built-in private reporting feature, which keeps the report
private to the maintainer until a fix is ready:

1. Go to the [Security tab](https://github.com/stellarbuild/stellar-tx-builder/security)
   of this repository.
2. Click **"Report a vulnerability"**.
3. Fill in the report form with as much detail as possible, including:
   - A description of the vulnerability
   - Steps to reproduce (proof-of-concept code if possible)
   - The potential impact and attack surface
   - Any suggested remediation

This is currently the only supported reporting channel.

---

## Response Timeline

This is a single-maintainer project, so these are best-effort targets, not
guaranteed SLAs:

| Stage | Target Time |
|---|---|
| Acknowledgement of report | Within **5 business days** |
| Initial triage and severity assessment | Within **10 business days** |
| Patch development begins | As soon as practical for confirmed Critical/High severity issues |
| Coordinated disclosure | Agreed with reporter on a case-by-case basis |

---

## Disclosure Policy

1. The vulnerability is reported privately via GitHub's reporting tool.
2. The maintainer acknowledges and investigates.
3. A fix is developed and tested.
4. The fix is released in a new patch version.
5. A security advisory is published on GitHub.
6. The reporter is credited (unless they prefer to remain anonymous).

No legal action will be taken against researchers who discover and
responsibly disclose security vulnerabilities in accordance with this policy.

---

## Security Best Practices for Consumers

When using `stellar-tx-builder`:

- **Never log or expose keypairs** or secret seeds in your application code.
- **Always validate recipient addresses** in your application layer before
  passing them to the builder.
- **Use timebounds** (`setTimebounds`) on all transactions to limit the
  validity window.
- **Pin your dependency versions** in production using a lockfile
  (`package-lock.json`).
- **Review Dependabot alerts** and upgrade promptly when security patches are
  released.
- **Prefer testnet** for development and integration testing to avoid
  accidental fund exposure.
