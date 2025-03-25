import * as puppeteer from "puppeteer";
import * as fs from 'fs';
import * as path from 'path';

// Extend the Window interface to include the chrome property
declare global {
  interface Window {
    chrome: any;
  }
}

// Define the review type for better code organization
interface PlayStoreReview {
  // id: string;
  review_score: number;
  // username: string;
  details: string;
}

export class PlayStoreCrawler {
  private browser: puppeteer.Browser | null = null;
  private userAgents: string[] = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0',
  ];

  /**
   * Get a random user agent from the list
   */
  getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * Get a random viewport configuration
   */
  getRandomViewport(): {width: number, height: number} {
    const widths = [1280, 1366, 1440, 1536, 1600, 1920];
    const heights = [720, 768, 800, 864, 900, 1080];
    
    return {
      width: widths[Math.floor(Math.random() * widths.length)],
      height: heights[Math.floor(Math.random() * heights.length)]
    };
  }

  async init() {
    // Launch with additional arguments to avoid detection
    this.browser = await puppeteer.launch({
      headless: false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        `--window-size=${1280 + Math.floor(Math.random() * 100)},${800 + Math.floor(Math.random() * 100)}`
      ]
    });
    
    // Apply evasion techniques to all pages (script injection only, not permissions)
    this.browser.on('targetcreated', async (target) => {
      const page = await target.page();
      if (page) {
        await this.applyStealthTechniques(page);
      }
    });
  }

  /**
   * Apply various stealth techniques to avoid detection
   */
  async applyStealthTechniques(page: puppeteer.Page): Promise<void> {
    // Don't set permissions here - they need a valid URL first
    // Just override navigator properties
    await page.evaluateOnNewDocument(() => {
      // Override properties that detect automation
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'language', { get: () => 'en-US' });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      
      // Modify the plugins and mimeTypes
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const plugins = Array.from({ length: 3 + Math.floor(Math.random() * 4) }).fill(0).map(() => ({
            name: ['Chrome PDF Plugin', 'Chrome PDF Viewer', 'Native Client', 'Widevine Content Decryption Module'][Math.floor(Math.random() * 4)],
            filename: ['internal-pdf-viewer', 'mhjfbmdgcfjbbpaeojofohoefgiehjai', 'internal-nacl-plugin', 'widevinecdmadapter.dll'][Math.floor(Math.random() * 4)],
          }));
          return plugins;
        }
      });
      
      // Override hardware concurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => Math.floor(Math.random() * 8) + 4 });
      
      // Override Webdriver detection
      const newProto = Object.getPrototypeOf(navigator);
      delete (newProto as any).webdriver;
      Object.setPrototypeOf(navigator, newProto);
      
      // Override Chrome cdc attributes
      window.chrome = {} as any;
    });
  }
  
  /**
   * Apply permissions to a page after it has loaded
   */
  async applyPermissions(page: puppeteer.Page): Promise<void> {
    try {
      const url = page.url();
      
      // Only apply permissions to valid URLs (not about:blank, etc.)
      if (url && url.startsWith('http')) {
        const context = page.browser().defaultBrowserContext();
        const permissions: puppeteer.Permission[] = [
          'geolocation', 
          'notifications', 
          'camera', 
          'microphone'
        ];
        
        await context.overridePermissions(url, permissions);
      }
    } catch (error) {
      console.log("Could not apply permissions:", error);
    }
  }

  /**
   * Waits for a random amount of time within a given range
   * @param min Minimum time in milliseconds
   * @param max Maximum time in milliseconds
   */
  async randomDelay(min = 100, max = 2000): Promise<void> {
    // More variability in delay
    const baseDelay = Math.floor(Math.random() * (max - min) + min);
    const extraDelay = Math.random() < 0.3 ? Math.floor(Math.random() * 1000) : 0; // Occasionally add extra delay
    return new Promise(resolve => setTimeout(resolve, baseDelay + extraDelay));
  }

  /**
   * Moves the mouse in a human-like manner to the target element
   * @param page Puppeteer page
   * @param selector Element selector to move to
   */
  async moveMouseLikeHuman(page: puppeteer.Page, selector: string): Promise<void> {
    const element = await page.$(selector);
    if (!element) return;
    
    const box = await element.boundingBox();
    if (!box) return;
    
    // Get current mouse position or default to (0,0)
    const mouse = page.mouse;
    
    // Calculate a random position within the element
    const targetX = box.x + (Math.random() * box.width);
    const targetY = box.y + (Math.random() * box.height);
    
    // Move mouse with random curves and speed variations
    const steps = 10 + Math.floor(Math.random() * 15);
    for (let i = 0; i <= steps; i++) {
      // Add some randomness to the path
      const progress = i / steps;
      await mouse.move(
        targetX * progress, 
        targetY * progress, 
        { steps: 1 }
      );
      await this.randomDelay(5, 20);
    }
  }

  /**
   * Scrolls the page in a human-like manner
   * @param page Puppeteer page
   * @param distance Distance to scroll (positive for down, negative for up)
   */
  async scrollLikeHuman(page: puppeteer.Page, distance: number): Promise<void> {
    // Divide the scrolling into multiple smaller scrolls
    const scrollSteps = Math.abs(Math.floor(distance / (50 + Math.random() * 100)));
    const scrollStep = distance / scrollSteps;
    
    for (let i = 0; i < scrollSteps; i++) {
      await page.evaluate((step) => {
        window.scrollBy(0, step);
      }, scrollStep);
      
      await this.randomDelay(100, 350);
    }
  }

  /**
   * Types text like a human with variable speed
   * @param page Puppeteer page
   * @param text Text to type
   * @param selector Element selector to type into (optional)
   */
  async typeHumanLike(page: puppeteer.Page, text: string, selector?: string): Promise<void> {
    if (selector) {
      await page.click(selector);
      await this.randomDelay(300, 700);
    }
    
    for (let i = 0; i < text.length; i++) {
      await page.keyboard.type(text[i]);
      // Random delay between keystrokes
      await this.randomDelay(50, 200);
    }
  }

  /**
   * Handles common dialogs like cookie consent or notifications
   * @param page Puppeteer page
   */
  async handleDialogs(page: puppeteer.Page): Promise<void> {
    // Handle cookie consent dialog (Google specific)
    try {
      const cookieSelector = 'button[aria-label="Accept all"]';
      const cookieButton = await page.$(cookieSelector);
      if (cookieButton) {
        await this.moveMouseLikeHuman(page, cookieSelector);
        await page.click(cookieSelector);
        await this.randomDelay(500, 1000);
      }
    } catch (error) {
      console.log("No cookie dialog found or couldn't handle it");
    }
  }

  /**
   * Detects common captcha elements on a page
   * @param page Puppeteer page
   * @returns Boolean indicating if a captcha was detected
   */
  async detectCaptcha(page: puppeteer.Page): Promise<boolean> {
    // Check for various captcha indicators
    const captchaIndicators = [
      'iframe[src*="recaptcha"]',
      'iframe[src*="captcha"]',
      '.g-recaptcha',
      '#captcha',
      'input[name*="captcha"]',
      'img[alt*="captcha" i]',
      'div[class*="captcha" i]',
      // Common text that might appear in captcha contexts
      'text/captcha',
      'text/security check',
      'text/verify you are human'
    ];

    for (const selector of captchaIndicators) {
      try {
        const elementExists = await page.evaluate((sel) => {
          if (sel.startsWith('text/')) {
            const textToFind = sel.substring(5);
            return document.body.innerText.toLowerCase().includes(textToFind);
          }
          return !!document.querySelector(sel);
        }, selector);
        
        if (elementExists) return true;
      } catch (error) {
        console.log(`Error checking for captcha element ${selector}:`, error);
      }
    }
    
    return false;
  }
  
  /**
   * Reads app IDs from the specified file
   * @returns Array of app IDs
   */
  async readAppIdsFromFile(filePath: string = path.join(process.cwd(), 'play-store-to-crawl.txt')): Promise<string[]> {
    try {
      const fileContent = await fs.promises.readFile(filePath, 'utf-8');
      return fileContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    } catch (error) {
      console.error(`Error reading app IDs file: ${error}`);
      return [];
    }
  }

  /**
   * Navigates to a Google Play Store app page
   * @param appId The app ID to navigate to
   * @returns The page object
   */
  async navigateToAppPage(appId: string): Promise<puppeteer.Page | null> {
    if (!this.browser) {
      throw new Error("Browser not initialized");
    }

    try {
      const page = await this.browser.newPage();
      
      // Set a random user agent and viewport
      const userAgent = this.getRandomUserAgent();
      const viewport = this.getRandomViewport();
      
      await page.setUserAgent(userAgent);
      await page.setViewport(viewport);
      
      // Set custom headers to appear more like a real browser
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'sec-ch-ua': `"Not.A/Brand";v="8", "Chromium";v="${Math.floor(Math.random() * 10) + 115}"`,
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': ['Windows', 'macOS', 'Linux'][Math.floor(Math.random() * 3)]
      });

      // Randomize the URL access pattern
      let url = `https://play.google.com/store/apps/details?id=${appId}`;
      
      // Sometimes access via Google search first (randomizing the entry)
      if (Math.random() < 0.4) {
        console.log("Accessing via Google search first");
        await page.goto('https://www.google.com', { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Apply permissions after navigation to a valid URL
        await this.applyPermissions(page);
        
        await this.randomDelay(1000, 3000);
        
        // Type the search query with human-like typing
        await this.typeHumanLike(page, `${appId} google play`, 'input[name="q"]');
        await page.keyboard.press('Enter');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
        
        // Wait and scroll a bit like a human
        await this.randomDelay(1000, 2000);
        await this.scrollLikeHuman(page, Math.random() * 500 + 100);
        
        // Try to find and click the Play Store link
        try {
          const playStoreLinks = await page.$$('a[href*="play.google.com"]');
          if (playStoreLinks.length > 0) {
            const randomLink = playStoreLinks[Math.floor(Math.random() * playStoreLinks.length)];
            await randomLink.click();
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
          } else {
            // If no link found, go directly
            console.log("No Play Store link found in search results, going directly");
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
          }
        } catch (e) {
          console.log("Error finding Play Store link, going directly");
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        }
      } else {
        console.log(`Navigating directly to ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Apply permissions after navigation to a valid URL
        await this.applyPermissions(page);
      }
      
      // Sometimes move the mouse around randomly after page load
      if (Math.random() < 0.7) {
        for (let i = 0; i < Math.floor(Math.random() * 5) + 2; i++) {
          const x = Math.floor(Math.random() * viewport.width);
          const y = Math.floor(Math.random() * viewport.height);
          await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 5 });
          await this.randomDelay(200, 800);
        }
      }
      
      // Handle dialogs with random timing
      await this.randomDelay(800, 2000);
      await this.handleDialogs(page);
      
      return page;
    } catch (error) {
      console.error(`Error navigating to app page: ${error}`);
      return null;
    }
  }

  /**
   * Clicks on the "See all reviews" button
   * @param page The page object
   * @returns True if successful, false otherwise
   */
  async clickSeeAllReviews(page: puppeteer.Page): Promise<boolean> {
    try {
      // Random initial delay
      await this.randomDelay(1500, 4000);
      
      // Sometimes scroll a bit before looking for the button
      if (Math.random() < 0.8) {
        const scrollAmount = Math.floor(Math.random() * 800) + 200;
        await this.scrollLikeHuman(page, scrollAmount);
        await this.randomDelay(800, 2000);
      }
      
      // Find the "See all reviews" button
      const reviewButtonSelector = 'span.VfPpkd-vQzf8d:contains("See all reviews")';
      
      // First try to find it by text content
      const reviewButton = await page.evaluate(() => {
        const spans = Array.from(document.querySelectorAll('span.VfPpkd-vQzf8d'));
        return spans.find(span => span.textContent?.includes('See all reviews'))?.closest('button');
      });
      
      if (!reviewButton) {
        console.log("Could not find 'See all reviews' button by text. Trying to scroll down to find it...");
        
        // Scroll down the page gradually to look for the button
        for (let i = 0; i < 5; i++) {
          await this.scrollLikeHuman(page, 500);
          await this.randomDelay(800, 1200);
          
          const found = await page.evaluate(() => {
            const spans = Array.from(document.querySelectorAll('span.VfPpkd-vQzf8d'));
            return spans.find(span => span.textContent?.includes('See all reviews'))?.closest('button');
          });
          
          if (found) {
            console.log("Found 'See all reviews' button after scrolling");
            break;
          }
        }
      }
      
      // Try to click the button
      await page.evaluate(() => {
        const spans = Array.from(document.querySelectorAll('span.VfPpkd-vQzf8d'));
        const button = spans.find(span => span.textContent?.includes('See all reviews'))?.closest('button');
        if (button) button.click();
      });
      
      // Wait for modal to appear
      await this.randomDelay(1500, 2500);
      
      // Check if modal is present
      const modalExists = await page.evaluate(() => !!document.querySelector('div.VfPpkd-P5QLlc'));
      if (!modalExists) {
        console.log("Review modal did not appear");
        return false;
      }
      
      // Check for captcha before proceeding with click
      if (await this.detectCaptcha(page)) {
        // const captchaResolved = await this.handleCaptchaWithReloads(page);
        // if (!captchaResolved) {
        //   return false;
        // }
      }
      
      return true;
    } catch (error) {
      console.error(`Error clicking "See all reviews": ${error}`);
      return false;
    }
  }

  /**
   * Finds and clicks the filter button in the reviews modal
   * @param page The page object
   * @returns True if successful, false otherwise
   */
  async clickFilterButton(page: puppeteer.Page): Promise<boolean> {
    try {
      await this.randomDelay(1000, 2000);
      
      // Look for the filter button in the reviews modal
      const filterButtonExists = await page.evaluate(() => {
        // Look for the filter button which typically has an icon and might contain "Filter" text
        const buttons = Array.from(document.querySelectorAll('button.VfPpkd-Bz112c-LgbsSe'));
        const filterButton = buttons.find(button => {
          const ariaLabel = button.getAttribute('aria-label');
          return ariaLabel && (ariaLabel.includes('Filter') || ariaLabel.includes('filter'));
        });
        
        if (filterButton) {
          (filterButton as HTMLElement).click();
          return true;
        }
        return false;
      });
      
      if (!filterButtonExists) {
        console.log("Could not find filter button");
        return false;
      }
      
      // Wait for filter dropdown to appear
      await this.randomDelay(1000, 1500);
      return true;
    } catch (error) {
      console.error(`Error clicking filter button: ${error}`);
      return false;
    }
  }

  /**
   * Selects a specific star rating from the filter dropdown
   * @param page The page object
   * @param starRating The star rating to select (1-5)
   * @returns True if successful, false otherwise
   */
  async selectStarRating(page: puppeteer.Page, starRating: number): Promise<boolean> {
    try {
      if (starRating < 1 || starRating > 5) {
        console.error("Star rating must be between 1 and 5");
        return false;
      }
      
      console.log(`Selecting ${starRating}-star reviews...`);
      
      // Random wait before starting the filter process
      await this.randomDelay(1500, 3500);
      
      // Create screenshots directory if it doesn't exist
      try {
        const screenshotsDir = path.join(process.cwd(), 'screenshots');
        if (!fs.existsSync(screenshotsDir)) {
          fs.mkdirSync(screenshotsDir);
        }
        
        // Take screenshot before we start
        await page.screenshot({
          path: path.join(screenshotsDir, `before-${starRating}-star.png`)
        }).catch(() => console.log("Could not save before screenshot"));
      } catch (e) {
        console.log("Screenshot directory creation failed, continuing without screenshots");
      }
      
      // STEP 1: First click the main filter button with randomized approach
      console.log("Clicking main filter button...");
      
      // Try different approaches with randomized order
      const approaches = [
        // Direct click with selector
        async () => {
          await page.click('button.VfPpkd-Bz112c-LgbsSe[aria-label*="filter" i]');
          return true;
        },
        
        // Click using mouse movement
        async () => {
          const filterButton = await page.$('button.VfPpkd-Bz112c-LgbsSe[aria-label*="filter" i]');
          if (filterButton) {
            const box = await filterButton.boundingBox();
            if (box) {
              // Move to a random position within the button
              const x = box.x + box.width * (0.3 + Math.random() * 0.4);
              const y = box.y + box.height * (0.3 + Math.random() * 0.4);
              await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 5 });
              await this.randomDelay(100, 300);
              await page.mouse.down();
              await this.randomDelay(50, 150);
              await page.mouse.up();
            }
            return true;
          }
          return false;
        },
        
        // Evaluation approach
        async () => {
          return await page.evaluate(() => {
            const filterButtons = Array.from(document.querySelectorAll('button'));
            // Look for filter button with different criteria
            const candidates = filterButtons.filter(btn => {
              const ariaLabel = btn.getAttribute('aria-label');
              return (ariaLabel && /filter/i.test(ariaLabel)) || 
                     btn.textContent?.includes('Filter') ||
                     btn.classList.contains('VfPpkd-Bz112c-LgbsSe');
            });
            
            if (candidates.length > 0) {
              // Click a random candidate if multiple found
              const button = candidates[Math.floor(Math.random() * candidates.length)];
              (button as HTMLElement).click();
              return true;
            }
            return false;
          });
        }
      ];
      
      // Shuffle the approaches for more randomness
      for (let i = approaches.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [approaches[i], approaches[j]] = [approaches[j], approaches[i]];
      }
      
      // Try each approach until one works
      let filterButtonClicked = false;
      for (const approach of approaches) {
        try {
          filterButtonClicked = await approach();
          if (filterButtonClicked) break;
        } catch (e) {
          // Just try the next approach
        }
      }
      
      if (!filterButtonClicked) {
        console.log("All approaches to click filter button failed");
      }
      
      // Wait for menu to appear with variable timing
      await this.randomDelay(1800, 3500);
      
      // STEP 2: Click the Star rating filter option with improved randomization
      console.log("Clicking Star rating filter option...");
      
      // Try multiple approaches in random order for clicking Star rating option
      const starRatingApproaches = [
        // Find by text content
        async () => {
          return await page.evaluate(() => {
            // Find all elements that might contain "Star rating" text
            const elements = [
              ...Array.from(document.querySelectorAll('div[role="button"]')),
              ...Array.from(document.querySelectorAll('div.D3Qfie')),
              ...Array.from(document.querySelectorAll('div[class*="menu"]')),
            ];
            
            // Find the first element containing Star rating text
            for (const element of elements) {
              if (element.textContent?.includes('Star rating')) {
                (element as HTMLElement).click();
                return true;
              }
            }
            return false;
          });
        },
        
        // Find by aria attributes and class
        async () => {
          const elements = await page.$$('div[role="button"], div.D3Qfie, [aria-haspopup="true"]');
          for (const element of elements) {
            const text = await page.evaluate(el => el.textContent, element);
            if (text && text.includes('Star rating')) {
              await element.click();
              return true;
            }
          }
          return false;
        },
        
        // Completely different approach using keyboard navigation
        async () => {
          // Focus on the page and press tab a few times to try to reach the menu
          await page.focus('body');
          const tabCount = Math.floor(Math.random() * 5) + 1;
          for (let i = 0; i < tabCount; i++) {
            await page.keyboard.press('Tab');
            await this.randomDelay(100, 300);
          }
          
          // Press Enter and see if that activates something
          await page.keyboard.press('Enter');
          await this.randomDelay(500, 1000);
          
          // Check if we opened a menu
          const menuVisible = await page.evaluate(() => {
            const possibleMenus = document.querySelectorAll('[role="menu"], [aria-expanded="true"]');
            return possibleMenus.length > 0;
          });
          
          return menuVisible;
        }
      ];
      
      // Shuffle approaches
      for (let i = starRatingApproaches.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [starRatingApproaches[i], starRatingApproaches[j]] = [starRatingApproaches[j], starRatingApproaches[i]];
      }
      
      // Try each approach
      let starRatingClicked = false;
      for (const approach of starRatingApproaches) {
        try {
          starRatingClicked = await approach();
          if (starRatingClicked) {
            console.log("Successfully clicked Star rating option");
            break;
          }
        } catch (e) {
          // Try next approach
        }
      }
      
      // If approaches failed, try one more desperate attempt
      if (!starRatingClicked) {
        try {
          starRatingClicked = await page.evaluate(() => {
            // Try to find and click the Star rating option by different criteria
            const allDivs = document.querySelectorAll('div');
            for (const div of allDivs) {
              if (div.textContent?.includes('Star rating') && 
                  (div.hasAttribute('role') || 
                   div.classList.length > 0 || 
                   div.parentElement?.hasAttribute('role'))) {
                
                // Click the element or its parent if it seems more clickable
                if (div.hasAttribute('role') && div.getAttribute('role') === 'button') {
                  (div as HTMLElement).click();
                } else if (div.parentElement?.hasAttribute('role')) {
                  (div.parentElement as HTMLElement).click();
                } else {
                  (div as HTMLElement).click();
                }
                return true;
              }
            }
            return false;
          });
        } catch (e) {
          console.log("All Star rating button click attempts failed");
        }
      }
      
      // Wait for star rating dropdown with variable timing
      await this.randomDelay(2000, 4000);
      
      // STEP 3: Select the specific star rating with improved randomization
      console.log(`Selecting ${starRating}-star option...`);
      
      let clickSuccess = false;
      
      // Define multiple approaches and try them in random order
      const starSelectionApproaches = [
        // Approach 1: Try to find by role="menuitemradio" and text content
        async () => {
          return await page.evaluate((rating) => {
            const starRatingPatterns = [
              `${rating}-star`, `${rating} star`, `${rating} stars`,
              `Rated ${rating} stars`, `${rating} Stars`, `${rating}`
            ];
            
            // Use different selectors to find the star rating option
            const selectors = [
              '[role="menuitemradio"]',
              'div.XvhY1d div',
              'div.jO7h3c',
              '[role="option"]',
              'div[tabindex="0"]'
            ];
            
            // Try each selector
            for (const selector of selectors) {
              const elements = document.querySelectorAll(selector);
              for (const element of elements) {
                const text = element.textContent?.toLowerCase() || '';
                if (starRatingPatterns.some(pattern => text.includes(pattern.toLowerCase()))) {
                  // Wait a random amount before clicking to seem more human
                  setTimeout(() => {
                    (element as HTMLElement).click();
                  }, Math.random() * 300 + 100);
                  return true;
                }
              }
            }
            return false;
          }, starRating);
        },
        
        // Approach 2: Try keyboard navigation to select star rating
        async () => {
          // Clear any existing focus
          await page.keyboard.press('Escape');
          await this.randomDelay(300, 800);
          
          // First select a random item, then use arrow keys to navigate
          const elements = await page.$$('[role="menuitemradio"], [role="option"]');
          if (elements.length > 0) {
            // Click a random element first
            const randomIndex = Math.floor(Math.random() * elements.length);
            await elements[randomIndex].click();
            await this.randomDelay(300, 800);
            
            // Navigate with arrow keys
            const keysToPress = Math.floor(Math.random() * 4) + 1;
            for (let i = 0; i < keysToPress; i++) {
              await page.keyboard.press('ArrowDown');
              await this.randomDelay(200, 500);
            }
            
            // Select the current option
            await page.keyboard.press('Enter');
            return true;
          }
          return false;
        },
        
        // Approach 3: Try to use mouse movement to a specific coordinate
        async () => {
          // Find all menu items
          const menuItems = await page.$$('[role="menuitemradio"], [role="option"], div.XvhY1d div');
          if (menuItems.length > 0) {
            // Choose an item based on star rating (assuming they're in order)
            // We'll adjust the index a bit randomly to not always pick the same position
            const targetIndex = menuItems.length - starRating + (Math.random() < 0.5 ? 0 : 1);
            const targetItem = menuItems[Math.max(0, Math.min(menuItems.length - 1, targetIndex))];
            
            // Move to and click the target
            const box = await targetItem.boundingBox();
            if (box) {
              // Move to a random position within the item
              const x = box.x + box.width * (0.3 + Math.random() * 0.4);
              const y = box.y + box.height * (0.3 + Math.random() * 0.4);
              await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 5 });
              await this.randomDelay(100, 300);
              await page.mouse.down();
              await this.randomDelay(50, 150);
              await page.mouse.up();
              return true;
            }
          }
          return false;
        }
      ];
      
      // Shuffle approaches
      for (let i = starSelectionApproaches.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [starSelectionApproaches[i], starSelectionApproaches[j]] = [starSelectionApproaches[j], starSelectionApproaches[i]];
      }
      
      // Try each approach
      for (const approach of starSelectionApproaches) {
        try {
          clickSuccess = await approach();
          if (clickSuccess) {
            console.log(`Successfully selected ${starRating}-star rating`);
            break;
          }
        } catch (e) {
          // Try next approach
        }
      }
      
      if (!clickSuccess) {
        console.log(`Failed to select ${starRating}-star rating`);
        return false;
      }
      
      // Wait for reviews to load with variable timing
      await this.randomDelay(3000, 6000);
      return true;
    } catch (error) {
      console.error(`Error in selectStarRating:`, error);
      return false;
    }
  }

  /**
   * Scrolls inside the review modal to load more reviews
   * @param page The page object
   * @param scrollCount Number of times to scroll
   */
  async scrollReviewModal(page: puppeteer.Page, scrollCount: number = 100): Promise<void> {
    try {
      // Get the modal selector
      const modalSelector = 'div.VfPpkd-P5QLlc';
      
      for (let i = 0; i < scrollCount; i++) {
        await page.evaluate((selector) => {
          const modal = document.querySelector(selector);
          if (modal) {
            modal.scrollTop += 1000; // Scroll down 1000px at a time
          }
        }, modalSelector);
        
        // Wait for new content to load
        await this.randomDelay(1000, 2000);
        
        console.log(`Scrolled modal ${i + 1}/${scrollCount} times`);
        
        // Check for captcha occasionally during scrolling
        if (i % 3 === 0 && await this.detectCaptcha(page)) {
          // const captchaResolved = await this.handleCaptchaWithReloads(page);
          // if (!captchaResolved) {
          //   console.log("Could not resolve captcha during scrolling. Stopping here.");
          //   break;
          // }
        }
      }
    } catch (error) {
      console.error(`Error scrolling review modal: ${error}`);
    }
  }

  /**
   * Extracts reviews from the review modal
   * @param page The page object
   * @param appId The app ID for identification
   * @returns Array of review objects
   */
  async extractReviews(page: puppeteer.Page, appId: string): Promise<PlayStoreReview[]> {
    try {
      return await page.evaluate((appId) => {
        const reviews: PlayStoreReview[] = [];
        const reviewElements = document.querySelectorAll('div.RHo1pe');
        
        for (const reviewElement of reviewElements) {
          // Extract the username
          const usernameElement = reviewElement.querySelector('div.X5PpBb');
          const username = usernameElement ? usernameElement.textContent?.trim() || 'Unknown User' : 'Unknown User';
          
          // Extract the rating
          const ratingElement = reviewElement.querySelector('div.iXRFPc');
          let reviewScore = 0;
          if (ratingElement) {
            const ariaLabel = ratingElement.getAttribute('aria-label');
            if (ariaLabel) {
              const match = ariaLabel.match(/Rated (\d+) stars out of five stars/i);
              if (match && match[1]) {
                reviewScore = parseInt(match[1], 10);
              }
            }
          }
          
          // Extract the review text
          const detailsElement = reviewElement.querySelector('div.h3YV2d');
          const details = detailsElement ? detailsElement.textContent?.trim() || '' : '';
          
          if (username && details) {
            reviews.push({
              // id: `google${appId}`,
              review_score: reviewScore,
              // username,
              details
            });
          }
        }
        
        return reviews;
      }, appId);
    } catch (error) {
      console.error(`Error extracting reviews: ${error}`);
      return [];
    }
  }

  /**
   * Crawls reviews for each star rating (1-5 stars)
   * @param page The page object
   * @param appId The app ID
   * @param maxReviewsPerRating Maximum number of reviews to collect per star rating
   * @returns Array of review objects across all star ratings
   */
  async crawlReviewsByStarRating(
    page: puppeteer.Page, 
    appId: string, 
    maxReviewsPerRating: number = 500
  ): Promise<PlayStoreReview[]> {
    const allReviews: PlayStoreReview[] = [];
    
    // Click on "See all reviews" button
    const clickSuccess = await this.clickSeeAllReviews(page);
    if (!clickSuccess) {
      console.log("Failed to open reviews modal");
      return [];
    }
    
    await this.randomDelay(1500, 2500);
    
    // Loop through each star rating (1-5)
    for (let starRating = 1; starRating <= 5; starRating++) {
      console.log(`Processing ${starRating}-star reviews for app ${appId}`);
      
      // Select the current star rating
      const ratingSelected = await this.selectStarRating(page, starRating);
      if (!ratingSelected) {
        console.log(`Failed to select ${starRating}-star filter`);
        continue;
      }
      
      // Scroll to load more reviews
      const scrollsNeeded = Math.ceil(maxReviewsPerRating / 10); // Assuming ~10 reviews per scroll
      await this.scrollReviewModal(page, scrollsNeeded);
      
      // Extract reviews with current filter
      const reviews = await this.extractReviews(page, appId);
      console.log(`Extracted ${reviews.length} ${starRating}-star reviews for app ${appId}`);
      
      allReviews.push(...reviews);
      
      await this.randomDelay(1500, 2500);
    }
    
    this.saveReviewsToCsv(allReviews, `play_store_reviews_${appId}.csv`);
    return allReviews;
  }

  /**
   * Converts review objects to CSV string
   * @param reviews Array of review objects
   * @returns CSV string with headers
   */
  convertReviewsToCsv(reviews: PlayStoreReview[]): string {
    if (reviews.length === 0) {
      return 'id,review_score,username,details\n';
    }
    
    // Create CSV header
    const headers = Object.keys(reviews[0]).join(',');
    
    // Create CSV rows
    const rows = reviews.map(review => {
      return [
        // review.id,
        review.review_score,
        // Escape quotes in text fields and wrap in quotes to handle commas
        // `"${review.username.replace(/"/g, '""')}"`,
        `"${review.details.replace(/"/g, '""')}"`
      ].join(',');
    });
    
    return [headers, ...rows].join('\n');
  }

  /**
   * Saves reviews to CSV file
   * @param reviews Array of review objects
   * @param filePath Path to save the CSV file
   */
  saveReviewsToCsv(reviews: PlayStoreReview[], filePath: string = 'play_store_reviews.csv'): void {
    try {
      const csvContent = this.convertReviewsToCsv(reviews);
      fs.writeFileSync(filePath, csvContent);
      console.log(`Successfully saved ${reviews.length} reviews to ${filePath}`);
    } catch (error) {
      console.error(`Error saving reviews to CSV: ${error}`);
    }
  }

  /**
   * Crawls reviews for all apps in the input file
   * @param maxReviewsPerApp Maximum number of reviews to collect per app
   * @returns Array of review objects for all apps
   */
  async crawlPlayStoreReviews(maxReviewsPerRating: number = 500): Promise<PlayStoreReview[]> {
    if (!this.browser) {
      await this.init();
    }
    
    const allReviews = [];
    const appIds = await this.readAppIdsFromFile();
    
    for (const appId of appIds) {
      console.log(`Processing app: ${appId}`);
      
      const page = await this.navigateToAppPage(appId);
      if (!page) continue;
      
      // Use the new method to crawl reviews by star rating
      const reviews = await this.crawlReviewsByStarRating(page, appId, maxReviewsPerRating);
      console.log(`Extracted ${reviews.length} total reviews for app ${appId}`);
      
      allReviews.push(...reviews);
      
      await this.randomDelay(1000, 2000);
      await page.close();
    }
    
    return allReviews;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Example usage in main function
async function main() {
  const crawler = new PlayStoreCrawler();
  await crawler.init();
  
  try {
    const reviews = await crawler.crawlPlayStoreReviews();
    console.log(`Total reviews collected: ${reviews.length}`);
    
    // Save reviews to CSV file instead of JSON
    crawler.saveReviewsToCsv(reviews);
  } catch (error) {
    console.error(`Error in main: ${error}`);
  } finally {
    await crawler.close();
  }
}

// Uncomment to run as standalone script
// main().catch(console.error);
