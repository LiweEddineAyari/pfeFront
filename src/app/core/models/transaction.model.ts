export interface Transaction {
  id: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  date: string;
  amount: number;
  type: 'debit' | 'credit';
}
