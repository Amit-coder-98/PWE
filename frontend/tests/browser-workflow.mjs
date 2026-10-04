/* Local production-build regression check. All APIs use synthetic fixtures;
 * no production database, credentials, customer records or storage are used.
 * Start Vite preview on 127.0.0.1:4187. Run this script with Playwright installed,
 * or set PWE_PLAYWRIGHT_MODULE to an existing playwright-core/index.mjs path.
 */
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { stageKeys } from '../src/types.ts'
import { dependencies, productionStages, stageInfo } from '../src/lib/workflow.ts'

const { chromium } = await import(process.env.PWE_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PWE_PLAYWRIGHT_MODULE).href : 'playwright')
const base = 'http://127.0.0.1:4187'
const customer = { id: 'customer', companyName: 'Test Manufacturing and Industrial Packaging Company', contactPerson: 'Test Customer Contact', phone: '9876543210', address: 'Test address', active: true, createdAt: '2026-10-02T10:00:00Z', updatedAt: '2026-10-02T10:00:00Z' }
const staff = [
  { id: 'admin', name: 'Test Administrator', role: 'admin' },
  { id: 'm1', name: 'Ganesh Kalekar', role: 'marketing' },
  ...[2, 3, 4, 5].map(index => ({ id: `m${index}`, name: `Marketing Person ${index}`, role: 'marketing' })),
].map(person => ({ ...person, email: `${person.id}@test.example.com`, department: person.role === 'admin' ? 'Administration' : 'Marketing', initials: 'TS', active: true, mustChangePassword: false }))
const proof = { id: 'proof', assetType: 'payment_proof', fileName: 'advance-receipt.png', status: 'available', uploadedByName: 'Ganesh Kalekar', createdAt: '2026-10-04T10:00:00Z' }
const previewImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6FoAAAAAASUVORK5CYII='

function fixture(stage, status = 'active') {
  const stages = Object.fromEntries(stageKeys.map((key, index) => [key, { status: index < stageKeys.indexOf(stage) ? 'completed' : 'waiting' }]))
  stages[stage].status = 'ready'
  if (status === 'completed') {
    stages.delivery.status = 'completed'
    stages.return.status = 'ready' // Legacy persisted bug.
  }
  return { id: 'order', createdBy: 'm1', createdByName: 'Ganesh Kalekar', createdByRole: 'marketing', paymentProofs: [proof], orderNumber: 'PWE-000006', customerId: customer.id, customer: customer.companyName, contactPerson: customer.contactPerson, phone: customer.phone, product: 'Custom printed woven packaging bag', quantity: 1200, amount: 8940, ratePerBag: 7.45, advancePaid: 0, remainingAmount: 8940, expectedDelivery: '2026-10-10', orderDate: '2026-10-02', priority: 'high', currentStage: status === 'completed' ? 'return' : 'printing', status, version: 3, stages, createdAt: '2026-10-02T10:00:00Z', updatedAt: '2026-10-02T10:00:00Z', closedAt: status === 'completed' ? '2026-10-02T10:00:00Z' : undefined,
    activity: [{ id: 'event', actorName: 'Test Printing User', actorRole: 'printing_operator', stage: 'printing', message: 'Completed printing.', at: '2026-10-02T10:00:00Z', details: {} }],
    designAssets: [{ id: 'artwork', assetType: 'design', fileName: 'customer-approved-design.jpg', version: 1, status: 'approved', uploadedByName: 'Test Marketing', createdAt: '2026-10-02T10:00:00Z', contentType: 'image/jpeg', expectedSize: 100 }] }
}

async function checkLayout(page, label) {
  const overflow = await page.evaluate(() => [...document.querySelectorAll('main#main-content *')].filter(el => {
    const rect = el.getBoundingClientRect()
    if (!rect.width || !rect.height) return false
    if (el.closest('.sr-only, .filter-scroll')) return false
    return rect.right > innerWidth + 1 || rect.left < -1
  }).map(el => ({ tag: el.tagName, text: el.textContent.slice(0, 65) })).slice(0, 8))
  assert.deepEqual(overflow, [], `${label}: visible content outside viewport`)
}

const browser = await chromium.launch({ headless: true, ...(process.env.PWE_BROWSER_EXECUTABLE ? { executablePath: process.env.PWE_BROWSER_EXECUTABLE } : {}) })
let checks = 0
try {
  for (const width of [320, 375, 768, 1024, 1440]) {
    for (const [role, stage] of [['admin', 'material'], ['cutting_master', 'cutting'], ['designer', 'design'], ['transport_manager', 'plate'], ['printing_operator', 'printing'], ['manager', 'stitching'], ['accountant', 'billing'], ['marketing', 'delivery']]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'America/Los_Angeles' })
      const page = await context.newPage()
      let item = fixture(stage)
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.route('**/*', async route => {
        const url = new URL(route.request().url())
        if (!url.pathname.includes('/api/')) return url.origin === base ? route.continue() : route.abort()
        let value
        if (url.pathname.endsWith('/auth/me')) value = { id: role === 'admin' ? 'admin' : 'staff', name: 'Test Staff', email: 'test@example.com', role, department: 'Test', initials: 'TS', active: true, mustChangePassword: false }
        else if (url.pathname.endsWith('/orders/order')) value = item
        else if (url.pathname.endsWith('/orders')) value = role === 'admin' ? [item, ...['m1', 'm1', 'm2', 'm2', 'admin', 'admin', 'admin'].map((id, index) => ({ ...fixture('material'), id: `extra-${index}`, orderNumber: `PWE-00001${index}`, createdBy: id, createdByName: staff.find(person => person.id === id).name, createdByRole: staff.find(person => person.id === id).role }))] : [item]
        else if (url.pathname.endsWith('/customers')) value = [customer]
        else if (url.pathname.endsWith('/users')) value = staff
        else if (url.pathname.endsWith('/design-assets/proof/view-url')) value = { url: previewImage, expiresIn: 600 }
        else if (url.pathname.endsWith('/health')) value = { status: 'ok', database: 'ok', storage: 'ok' }
        else if (url.pathname.includes('/orders/order/stages/')) {
          const completed = url.pathname.split('/').at(-1)
          assert.equal(route.request().method(), 'POST')
          assert.equal(JSON.parse(route.request().postData()).action, 'complete')
          item.stages[completed].status = 'completed'
          for (const candidate of productionStages) {
            if (item.stages[candidate].status === 'waiting' && (dependencies[candidate] ?? []).every(key => item.stages[key].status === 'completed')) item.stages[candidate].status = 'ready'
          }
          item.version += 1
          value = item
        }
        else return route.fulfill({ status: 404, json: { message: 'Not part of this synthetic UI test' } })
        return route.fulfill({ status: 200, json: value })
      })
      await page.goto(`${base}/orders/order?stage=${role === 'admin' ? stage : 'printing'}`)
      const task = page.locator('aside').filter({ has: page.getByRole('heading', { name: stageInfo[stage].label, exact: true }) })
      await task.waitFor({ state: 'visible' })
      assert.equal(await page.getByText('View only:', { exact: false }).count(), role === 'admin' ? 1 : 0, `${role} should open ${stage}`)
      await checkLayout(page, `${width}px ${role} task`)
      await task.getByRole('button').filter({ has: page.locator('svg.lucide-x') }).click()
      await page.getByText(role === 'admin' ? 'Current responsibility' : 'Your current task', { exact: true }).waitFor({ state: 'visible' })
      assert.ok((await page.locator('time').allTextContents()).includes('2 Oct 2026 · 3:30:00 pm IST'))
      await checkLayout(page, `${width}px ${role} order detail`)
      const journey = page.getByLabel('Production journey from order booking to delivery', { exact: true })
      assert.equal(await journey.locator('li').count(), 13)
      assert.equal(await journey.getByText('Order booked', { exact: true }).count(), 1)
      assert.equal(await journey.getByText('Delivery', { exact: true }).count(), 1)
      assert.equal(await journey.getByText('Return', { exact: true }).count(), 0)
      assert.equal(await journey.locator('li > span.rounded-full.bg-emerald-500').count(), stageKeys.indexOf(stage))
      checks += 1
      if (['admin', 'marketing', 'accountant'].includes(role)) {
        const panel = page.getByRole('region', { name: 'Payment proofs', exact: true })
        await panel.getByRole('button', { name: 'View payment proof advance-receipt.png', exact: true }).click()
        const image = panel.getByAltText('Payment proof: advance-receipt.png', { exact: true })
        await image.waitFor({ state: 'visible' })
        await page.waitForFunction(() => { const img = document.querySelector('img[alt="Payment proof: advance-receipt.png"]'); return img?.complete && img.naturalWidth > 0 })
        await checkLayout(page, `${width}px ${role} payment proof preview`)
        if (role === 'admin' && process.env.PWE_BROWSER_SCREENSHOT_DIR) {
          await mkdir(process.env.PWE_BROWSER_SCREENSHOT_DIR, { recursive: true })
          await page.screenshot({ path: join(process.env.PWE_BROWSER_SCREENSHOT_DIR, `admin-proof-${width}.png`), fullPage: true })
        }
        await panel.getByRole('button', { name: 'Close payment proof preview', exact: true }).click()
        assert.equal(await image.count(), 0)
      } else assert.equal(await page.getByRole('region', { name: 'Payment proofs', exact: true }).count(), 0)
      checks += 1
      if (role === 'manager' && process.env.PWE_BROWSER_SCREENSHOT_DIR) {
        await mkdir(process.env.PWE_BROWSER_SCREENSHOT_DIR, { recursive: true })
        await page.screenshot({ path: join(process.env.PWE_BROWSER_SCREENSHOT_DIR, `manager-${width}.png`), fullPage: true })
      }
      if (role === 'manager') {
        // Same page and stale URL: completion must focus Packing, not reopen
        // the previous Printing drawer or leave the manager on Stitching.
        await page.getByRole('button', { name: 'Open next action', exact: true }).click()
        await task.getByRole('button', { name: 'Yes', exact: true }).click()
        await task.waitFor({ state: 'hidden' })
        await page.getByText('Packing is pending with the responsible team.', { exact: true }).waitFor({ state: 'visible' })
        await page.getByRole('button', { name: 'Open next action', exact: true }).click()
        await page.locator('aside').filter({ has: page.getByRole('heading', { name: 'Packing', exact: true }) }).waitFor({ state: 'visible' })
        checks += 1
      }
      for (const path of ['/', '/orders', '/queue']) {
        await page.goto(base + path)
        await page.locator('main#main-content').waitFor({ state: 'visible' })
        if (path === '/' && role === 'admin') {
          const bookings = page.getByRole('region', { name: 'Orders booked by person', exact: true })
          assert.equal(await bookings.getByRole('link').count(), 6)
          assert.match(await bookings.getByRole('link').filter({ hasText: 'Marketing (Ganesh Kalekar)' }).innerText(), /3 orders booked/)
          assert.match(await bookings.getByRole('link').filter({ hasText: 'Marketing (Marketing Person 2)' }).innerText(), /2 orders booked/)
          assert.match(await bookings.getByRole('link').filter({ hasText: 'Marketing (Marketing Person 5)' }).innerText(), /0 orders booked/)
          if (process.env.PWE_BROWSER_SCREENSHOT_DIR) await page.screenshot({ path: join(process.env.PWE_BROWSER_SCREENSHOT_DIR, `admin-bookings-${width}.png`), fullPage: true })
          await bookings.getByRole('link').filter({ hasText: 'Marketing (Ganesh Kalekar)' }).click()
          await page.getByText('Showing bookings by Ganesh Kalekar (3).', { exact: true }).waitFor({ state: 'visible' })
          assert.equal(await page.getByRole('progressbar', { name: 'Completed production steps', exact: true }).count(), 3)
          await checkLayout(page, `${width}px Admin person filter`)
          checks += 1
        }
        await checkLayout(page, `${width}px ${role} ${path}`)
        checks += 1
      }
      if (role === 'marketing' || role === 'admin') {
        if (role === 'admin') {
          await page.goto(`${base}/team`)
          await page.getByRole('button', { name: 'Add staff member', exact: true }).click()
          await page.getByLabel('Full name *', { exact: true }).fill('Ganesh Kalekar')
          await page.getByLabel('Title / role', { exact: true }).selectOption('marketing')
          await page.getByText('Title: Marketing · Full name: entered above', { exact: true }).waitFor({ state: 'visible' })
          await checkLayout(page, `${width}px Admin Team name/role dialog`)
          if (process.env.PWE_BROWSER_SCREENSHOT_DIR) await page.screenshot({ path: join(process.env.PWE_BROWSER_SCREENSHOT_DIR, `admin-team-${width}.png`), fullPage: true })
          await page.getByRole('button', { name: 'Cancel', exact: true }).click()
          checks += 1
        }
        for (const path of ['/orders/new', '/customers', '/customers/customer']) {
          await page.goto(base + path)
          await page.locator('main#main-content').waitFor({ state: 'visible' })
          await checkLayout(page, `${width}px ${role} ${path}`)
          checks += 1
        }
        item = fixture('delivery', 'completed')
        await page.goto(`${base}/orders/order?stage=return`)
        await page.getByText('Delivered / Completed', { exact: true }).waitFor({ state: 'visible' })
        assert.equal(await page.getByRole('button', { name: 'Open next action' }).count(), 0)
        assert.equal(await page.getByText('View only:', { exact: false }).count(), 0)
        await checkLayout(page, `${width}px completed order`)
        checks += 1
      }
      assert.deepEqual(errors, [])
      checks += 2
      await context.close()
    }
  }
  console.log(`PASS: ${checks} local browser page/layout checks at 320, 375, 768, 1024 and 1440px; eight roles; payment proof previews, per-person bookings, Team name/role and progress rail; no production API access.`)
} finally {
  await browser.close()
}
