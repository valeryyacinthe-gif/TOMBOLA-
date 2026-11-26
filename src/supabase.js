import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn("Les variables publiques Supabase ne sont pas encore configurées.");
}

export const supabase = createClient(url || "https://cukmutjbivazhlxpundm.supabase.co", key || "sb_publishable_tFzuwnNobrCJ53lmdLO40A__clBM-UX");
