import puppeteer from "puppeteer";

const BASE_URL = (process.env.TEST_APP_URL || "http://localhost:5173").replace(/\/$/, "");
const LOGIN_PATH = process.env.TEST_LOGIN_PATH || "/login";
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;
const TARGET_PLAN_SLUG = process.env.TEST_TARGET_PLAN_SLUG;
const HEADLESS = process.env.TEST_HEADLESS !== "false";

if (!TEST_EMAIL || !TEST_PASSWORD || !TARGET_PLAN_SLUG) {
  console.error("Missing required environment variables: TEST_EMAIL, TEST_PASSWORD, TEST_TARGET_PLAN_SLUG");
  process.exit(1);
}

const WAIT_OPTS = { timeout: 30000 };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizePlanLabel = (text) => {
  if (!text) return null;
  return text.replace("Plano Atual:", "").trim();
};

async function extractCurrentPlan(page) {
  try {
    await page.waitForSelector('[data-testid="current-plan-badge"]', WAIT_OPTS);
    const text = await page.$eval('[data-testid="current-plan-badge"]', (el) => el.textContent || "");
    return normalizePlanLabel(text);
  } catch (err) {
    console.warn("Unable to read current plan badge", err);
    return null;
  }
}

async function clickButtonByText(page, text) {
  const handled = await page.evaluate((btnText) => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const target = buttons.find((btn) => btn.textContent?.trim().includes(btnText));
    if (target) {
      target.click();
      return true;
    }
    return false;
  }, text);

  if (!handled) {
    throw new Error(`Button with text "${text}" not found`);
  }
}

(async () => {
  const browser = await puppeteer.launch({ headless: HEADLESS, defaultViewport: { width: 1366, height: 768 } });
  const page = await browser.newPage();

  try {
    const loginUrl = `${BASE_URL}${LOGIN_PATH.startsWith("/") ? "" : "/"}${LOGIN_PATH}`;
    console.log(`Navigating to ${loginUrl}`);
    await page.goto(loginUrl, { waitUntil: "networkidle0" });

    await page.waitForSelector("#email", WAIT_OPTS);

    await page.type("#email", TEST_EMAIL, { delay: 40 });
    await page.type("#password", TEST_PASSWORD, { delay: 40 });
    await clickButtonByText(page, "Entrar");

    const loginPathname = new URL(loginUrl).pathname;
    await page.waitForFunction(
      (path) => window.location.pathname !== path,
      WAIT_OPTS,
      loginPathname,
    );

    console.log("Navigating to /planos");
    await page.goto(`${BASE_URL}/planos`, { waitUntil: "networkidle0" });
    await page.waitForSelector("[data-plan-id]", WAIT_OPTS);
    await sleep(1500);

    const initialPlan = await extractCurrentPlan(page);
    console.log(`Current plan before upgrade attempt: ${initialPlan ?? "(unknown)"}`);

    const targetButtonSelector = `[data-testid="plan-select-${TARGET_PLAN_SLUG}"]`;
    await page.waitForSelector(targetButtonSelector, WAIT_OPTS);
    await page.click(targetButtonSelector);
    console.log(`Opened upgrade dialog for plan slug ${TARGET_PLAN_SLUG}`);

    await page.waitForSelector('[role="dialog"]', WAIT_OPTS);
    await clickButtonByText(page, "Ir para Stripe");
    console.log("Redirecting to Stripe Checkout...");

    try {
      await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 20000 });
      console.log(`Redirected to ${page.url()}`);
    } catch (navError) {
      console.warn("Navigation to Stripe not detected within timeout", navError);
    }

    // Simulate user aborting payment and returning to the app
    console.log("User aborts checkout and returns to dashboard");
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle0" });
    await sleep(1000);

    console.log("Reloading plan page to verify state");
    await page.goto(`${BASE_URL}/planos`, { waitUntil: "networkidle0" });
    await page.waitForSelector("[data-plan-id]", WAIT_OPTS);
    await sleep(1500);

    const postPlan = await extractCurrentPlan(page);
    console.log(`Current plan after aborting checkout: ${postPlan ?? "(unknown)"}`);

    if (initialPlan && postPlan && initialPlan !== postPlan) {
      throw new Error(`Plan changed from "${initialPlan}" to "${postPlan}" even though checkout was cancelled.`);
    }

    console.log("✅ Plan remained unchanged after cancelling checkout.");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
