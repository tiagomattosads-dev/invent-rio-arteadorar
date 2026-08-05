import { supabase } from "./services/supabaseClient";

async function run() {
  const code = "ANYCODE";
  const { data, error } = await supabase.from("invites").select("*").eq("code", code).maybeSingle();
  console.log("Data:", data, "Error:", error);
}
run();
