const express = require("express");
const { chromium } = require("playwright");
const { URL } = require("url");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const WEBSITE_1 = "https://eat-token.killersharmabot.online/";
const WEBSITE_2 = "https://version-common-redflamenco.vercel.app/";

function extractDetails(link) {
  const url = new URL(link);

  return {
    name: url.searchParams.get("nickname") || "Not Found",
    uid: url.searchParams.get("account_id") || "Not Found",
    region: url.searchParams.get("region") || "Not Found"
  };
}

async function processFlow(userLink) {
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"]
    });

    const page = await browser.newPage();

    // Website 1
    await page.goto(WEBSITE_1, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await page
      .locator('input[placeholder*="kiosgamer"], input[placeholder*="Eat token"], input')
      .first()
      .fill(userLink);

    await page
      .getByRole("button", { name: /generate access/i })
      .click();

    await page.waitForTimeout(12000);

    const text1 = await page.locator("body").innerText();

    console.log("===== WEBSITE 1 OUTPUT =====");
    console.log(text1);
    console.log("============================");

    const match = text1.match(/[a-fA-F0-9]{40,}/);

    if (!match) {
      return {
        success: false,
        message: "❌ Access Token not found"
      };
    }

    const token = match[0];

    console.log("TOKEN FOUND:", token);

    // Website 2
    await page.goto(WEBSITE_2, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await page.locator("input").first().fill(token);

    await page
      .getByRole("button", { name: /verify/i })
      .click();

    await page.waitForTimeout(12000);

    const finalText = await page.locator("body").innerText();

    console.log("===== WEBSITE 2 OUTPUT =====");
    console.log(finalText);
    console.log("============================");

    if (
      finalText.toLowerCase().includes("connected") ||
      finalText.toLowerCase().includes("verified")
    ) {
      return {
        success: true,
        ...extractDetails(userLink)
      };
    }

    return {
      success: false,
      message: "❌ Verification failed. Please try again."
    };

  } catch (err) {
    console.error("ERROR:", err);

    return {
      success: false,
      message: "❌ Process failed. Please try again."
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

app.post("/api/connect", async (req, res) => {
  const { link } = req.body;

  if (!link || (!link.includes("account_id=") && !link.includes("kiosgamer"))) {
    return res.json({
      success: false,
      message: "❌ Please enter valid kiosgamer link."
    });
  }

  const result = await processFlow(link);
  res.json(result);
});

app.listen(3000, () => {
  console.log("Website running on http://localhost:3000");
});