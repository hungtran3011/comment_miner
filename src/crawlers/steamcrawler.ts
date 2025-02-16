import Axios from 'axios';
import * as cheerio from 'cheerio';

import ReviewOutputModel from './review_output_model';

interface SteamReview {
  success: number;
  html: string;
  review_score: number;
  dayrange: number;
  start_date: number;
  end_date: number;
  recommendationids: number[];
  cursor: string;
}

export async function getSteamReview(gameId: string): Promise<ReviewOutputModel[]> {
  const response = await Axios.get(`https://store.steampowered.com/appreviews/${gameId}??use_review_quality=1&cursor=*&day_range=30&start_date=-1&end_date=-1&date_range_type=all&filter=summary&language=all&l=english&review_type=all&purchase_type=all&playtime_filter_min=0&playtime_filter_max=0&playtime_type=all&filter_offtopic_activity=1`)
  const data: SteamReview = response.data;
  const $ = cheerio.load(data.html);
  
  const reviews: ReviewOutputModel[] = [];
  
  // Process each review div
  $('.review_box').each((_, element) => {
    const reviewElement = $(element);
    const state = reviewElement.find('.title').text().trim();
    const details = reviewElement.find('.content').text().trim();
    const username = reviewElement.find('.persona_name').text().trim();
    const item_id = `https://store.steampowered.com/appreviews/${gameId}`;
    // Check if the text is in English or Vietnamese using regex
    const isEnglishOrVietnamese = /^[a-zA-Z\s.,!?'"\-0-9\u00C0-\u024F\u0300-\u036f\u0041-\u005A\u0061-\u007A\u00C0-\u00FF\u1EA0-\u1EF9]+$/u.test(details);
    
    if (isEnglishOrVietnamese) {
      reviews.push({
      item_id: item_id,
      state: state === "Recommended",
      details: details,
      username: username
      });
    }
  });

  return reviews;
}