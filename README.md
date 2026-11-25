# Password Strength Analyzer

A minimalist, offline-first client-side Password Strength Analyzer and Web Crypto password generator built with HTML, CSS, TypeScript, and Vite.

## Architecture

- `src/domain/`: Pure, deterministic TypeScript analysis, pattern detection, scoring, and Web Crypto password generation with zero DOM, storage, or network dependencies.
- `src/ui/`: Safe DOM components (`createElement`, `textContent`, `replaceChildren` only; zero `innerHTML` or inline `style`).
- `src/styles/`: Design tokens (`tokens.css`) and responsive CSS (`app.css`).
- `tests/domain/`: Unit tests executed directly by Node.js v26 (`node --test`).

## Scripts

```bash
npm run dev        # Start local Vite dev server on 127.0.0.1
npm run typecheck  # Strict TypeScript check (tsc --noEmit)
npm test           # Run domain unit tests (node --test tests/domain/*.test.ts)
npm run build      # Typecheck + production build to dist/
npm run preview    # Preview built dist/ on 127.0.0.1 with security headers
```

> Note: Production ES modules (`<script type="module">`) do not load over `file://`; serve `dist/` via `npm run preview` or a local HTTP server on `127.0.0.1`.

## Security & Privacy Measures

- **Local-only execution:** Enforced at browser level via `<meta http-equiv="Content-Security-Policy" ... connect-src 'none' ...>` in production builds and `Referrer-Policy: no-referrer`.
- **Zero persistence or logging:** No `localStorage`, `sessionStorage`, `cookies`, `IndexedDB`, URL parameter mutations, or `console.*` logging of user input.
- **No secret leakage:** Pattern warnings never echo password substrings, offsets, or masked characters; `aria-live` announces only high-level tiers/status.
- **Unbiased CSPRNG:** Uses `crypto.getRandomValues` with rejection sampling (`Uint32Array`) and Fisher-Yates shuffling; fails closed if Web Crypto is unavailable.
- **Input DoS & Unicode safety:** Caps input at `4096` UTF-16 code units (preserving surrogate pairs) before `Array.from()`, scans patterns linearly up to `1024` chars, and excludes invisible/BiDi/control characters from diversity rewards.

## Honest Limitations

- Offline common-password checks use a bundled static list and cannot query live data-breach databases (such as Have I Been Pwned).
- Local analysis cannot guarantee global uniqueness or detect organization/personal context.
- Clipboard contents, browser extensions, password managers, OS keyboards/IMEs, and JavaScript garbage collection operate outside the web page's trust boundary.
