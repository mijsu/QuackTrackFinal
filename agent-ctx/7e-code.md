# Task 7e - Fix Playwright Browser Resource Leak

## Summary
Fixed a resource leak in `/src/app/api/export/faculty-schedule/route.ts` where the Playwright Chromium browser process was never closed if an error occurred during page operations.

## Problem
The original code launched a browser, performed page operations (`setContent`, `waitForTimeout`, `pdf`), then called `browser.close()`. If any of those page operations threw an error, execution jumped to the outer `catch` block, skipping `browser.close()` entirely — leaking a Chromium process.

## Fix
Wrapped all browser/page operations in a `try/finally` block with `browser.close()` in the `finally` clause, ensuring cleanup always runs.

### Before
```typescript
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.setContent(html, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const pdfBuffer = await page.pdf({ ... })
await browser.close()
return new NextResponse(pdfBuffer, { ... })
```

### After
```typescript
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const pdfBuffer = await page.pdf({ ... })
  return new NextResponse(pdfBuffer, { ... })
} finally {
  await browser.close()
}
```

## Verification
- `bun run lint` passed with no errors
