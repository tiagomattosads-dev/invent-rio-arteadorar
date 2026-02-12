export type ItemStatus = 'Disponível' | 'Emprestado';
export type ItemCondition = 'Novo' | 'Bom' | 'Avariado';
export type LoanStatus = 'Ativo' | 'Concluído';

export interface Category {
  id: string;
  name: string;
}

export interface Item {
  id: string;
  name: string;
  categoryId: string;
  code: string;
  quantity: number;
  condition: ItemCondition;
  location: string;
  imageUrl?: string;
  observations?: string;
  status: ItemStatus;
}

export interface Loan {
  id: string;
  itemId: string;
  itemName: string; // Denormalized for easy viewing
  borrowerName: string;
  ministry: string;
  reason: string;
  loanDate: string;
  dueDate: string;
  returnDate?: string;
  returnCondition?: ItemCondition;
  consent: boolean;
  borrowerPhoto: string; // base64
  signature: string; // base64
  status: LoanStatus;
}

export type ViewType = 'inventory' | 'loans' | 'categories' | 'settings';
