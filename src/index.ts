import express from 'express';
import path from 'path';
// import 'dotenv/config';
import { getSteamReview } from './crawlers/steamcrawler';
import { promises as fs } from 'fs';
import { PlayStoreCrawler } from './crawlers/playcrawler';

// console.log(process.env);

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/steam', async (req, res): Promise<void> => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const steamIds = (await fs.readFile('steam-to-crawl.txt', 'utf-8')).split('\n');
    res.write(`data: ${JSON.stringify({ status: 'beginning' })}\n\n`);
    // console.log(steamIds)
    for (const steamId of steamIds) {
      // console.log("game id: ", steamId);
      if (!steamId.trim()) continue;
      res.write(`data: ${JSON.stringify({ status: 'crawling', id: steamId })}\n\n`);
      const reviewGenerator = await getSteamReview(steamId);
      const reviews = [];
      for await (const batch of reviewGenerator) {
        reviews.push(...batch);
      }

      res.write(`data: ${JSON.stringify({ status: 'uploading', id: steamId })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ status: 'finish' })}\n\n`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.write(`data: ${JSON.stringify({ status: 'error', message: errorMessage })}\n\n`);
  } finally {
    res.end();
  }
});

app.get("/play-store", async (req, res): Promise<void> => {
  let crawler = new PlayStoreCrawler();
  crawler.init().then(() => {
    crawler.crawlPlayStoreReviews().then((result) => {
      res.send("Crawling done");
      crawler.saveReviewsToCsv(result);
    });
  });
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});