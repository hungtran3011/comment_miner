import Axios from 'axios';
import * as cheerio from 'cheerio';
import ReviewOutputModel from './review_output_model';

const itemsPerPage = 50;
const languages = ['english', 'vietnamese'];

export async function* getSteamReview(gameId: string): AsyncGenerator<ReviewOutputModel[]> {
  const baseUrl = `https://steamcommunity.com/app/${gameId}/reviews/homecontent/`;

  // Iterate through each language
  for (const language of languages) {
    let cursor = '*';
    let pageIndex = 1;
    let userreviewsoffset = 0;

    while (true) {
      const params = new URLSearchParams({
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
      });

      const response = await Axios.get(`${baseUrl}?${params}`);
      const data = response.data;

      if (typeof data !== 'string') {
        throw new Error('Expected HTML content to be a string');
      }

      const $ = cheerio.load(data);
      const reviews = $('.apphub_Card')
        .map((_, element) => {
          const $element = $(element);
          const detailsElement = $element.find('.apphub_CardTextContent');
          let details = detailsElement.clone().children().remove().end().text().trim();

          // Remove truncate pattern
          details = details.replace(/\n\s+/g, ' ');

          if (!details) {
            return null;
          }

          return {
            item_id: gameId,
            state: $element.find('.title').text().trim() === "Recommended",
            details,
            username: $element.find('.apphub_CardContentAuthorName').text().trim()
          };
        })
        .get()
        .filter(Boolean) as ReviewOutputModel[];

      yield reviews;

      // Update the cursor and page index for the next page
      const nextCursor = $('input[name="userreviewscursor"]').val();
      console.log(nextCursor);
      if (!nextCursor || nextCursor === cursor) {
        break;
      }
      cursor = nextCursor;
      userreviewsoffset += itemsPerPage;
      pageIndex++;
    }
  }
}