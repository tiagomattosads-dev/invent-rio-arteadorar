
import { supabase } from "./supabaseClient";

export const storageServiceSupabase = {
  async uploadImage(base64: string, folder: string): Promise<string> {
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    const path = `${folder}/${fileName}`;
    
    // Convert base64 to Blob
    const response = await fetch(base64);
    const blob = await response.blob();

    const { data, error } = await supabase.storage
      .from("inventory")
      .upload(path, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600'
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from("inventory")
      .getPublicUrl(path);

    return publicUrl;
  }
};
