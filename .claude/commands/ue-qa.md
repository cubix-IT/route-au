# UE QA — End-to-End Test Suite

Run Playwright tests against the local dev server to verify golden paths before deploying.

## Quick run (all tests)
```bash
npm run test:e2e
```

## Run specific test file
```bash
npx playwright test tests/e2e/landing.spec.ts
npx playwright test tests/e2e/wizard.spec.ts
npx playwright test tests/e2e/planner.spec.ts
```

## Run with headed browser (see what's happening)
```bash
npx playwright test --headed
```

## Interactive UI mode
```bash
npm run test:e2e:ui
```

## Test coverage

### landing.spec.ts — Landing page
| Test | What it checks |
|---|---|
| loads and shows hero | Page title + "Surprise me →" button visible |
| shows destination cards | Supabase cards load within 10s |
| from-location required validation | Clicking Surprise me without location shows error |
| destination search dropdown | Typing in destination input shows Photon suggestions |

### wizard.spec.ts — Wizard flow
| Test | What it checks |
|---|---|
| wizard opens from surprise me | After filling from-location, wizard opens |
| wizard has date step | First wizard step shows date/weekend picker |
| wizard can be dismissed | Close button removes wizard overlay |

### planner.spec.ts — Results & static pages
| Test | What it checks |
|---|---|
| tabs render after destination card click | ExperiencePanel or wizard opens after card → plan |
| fuel tab visible when results shown | Fuel tab exists in results |
| privacy page loads | /privacy renders privacy text |
| status endpoint returns 200 | App root returns 200 |

## After a failing test

1. Check screenshot in `test-results/` — Playwright saves on failure
2. Look at the selector — class names on UE components change; update test selectors to match
3. If the test was checking something that was intentionally redesigned, update the assertion

## Selectors cheat sheet (UE-specific)
```
.wizard-overlay       — wizard modal overlay
.wizard-card          — wizard card container
.mu-card              — Material You card
.mu-btn-primary       — primary action button
.mu-dropdown-row      — location/destination suggestion row
.mu-underline-tab     — tab button (Explore, Food, Stay, etc.)
```

## Pre-deploy QA checklist (manual)
Run these if automated tests pass:

- [ ] Landing loads without console errors
- [ ] "Surprise me →" with Melbourne → wizard opens on step 1 (dates)
- [ ] Complete wizard → generating screen → results appear
- [ ] Explore tab: activities/nature show with category chips
- [ ] Food & Drinks tab: shows venues with category filter
- [ ] Stay tab: accommodation cards render
- [ ] Fuel tab: fuel stops appear
- [ ] Mobile (375px): map on top, panel slides up
- [ ] VicEmergency hazard icon appears on map (if active alerts)
- [ ] No raw coordinate URLs in Maps links (check network tab)
