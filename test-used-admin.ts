import { supabase } from "./services/supabaseClient";

async function run() {
  const { data: inv, error } = await supabase.from("invites").select("*, profiles!used_by(display_name)").limit(10);
  console.log("Data:", JSON.stringify(inv, null, 2), "Error:", error);
}
run();
