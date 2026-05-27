export enum AccountType {
  ASSET = "ASSET",
  EXPENSE = "EXPENSE",
  LIABILITY = "LIABILITY",
  EQUITY = "EQUITY",
  INCOME = "INCOME"
}
export class Account {
  constructor(id: number,parentId: number,  name: string, type: AccountType) {
    this.id = id;
    this.parentId = parentId;
    this.name = name;
    this.type = type;
  }

  id: number; 
  parentId?: number;
  name: string;
  type: AccountType;
}
