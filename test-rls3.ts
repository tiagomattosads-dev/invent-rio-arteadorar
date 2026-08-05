import { supabase } from "./services/supabaseClient";

async function run() {
  const { data, error } = await supabase.rpc('validate_invite', { p_code: 'TEST' });
  console.log("RPC Data:", data, "Error:", error);
}
run();
