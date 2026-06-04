# Contributing to stellar-tx-builder

This project participates in the **[Stellar Wave Program](https://www.drips.network/wave/stellar)**. Contributions to Wave-tagged issues earn on-chain rewards when merged.

## Local Setup

```bash
git clone https://github.com/stellarbuild/stellar-tx-builder
cd stellar-tx-builder
npm install
npm test
```

## Development Guidelines

- **Strict TypeScript** — `"strict": true`, no implicit `any`
- **Fluent API contract** — every builder method must return `this` to maintain chainability
- **Validation first** — validate all user inputs (addresses, amounts, assets) before constructing operations; throw descriptive `Error` messages
- **Unit test every operation** — each `add*` method needs tests covering happy path, invalid inputs, and edge cases
- **No side effects in `add*` methods** — only `.build()` and `.submit()` should do async work

## Testing Against Testnet

```bash
cp .env.example .env
# Add your TESTNET_SECRET_KEY
npm run test:integration
```

## Commit Style

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add addPathPayment operation
fix: validate negative amounts in addPayment
test: add timebounds relative parsing tests
docs: document invokeContract params
```

## Wave Issues

Look for [`Stellar Wave`](https://github.com/stellarbuild/stellar-tx-builder/issues?q=label%3A%22Stellar+Wave%22) labelled issues. Each one includes full acceptance criteria and a complexity rating (100 / 150 / 200 points).
