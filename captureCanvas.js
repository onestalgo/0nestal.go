const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function captureCanvas() {
    // Check if screenshots directory exists, if not create it
    const screenshotsDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotsDir)){
        fs.mkdirSync(screenshotsDir);
    }

    // Launch the browser
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate to your canvas page
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    // Define the path for the screenshot
    const screenshotPath = path.join(screenshotsDir, 'canvasScreenshot.png');

    // Take a screenshot of the canvas element
    await page.screenshot({ path: screenshotPath });

    // Close the browser
    await browser.close();

    console.log(`Screenshot saved to ${screenshotPath}`);
}

captureCanvas().catch(error => console.error('Error capturing the canvas:', error));
