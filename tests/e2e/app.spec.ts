import { test, expect, ElectronApplication, Page } from "@playwright/test"
import { _electron as electron } from "playwright"
import path from "path"

test.describe.serial("MONA Live E2E Tests", () => {
  let electronApp: ElectronApplication
  let page: Page

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, "../../dist-electron/main.js")],
      env: {
        ...process.env,
        NODE_ENV: "production",
        PLAYWRIGHT_TEST: "true"
      },
      timeout: 30000
    })

    page = await electronApp.firstWindow({ timeout: 30000 })
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(3000)
  })

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close()
    }
  })

  test("1. App launches with correct title", async () => {
    const title = await page.title()
    expect(title).toContain("MONA")
  })

  test("2. App window is visible", async () => {
    const isVisible = await electronApp.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      return win && win.isVisible()
    })
    expect(isVisible).toBe(true)
  })

  test("3. Page has React content", async () => {
    const rootDiv = page.locator("#root")
    await expect(rootDiv).toBeVisible({ timeout: 10000 })

    const hasContent = await rootDiv.innerHTML()
    expect(hasContent.length).toBeGreaterThan(10)
  })

  test("4. Main screen shows candidate input", async () => {
    const nameInput = page.locator("input[placeholder*='Kandidat'], input[placeholder*='Name']").first()
    await expect(nameInput).toBeVisible({ timeout: 10000 })
  })

  test("5. Can fill candidate name", async () => {
    const nameInput = page.locator("input").first()
    await nameInput.fill("Max Mustermann")
    await expect(nameInput).toHaveValue("Max Mustermann")
  })

  test("6. Interview start button is visible", async () => {
    const startButton = page.locator("button:has-text('Interview starten')")
    await expect(startButton).toBeVisible({ timeout: 5000 })
  })

  test("7. Start button disabled when input empty", async () => {
    const nameInput = page.locator("input").first()
    const startButton = page.locator("button:has-text('Interview starten')")

    await nameInput.fill("")
    await page.waitForTimeout(200)
    await expect(startButton).toBeDisabled()
  })

  test("8. Start button enabled when input has value", async () => {
    const nameInput = page.locator("input").first()
    const startButton = page.locator("button:has-text('Interview starten')")

    await nameInput.fill("Test Bewerber")
    await expect(startButton).toBeEnabled()
  })

  test("9. Header shows Live branding", async () => {
    const header = page.locator("text=Live")
    await expect(header.first()).toBeVisible({ timeout: 5000 })
  })

  test("10. Header shows navigation icons", async () => {
    const buttons = page.locator("button").filter({ has: page.locator("svg") })
    const count = await buttons.count()
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test("11. Logout button is visible", async () => {
    const logout = page.locator("text=Abmelden")
    await expect(logout).toBeVisible({ timeout: 5000 })
  })

  test("12. Click interview start navigates to preflight", async () => {
    const nameInput = page.locator("input").first()
    await nameInput.fill("Preflight Test")

    const startButton = page.locator("button:has-text('Interview starten')")
    await startButton.click()
    await page.waitForTimeout(1500)

    const preflightHeading = page.locator("text=Vorbereitung")
    await expect(preflightHeading).toBeVisible({ timeout: 10000 })
  })

  test("13. Preflight shows microphone status", async () => {
    const micStatus = page.locator("text=Mikrofon")
    await expect(micStatus.first()).toBeVisible({ timeout: 5000 })
  })

  test("14. Preflight shows interview type options", async () => {
    const videoCall = page.locator("text=Video-Call").first()
    const telefon = page.locator("text=Telefon").first()
    const vorOrt = page.locator("text=Vor Ort").first()

    await expect(videoCall).toBeVisible({ timeout: 5000 })
    await expect(telefon).toBeVisible()
    await expect(vorOrt).toBeVisible()
  })
})
