/**
 * Типы сущности "Транзакция" (FSD entities)
 */

export interface Transaction {
  id: string;
  title: string;
  category: string;
  account: string;
  amount: string;
  recurring: boolean;
  anomaly: boolean;
  split: string[] | null;
}

export interface TransactionGroup {
  day: string;
  items: Transaction[];
}
