import express from 'express';
import {getSteamReview} from './crawlers/steamcrawler';

const app = express();
const port = 3000;

app.get('/', async (req, res): Promise<void> =>{
  let info = await getSteamReview("1693980");
  res.send(info);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});