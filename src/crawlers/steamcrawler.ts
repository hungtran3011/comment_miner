import Axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import { supabaseService } from '../database/supabase';
import * as fs from 'fs';
import * as path from 'path';

import ReviewOutputModel from './review_output_model';

// Debug flag - set to true to enable debug logging
const DEBUG_MODE = true;

const itemsPerPage = 50;
const languages = ['english', 'vietnamese'];

// List of user agents to rotate through
const userAgents = [
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

// Class to handle proxy rotation and user agent rotation
class RequestManager {
  private proxies: string[] = [];
  private currentProxyIndex: number = 0;
  private axiosInstance: AxiosInstance;
  
  constructor() {
    this.axiosInstance = Axios.create();
    this.loadProxies();
    this.debug('RequestManager initialized');
  }
  
  /**
   * Debug logging utility
   */
  private debug(message: string, data?: any): void {
    if (DEBUG_MODE) {
      const timestamp = new Date().toISOString();
      if (data) {
        console.log(`[DEBUG][${timestamp}] ${message}`, data);
      } else {
        console.log(`[DEBUG][${timestamp}] ${message}`);
      }
    }
  }
  
  /**
   * Get a random user agent from the list
   */
  getRandomUserAgent(): string {
    const agent = userAgents[Math.floor(Math.random() * userAgents.length)];
    this.debug(`Selected user agent: ${agent.substring(0, 30)}...`);
    return agent;
  }
  
  /**
   * Load proxies from a configuration file
   */
  private loadProxies(): void {
    try {
      const proxyFilePath = path.join(process.cwd(), 'proxies.txt');
      this.debug(`Attempting to load proxies from: ${proxyFilePath}`);
      
      if (fs.existsSync(proxyFilePath)) {
        const proxyContent = fs.readFileSync(proxyFilePath, 'utf-8');
        this.proxies = proxyContent
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        console.log(`Loaded ${this.proxies.length} proxies for rotation`);
        this.debug(`Proxy list:`, this.proxies);
      } else {
        console.log('No proxies.txt file found. Running without proxy rotation.');
        this.debug('No proxies.txt file found at path: ' + proxyFilePath);
      }
    } catch (error) {
      console.error('Error loading proxies:', error);
      this.debug('Error while loading proxies:', error);
    }
  }
  
  /**
   * Get the next proxy from the rotation
   */
  getNextProxy(): string | null {
    if (this.proxies.length === 0) {
      this.debug('No proxies available, returning null');
      return null;
    }
    
    const proxy = this.proxies[this.currentProxyIndex];
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
    this.debug(`Selected proxy: ${proxy} (index: ${this.currentProxyIndex-1}/${this.proxies.length})`);
    return proxy;
  }
  
  /**
   * Wait for a random amount of time within a given range
   */
  async randomDelay(min = 1000, max = 5000): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min) + min);
    this.debug(`Waiting for ${delay}ms delay (range: ${min}-${max}ms)`);
    return new Promise(resolve => setTimeout(resolve, delay));
  }
  
  /**
   * Make an HTTP request with rotating user agents and proxies
   */
  async makeRequest(url: string, params?: any): Promise<any> {
    this.debug(`Making request to: ${url}`, params);
    
    const config: AxiosRequestConfig = {
      headers: {
        'User-Agent': this.getRandomUserAgent(),
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://steamcommunity.com/'
      }
    };
    
    // Add params if provided
    if (params) {
      config.params = params;
      this.debug('Request parameters:', params);
    }
    
    // Add proxy if available
    const proxy = this.getNextProxy();
    if (proxy) {
      this.debug(`Configuring proxy: ${proxy}`);
      // Format depends on your proxy type (http, https, socks, etc.)
      if (proxy.includes('@')) {
        // Format: protocol://username:password@host:port
        config.proxy = {
          host: proxy.split('@')[1].split(':')[0],
          port: parseInt(proxy.split(':').pop() || '80'),
          auth: {
            username: proxy.split('://')[1].split(':')[0],
            password: proxy.split(':')[2].split('@')[0]
          },
          protocol: proxy.split('://')[0]
        };
        this.debug('Proxy with authentication configured:', {
          host: config.proxy.host,
          port: config.proxy.port,
          protocol: config.proxy.protocol,
          auth: 'username:***' // Hide actual password
        });
      } else {
        // Format: protocol://host:port
        config.proxy = {
          host: proxy.split('://')[1].split(':')[0],
          port: parseInt(proxy.split(':').pop() || '80'),
          protocol: proxy.split('://')[0]
        };
        this.debug('Proxy configured:', config.proxy);
      }
    } else {
      this.debug('No proxy being used for this request');
    }
    
    // Randomize request timing with retries
    let retries = 3;
    while (retries > 0) {
      try {
        // Add a random delay before each request
        await this.randomDelay();
        
        this.debug(`Sending request (attempt ${4-retries}/3)`);
        const response = await this.axiosInstance.get(url, config);
        this.debug(`Request successful - Status: ${response.status}, Data length: ${
          typeof response.data === 'string' ? response.data.length : 'not string'
        } bytes`);
        
        return response.data;
      } catch (error: any) {
        retries--;
        console.log(`Request failed (${retries} retries left): ${error.message}`);
        this.debug('Request error details:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          headers: error.response?.headers,
          retryCount: 3 - retries
        });
        
        if (error.response && error.response.status === 429) {
          // Rate limited - wait longer before retry
          console.log('Rate limited. Waiting longer before retry...');
          this.debug('Rate limited (429). Implementing longer delay');
          await this.randomDelay(5000, 15000);
        } else {
          // Other error - wait standard delay
          this.debug(`Standard retry delay for error: ${error.message}`);
          await this.randomDelay(2000, 5000);
        }
        
        if (retries === 0) {
          this.debug('All retries exhausted. Giving up on request.');
          throw error;
        }
      }
    }
  }
}

// Create a global request manager
const requestManager = new RequestManager();

/**
 * Get reviews from Steam with user agent and IP rotation
 */
export async function* getSteamReview(gameId: string): AsyncGenerator<ReviewOutputModel[]> {
  if (DEBUG_MODE) console.log(`[DEBUG] Starting review collection for game ID: ${gameId}`);
  
  const baseUrl = `https://steamcommunity.com/app/${gameId}/reviews/homecontent/`;
  const prefix = "steam";

  // Iterate through each language
  for (const language of languages) {
    if (DEBUG_MODE) console.log(`[DEBUG] Processing language: ${language}`);
    let cursor = '*';
    let pageIndex = 1;
    let userreviewsoffset = 0;

    while (true) {
      if (DEBUG_MODE) console.log(`[DEBUG] Processing page ${pageIndex} with offset ${userreviewsoffset}`);
      const params = {
        userreviewsoffset: userreviewsoffset.toString(),
        p: pageIndex.toString(),
        workshopitemspage: pageIndex.toString(),
        readytouseitemspage: pageIndex.toString(),
        mtxitemspage: pageIndex.toString(),
        itemspage: pageIndex.toString(),
        screenshotspage: pageIndex.toString(),
        videospage: pageIndex.toString(),
        artpage: pageIndex.toString(),
        allguidepage: pageIndex.toString(),
        webguidepage: pageIndex.toString(),
        integratedguidepage: pageIndex.toString(),
        discussionspage: pageIndex.toString(),
        numperpage: itemsPerPage.toString(),
        browsefilter: 'toprated',
        language: language,
        userreviewscursor: cursor,
      };

      try {
        // Use the request manager instead of direct Axios call
        const data = await requestManager.makeRequest(baseUrl, params);

        if (DEBUG_MODE) console.log(`[DEBUG] Received response data for page ${pageIndex}`);
        
        if (typeof data !== 'string') {
          throw new Error('Expected HTML content to be a string');
        }

        const $ = cheerio.load(data);
        const reviews = $('.apphub_Card')
          .map(async (_, element) => {
            const $element = $(element);
            const detailsElement = $element.find('.apphub_CardTextContent');
            let details = detailsElement.clone().children().remove().end().text().trim();

            // Remove truncate pattern
            details = details.replace(/\n\s+/g, ' ');

            if (!details) {
              return null;
            }

            const result = {
              id: prefix + gameId,
              state: $element.find('.title').text().trim() === "Recommended",
              details,
              username: $element.find('.apphub_CardContentAuthorName').text().trim()
            };
            await supabaseService.from('steam').insert(result);
            return result;
          })
          .get()
          .filter(Boolean) as ReviewOutputModel[];

        if (DEBUG_MODE) console.log(`[DEBUG] Found ${reviews.length} reviews on page ${pageIndex}`);
        
        yield reviews;

        // Update the cursor and page index for the next page
        const nextCursor = $('input[name="userreviewscursor"]').val();
        if (!nextCursor || nextCursor === cursor) {
          if (DEBUG_MODE) console.log(`[DEBUG] No more pages to process for language ${language}`);
          break;
        }
        cursor = nextCursor.toString();
        userreviewsoffset += itemsPerPage;
        pageIndex++;
        
        if (DEBUG_MODE) console.log(`[DEBUG] Moving to next page with cursor: ${cursor.substring(0, 20)}...`);
        
        // Add a random delay between pages
        await requestManager.randomDelay(2000, 6000);
      } catch (error) {
        console.error(`Error fetching Steam reviews (game: ${gameId}, page: ${pageIndex}, language: ${language}):`, error);
        if (DEBUG_MODE) console.log(`[DEBUG] Error details:`, error);
        // Wait before retrying after an error
        await requestManager.randomDelay(10000, 20000);
        // Continue to next language if we can't progress with this one
        if (DEBUG_MODE) console.log(`[DEBUG] Switching to next language due to error`);
        break;
      }
    }
  }
  
  if (DEBUG_MODE) console.log(`[DEBUG] Completed review collection for game ID: ${gameId}`);
}

/**
 * Helper function to create a proxies.txt file with sample content
 */
export function createSampleProxiesFile(): void {
  const sampleContent = `# Proxy format examples:
# http://username:password@hostname:port
# http://hostname:port
# socks5://hostname:port
http://example-proxy.com:8080
socks5://proxy2.example.com:1080`;

  const filePath = path.join(process.cwd(), 'proxies.txt');
  
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, sampleContent);
    console.log(`Created sample proxies.txt file at ${filePath}`);
    console.log('Please edit this file to add your actual proxies.');
  }
}