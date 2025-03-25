import { createClient } from "@supabase/supabase-js";
import { Database } from "../models/database.types";

import 'dotenv/config';

// console.log(process.env);

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

// console.log(supabaseUrl, supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_*_KEY");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
export const supabaseService = createClient<Database>(supabaseUrl, supabaseServiceKey);
