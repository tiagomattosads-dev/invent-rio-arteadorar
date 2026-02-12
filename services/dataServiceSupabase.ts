
import { supabase } from "./supabaseClient";
import { Category, Item, Loan } from "../types";

export const dataServiceSupabase = {
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
  async createItem(item: Partial<Item>) {
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
    return data;
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
