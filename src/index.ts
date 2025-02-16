import express from 'express';
import path from 'path';
import { getSteamReview } from './crawlers/steamcrawler';

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, '../public')));

app.get('/', async (req, res): Promise<void> => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  for await (const pageReviews of getSteamReview("1693980")) {
    res.write(`data: ${JSON.stringify(pageReviews)}\n\n`);
  }

  res.write('event: end\n');
  res.write('data: End of reviews\n\n');
  res.end();
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});