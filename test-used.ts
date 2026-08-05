import { supabase } from "./services/supabaseClient";

async function run() {
  const { data, error } = await supabase.from("invites").select("*, profiles!used_by(display_name)").not("used_by", "is", null).limit(10);
  console.log("Data:", JSON.stringify(data, null, 2), "Error:", error);
}
run();
