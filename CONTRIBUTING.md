# Contributing to refracted

Thank you for taking the time to contribute. This is a small, focused project —
contributions that keep it that way are most welcome.

---

## Project scope

refracted does one thing: parse role-aware markdown documents deterministically.
Pull requests that expand scope significantly (e.g. adding an LLM step, a database,
or a new document format) are unlikely to be merged. When in doubt, open an issue first.

---

## Getting started

```bash
git clone https://github.com/JoseEstevez520/refracted.git
cd refracted
npm install
npm run build
npm test
```

All four commands should succeed before you start making changes.

---

## Making changes

1. **Fork** the repo and create a branch from `main`
2. **Write tests** for any new parsing logic (`tests/parser.test.ts`)
3. **Run `npm test`** — all tests must pass
4. **Run `npm run build`** — no TypeScript errors
5. Open a **pull request** with a clear description of what changed and why

---

## Code style

- TypeScript strict mode is on — no `any`, no non-null assertions without justification
- Functions are pure where possible (the parser has no side effects)
- Comments explain *why*, not *what*
- Keep functions short; extract helpers rather than nesting logic deeply

---

## Adding examples

Example documents in `examples/` are first-class documentation. If you add one:

- Use realistic content, not `foo`/`bar` placeholders
- Include at least two distinct roles with meaningfully different content
- Add at least one `[rel:X]: # "..."` relation

---

## Reporting bugs

Open a GitHub issue with:

- The markdown input that produced unexpected output
- The tool call and parameters
- What you expected vs. what you got

A minimal reproduction is more useful than a detailed description.

---

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE) that covers this project.
