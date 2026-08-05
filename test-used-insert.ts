import { supabase } from "./services/supabaseClient";

async function run() {
  const { data: profiles, error: pErr } = await supabase.from("profiles").select("*").limit(1);
  if (profiles && profiles.length > 0) {
    const profile = profiles[0];
    const { data: invs, error: iErr } = await supabase.from("invites").select("*").limit(1);
    if (invs && invs.length > 0) {
      const inv = invs[0];
      await supabase.from("invites").update({ used_by: profile.user_id, uses: 1 }).eq("id", inv.id);
      const { data } = await supabase.from("invites").select("*, profiles!used_by(display_name)").eq("id", inv.id);
      console.log("Updated Data:", JSON.stringify(data, null, 2));
    }
  } else {
    console.log("No profiles found", pErr);
  }
}
run();
