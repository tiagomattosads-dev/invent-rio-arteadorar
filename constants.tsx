
import { Category, Item } from './types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: '1', name: 'Figurinos' },
  { id: '2', name: 'Cenários' },
  { id: '3', name: 'Acessórios' },
  { id: '4', name: 'Maquiagem' },
];

export const INITIAL_ITEMS: Item[] = [
  {
    id: 'item-1',
    name: 'Túnica Romana Branca',
    categoryId: '1',
    code: 'FIG-001',
    quantity: 5,
    condition: 'Bom',
    location: 'Prateleira A2',
    imageUrl: 'https://picsum.photos/seed/tunica/400/400',
    status: 'Disponível'
  },
  {
    id: 'item-2',
    name: 'Cajado de Madeira',
    categoryId: '2',
    code: 'CEN-042',
    quantity: 2,
    condition: 'Novo',
    location: 'Canto dos Cenários',
    imageUrl: 'https://picsum.photos/seed/cajado/400/400',
    status: 'Disponível'
  }
];

export const MINISTRIES = [
  'Teatro',
  'Dança',
  'Louvor',
  'Infantil',
  'Jovens',
  'Missões',
  'Som e Imagem',
  'Outro'
];

export const CONDITIONS: { label: string; value: 'Novo' | 'Bom' | 'Avariado' }[] = [
  { label: 'Novo', value: 'Novo' },
  { label: 'Bom / OK', value: 'Bom' },
  { label: 'Avariado', value: 'Avariado' }
];
