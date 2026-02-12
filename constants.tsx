
import { Category, Item } from './types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: '1', name: 'Figurinos' },
  { id: '2', name: 'Cenários' },
  { id: '3', name: 'Acessórios' },
  { id: '4', name: 'Maquiagem' },
];

export const INITIAL_ITEMS: Item[] = [];

export const MINISTRIES = [
  'Teatro',
  'Dança',
  'Louvor',
  'Infantil',
  'Jovens',
  'Rede de Família',
  'Rede de Casais',
  'Rede de Homens',
  'Rede de Mulheres',
  'Mídia',
  'Outro'
];

export const CONDITIONS: { label: string; value: 'Novo' | 'Boas Condições' | 'Danificado' }[] = [
  { label: 'Novo', value: 'Novo' },
  { label: 'Boas Condições', value: 'Boas Condições' },
  { label: 'Danificado', value: 'Danificado' }
];

export const SUPABASE_URL = "https://axsubnfcrwgxiusuuncs.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_wM5ouSjUiOPtjeYbt-fjWg_BQY_QJ8s";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4c3VibmZjcndneGl1c3V1bmNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDcwNzQsImV4cCI6MjA4NjQ4MzA3NH0.yWsiIJAz-AHmpNvEP58yqBqWx83wn5oI1FZJVVh5434";
