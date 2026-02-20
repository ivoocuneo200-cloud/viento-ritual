import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ozeqbhulzivviqbjnfet.supabase.co";
const supabaseAnonKey = "sb_publishable_vCM9bqdscWC_dRvsjlQE7w_iH8Kb3Tr";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);