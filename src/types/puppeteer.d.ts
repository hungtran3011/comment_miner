import * as puppeteer from 'puppeteer';

// Extend the Page interface to include the $x method
declare module 'puppeteer' {
  interface Page {
    /**
     * The method evaluates the XPath expression.
     * @param expression XPath expression to evaluate.
     */
    $x(expression: string): Promise<puppeteer.ElementHandle[]>;
  }
}
