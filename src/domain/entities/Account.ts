export enum AccountType {
  ASSET = "ASSET",
  EXPENSE = "EXPENSE",
  LIABILITY = "LIABILITY",
  EQUITY = "EQUITY",
  INCOME = "INCOME"
}
export class Account {
  constructor(id: number, name: string, type: AccountType, parentId?: number) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.parentId = parentId;
  }

  id: number; 
  name: string;
  type: AccountType;
  parentId?: number | undefined;
}
