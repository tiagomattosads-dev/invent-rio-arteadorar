
import { Category, Item, Loan } from '../types';

const STORAGE_KEYS = {
  CATEGORIES: 'acervo_categories',
  ITEMS: 'acervo_items',
  LOANS: 'acervo_loans',
  THEME: 'acervo_theme'
};

export const storageService = {
  saveCategories: (categories: Category[]) => {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  },
  getCategories: (): Category[] | null => {
    const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    return data ? JSON.parse(data) : null;
  },

  saveItems: (items: Item[]) => {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
  },
  getItems: (): Item[] | null => {
    const data = localStorage.getItem(STORAGE_KEYS.ITEMS);
    return data ? JSON.parse(data) : null;
  },

  saveLoans: (loans: Loan[]) => {
    localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(loans));
  },
  getLoans: (): Loan[] | null => {
    const data = localStorage.getItem(STORAGE_KEYS.LOANS);
    return data ? JSON.parse(data) : null;
  },

  saveTheme: (theme: 'light' | 'dark') => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },
  getTheme: (): 'light' | 'dark' | null => {
    return localStorage.getItem(STORAGE_KEYS.THEME) as 'light' | 'dark' | null;
  }
};
