/* Test the production build on 127.0.0.1:4187 using synthetic APIs only.
 * Uses the same PWE_PLAYWRIGHT_MODULE / PWE_BROWSER_EXECUTABLE overrides
 * as browser-workflow.mjs. No requests reach production services.
 */
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { stageKeys } from '../src/types.ts'
import { bagTypes } from '../src/lib/bagTypes.ts'

const { chromium } = await import(process.env.PWE_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PWE_PLAYWRIGHT_MODULE).href : 'playwright')
const base = 'http://127.0.0.1:4187'
const customer = { id: 'customer', companyName: 'Sample Packaging Company', contactPerson: 'Sample Contact', phone: '9876543210', address: 'Sample address', active: true }
const fixture = (id, bagType) => ({ id, bagType, product: bagType, orderNumber: `PWE-${id}`, customerId: 'customer', customer: customer.companyName, contactPerson: customer.contactPerson, phone: customer.phone, bagSize: '12 × 16 inch', printingColor: 'Blue', quantity: 1200, ratePerBag: 7.45, amount: 8940, advancePaid: 0, remainingAmount: 8940, expectedDelivery: '2026-10-10', orderDate: '2026-10-04', priority: 'normal', status: 'active', currentStage: 'material', version: 1, createdAt: '2026-10-04T10:00:00Z', updatedAt: '2026-10-04T10:00:00Z',
  stages: Object.fromEntries(stageKeys.map(key => [key, { status: key === 'order' ? 'completed' : ['material', 'design'].includes(key) ? 'ready' : 'waiting' }])), activity: [], designAssets: [], paymentProofs: [] })

async function checkLayout(page, label) {
  const overflow = await page.evaluate(() => [...document.querySelectorAll('main#main-content *')].filter(el => {
    const rect = el.getBoundingClientRect()
    return rect.width && rect.height && !el.closest('.sr-only, .filter-scroll') && (rect.right > innerWidth + 1 || rect.left < -1)
  }).map(el => ({ tag: el.tagName, text: el.textContent.slice(0, 50) })).slice(0, 5))
  assert.deepEqual(overflow, [], label)
}

const browser = await chromium.launch({ headless: true, ...(process.env.PWE_BROWSER_EXECUTABLE ? { executablePath: process.env.PWE_BROWSER_EXECUTABLE } : {}) })
let checks = 0
try {
  for (const width of [320, 375, 768, 1024, 1440]) {
    for (const role of ['admin', 'marketing']) {
      const context = await browser.newContext({ viewport: { width, height: 900 } })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      const orders = ['Paper bag', 'Roto bag', 'Paper bag', 'Paper bag', 'Roto bag', 'D cut 65gsm', 'PP woven bag'].map((type, index) => fixture(index === 6 ? 'legacy' : `sample-${index}`, type))
      let lastBody
      await page.route('**/*', async route => {
        const url = new URL(route.request().url())
        if (!url.pathname.includes('/api/')) return url.origin === base ? route.continue() : route.abort()
        let value
        if (url.pathname.endsWith('/auth/me')) value = { id: 'staff', name: 'Sample Staff', role, email: 'sample@example.com', department: 'Sample', initials: 'SS', active: true, mustChangePassword: false }
        else if (url.pathname.endsWith('/customers')) value = [customer]
        else if (url.pathname.endsWith('/users')) value = []
        else if (url.pathname.endsWith('/orders')) {
          if (route.request().method() === 'POST') {
            lastBody = JSON.parse(route.request().postData())
            value = { ...fixture('created', lastBody.bagType), ...lastBody }
            orders.push(value)
          } else value = orders
        } else if (url.pathname.includes('/orders/')) {
          const id = url.pathname.split('/').at(-1)
          value = orders.find(order => order.id === id)
          if (value && route.request().method() === 'PATCH') {
            lastBody = JSON.parse(route.request().postData())
            Object.assign(value, lastBody, { version: value.version + 1 })
            value.activity = [{ id: 'edit-event', message: 'Updated bag details.', actorName: 'Sample Staff', actorRole: role, at: '2026-10-04T11:00:00Z', details: {} }]
            // Match the real edit endpoint's compact response model. The UI
            // must fetch fresh order detail to retain images and activity.
            value = { ...value }
            delete value.activity
            delete value.designAssets
            delete value.paymentProofs
          }
        } else if (url.pathname.endsWith('/health')) value = { status: 'ok', database: 'ok', storage: 'ok' }
        if (!value) return route.fulfill({ status: 404, json: { message: 'Not part of this sample test' } })
        await route.fulfill({ status: 200, json: value })
      })
      await page.goto(`${base}/orders/new`)
      const bag = page.getByRole('combobox', { name: 'Type of bag *', exact: true })
      await bag.click()
      const list = page.getByRole('listbox', { name: 'Bag types', exact: true })
      assert.deepEqual(await list.getByRole('option').allTextContents(), ['Paper bag', 'Roto bag', 'D cut 65gsm', 'Stiching non woven', 'Metalic Bopp'])
      await page.getByRole('button', { name: 'Show all bag types', exact: true }).click()
      assert.equal(await list.getByRole('option').count(), 9)
      await checkLayout(page, `${width}px ${role} open bag catalogue`)
      checks += 1
      for (const type of bagTypes) {
        await bag.fill(type)
        await list.getByRole('option', { name: type, exact: true }).click()
        assert.equal(await page.locator('input[name="bagType"]').inputValue(), type)
        assert.equal(await bag.getAttribute('aria-expanded'), 'false')
        checks += 1
      }
      for (const query of ['s', 'stich', 'stiching', 'stiching non', 'non woven']) {
        await bag.fill(query)
        assert.equal(await list.getByRole('option', { name: 'Stiching non woven', exact: true }).count(), 1)
        checks += 1
      }
      await bag.fill('not in catalogue')
      assert.equal(await bag.evaluate(input => input.checkValidity()), false)
      await page.getByRole('button', { name: 'Use Other', exact: true }).click()
      assert.equal(await page.locator('input[name="bagType"]').inputValue(), 'Other')
      await bag.fill('d cut')
      await bag.press('ArrowDown')
      await bag.press('Enter')
      assert.equal(await page.locator('input[name="bagType"]').inputValue(), 'D cut 65gsm')
      checks += 1
      await page.getByRole('combobox', { name: 'Search customer', exact: false }).fill('Sample Packaging')
      await page.getByRole('option').filter({ hasText: customer.companyName }).click()
      await page.getByLabel('GSM (Grams per Square Meter)', { exact: true }).fill('65')
      await page.getByLabel('Color of bag', { exact: true }).fill('White')
      await page.getByLabel('Bag size *', { exact: true }).fill('12 × 16 inch')
      await page.getByLabel('Colour of printing *', { exact: true }).fill('Blue')
      await page.getByLabel('Rate per bag (₹) *', { exact: true }).fill('7.45')
      await page.getByLabel('Number of bags *', { exact: true }).fill('1200')
      await page.getByLabel('Delivery date *', { exact: true }).fill('2026-10-10')
      await checkLayout(page, `${width}px ${role} filled order form`)
      if (process.env.PWE_BROWSER_SCREENSHOT_DIR && role === 'admin') {
        await mkdir(process.env.PWE_BROWSER_SCREENSHOT_DIR, { recursive: true })
        await page.getByRole('heading', { name: 'Bag details', exact: true }).scrollIntoViewIfNeeded()
        await bag.click()
        await page.screenshot({ path: join(process.env.PWE_BROWSER_SCREENSHOT_DIR, `bag-form-${width}.png`), fullPage: false })
        await bag.press('Escape')
      }
      await page.getByRole('button', { name: 'Confirm order', exact: true }).click()
      await page.waitForURL(`${base}/orders/created`)
      assert.deepEqual([lastBody.bagType, lastBody.gsm, lastBody.bagColor, lastBody.printingColor], ['D cut 65gsm', 65, 'White', 'Blue'])
      await page.getByText('65 g/m²', { exact: true }).waitFor({ state: 'visible' })
      await checkLayout(page, `${width}px ${role} saved bag details`)
      checks += 1
      await page.getByRole('button', { name: 'Edit order details', exact: true }).click()
      const editBag = page.getByRole('combobox', { name: 'Type of bag *', exact: true })
      assert.equal(await editBag.inputValue(), 'D cut 65gsm')
      assert.equal(await page.getByLabel('Color of bag', { exact: true }).inputValue(), 'White')
      await editBag.press('ArrowDown')
      await editBag.press('Enter')
      assert.equal(await editBag.inputValue(), 'Paper bag')
      checks += 1
      await editBag.fill('cotton')
      await page.getByRole('option', { name: 'Cottan bag', exact: true }).click()
      await page.getByLabel('GSM (Grams per Square Meter)', { exact: true }).fill('80.5')
      await page.getByLabel('Color of bag', { exact: true }).fill('Natural')
      await page.getByRole('button', { name: 'Save changes', exact: true }).click()
      await page.getByText('80.5 g/m²', { exact: true }).waitFor({ state: 'visible' })
      await page.getByText('Updated bag details.', { exact: true }).waitFor({ state: 'visible' })
      assert.deepEqual([lastBody.bagType, lastBody.gsm, lastBody.bagColor, lastBody.printingColor], ['Cottan bag', 80.5, 'Natural', 'Blue'])
      await checkLayout(page, `${width}px ${role} edited bag details`)
      checks += 1
      await page.goto(`${base}/orders/legacy`)
      await page.getByRole('button', { name: 'Edit order details', exact: true }).click()
      assert.equal(await editBag.inputValue(), 'PP woven bag')
      await editBag.fill('PP woven')
      await page.getByRole('option').filter({ hasText: 'Existing order type' }).click()
      await checkLayout(page, `${width}px ${role} legacy order edit`)
      await page.getByRole('button', { name: 'Cancel', exact: true }).click()
      assert.deepEqual(errors, [])
      checks += 1
      await context.close()
    }
  }
  console.log(`PASS: ${checks} bag dropdown/create/edit/layout checks, all nine choices, partial search, keyboard selection and legacy types; Admin/Marketing at five screen sizes; synthetic APIs only.`)
} finally { await browser.close() }
