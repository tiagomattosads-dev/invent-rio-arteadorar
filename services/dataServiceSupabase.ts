
import { supabase } from "./supabaseClient";
import { Category, Item, Loan, Profile, Invite } from "../types";

export const dataServiceSupabase = {
  // Profiles
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
  async createProfile(profile: Profile): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .upsert([profile])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async listProfiles(): Promise<Profile[]> {
    const { data, error } = await supabase.from("profiles").select("*").order("display_name");
    if (error) throw error;
    return data || [];
  },
  async updateProfile(userId: string, updates: Partial<Profile>) {
    const { error } = await supabase.from("profiles").update(updates).eq("user_id", userId);
    if (error) throw error;
  },

  // Invites
  async listInvites(): Promise<Invite[]> {
    const { data, error } = await supabase.from("invites").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async validateInvite(code: string): Promise<Invite | null> {
    const { data, error } = await supabase
      .from("invites")
      .select("*")
      .eq("code", code)
      .single();
    if (error) return null;
    
    const now = new Date();
    if (data.uses >= data.max_uses) return null;
    if (data.expires_at && new Date(data.expires_at) < now) return null;
    
    return data;
  },
  async createInvite(invite: Partial<Invite>) {
    const { data, error } = await supabase.from("invites").insert([invite]).select().single();
    if (error) throw error;
    return data;
  },
  async deleteInvite(id: string) {
    const { error } = await supabase.from("invites").delete().eq("id", id);
    if (error) throw error;
  },
  async incrementInviteUses(code: string) {
    const { data: invite } = await supabase.from("invites").select("uses").eq("code", code).single();
    if (invite) {
      const { error } = await supabase.from("invites").update({ uses: invite.uses + 1 }).eq("code", code);
      if (error) throw error;
    }
  },

  // Categories
  async listCategories(): Promise<Category[]> {
    const { data, error } = await supabase.from("categories").select("*").order("name");
    if (error) throw error;
    return data || [];
  },
  async createCategory(name: string): Promise<Category> {
    const { data, error } = await supabase.from("categories").insert([{ name }]).select().single();
    if (error) throw error;
    return data;
  },
  async deleteCategory(id: string) {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw error;
  },

  // Items
  async listItems(): Promise<Item[]> {
    const { data, error } = await supabase.from("items").select("*").order("name");
    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      categoryId: item.category_id,
      imageUrl: item.image_url
    }));
  },
  async createItem(item: Partial<Item>): Promise<Item> {
    const { data, error } = await supabase.from("items").insert([{
      name: item.name,
      category_id: item.categoryId,
      code: item.code,
      quantity: item.quantity,
      condition: item.condition,
      location: item.location,
      image_url: item.imageUrl,
      observations: item.observations,
      status: item.status
    }]).select().single();
    
    if (error) throw error;
    
    return {
      ...data,
      categoryId: data.category_id,
      imageUrl: data.image_url
    } as Item;
  },
  async updateItem(id: string, item: Partial<Item>) {
    const { error } = await supabase.from("items").update({
      name: item.name,
      category_id: item.categoryId,
      code: item.code,
      quantity: item.quantity,
      condition: item.condition,
      location: item.location,
      image_url: item.imageUrl,
      observations: item.observations,
      status: item.status
    }).eq("id", id);
    if (error) throw error;
  },
  async deleteItem(id: string) {
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) throw error;
  },

  // Loans
  async listLoans(): Promise<Loan[]> {
    const { data, error } = await supabase.from("loans").select("*").order("loan_date", { ascending: false });
    if (error) throw error;
    return (data || []).map(loan => ({
      ...loan,
      itemId: loan.item_id,
      itemName: loan.item_name,
      borrowerName: loan.borrower_name,
      loanDate: loan.loan_date,
      dueDate: loan.due_date,
      returnDate: loan.return_date,
      returnCondition: loan.return_condition,
      borrowerPhoto: loan.borrower_photo_url,
      signature: loan.signature_url
    }));
  },
  async createLoan(loan: Partial<Loan>) {
    const { data, error } = await supabase.from("loans").insert([{
      item_id: loan.itemId,
      item_name: loan.itemName,
      borrower_name: loan.borrowerName,
      ministry: loan.ministry,
      reason: loan.reason,
      loan_date: loan.loanDate,
      due_date: loan.dueDate,
      consent: loan.consent,
      borrower_photo_url: loan.borrowerPhoto,
      signature_url: loan.signature,
      status: loan.status
    }]).select().single();
    if (error) throw error;
    return data;
  },
  async updateLoan(id: string, updates: Partial<Loan>) {
    const { error } = await supabase.from("loans").update({
      status: updates.status,
      return_date: updates.returnDate,
      return_condition: updates.returnCondition
    }).eq("id", id);
    if (error) throw error;
  }
};
