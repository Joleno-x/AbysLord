
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hnreytoezjyqxratxgto.supabase.co";

// A chave pública será configurada na próxima etapa.
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Chave pública do Supabase não configurada.");
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      flowType: "pkce",
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  }
);

