export interface LocalizedString {
  [languageCode: string]: string;
}

export interface Currency {
  Symbol: string;
  Name: LocalizedString;
}

export interface CurrenciesCollection {
  [currencyId: string]: Currency;
}

export interface Category {
  Id: string;
  ParentCategoryId: string | null;
  Name: LocalizedString;
}

export interface ItemPrice {
  Value: number;
  CurrencyId: string;
}

export interface MenuItem {
  Id: string;
  ParentCategoryId: string;
  Price: ItemPrice;
  Name: LocalizedString;
}

export interface MenuSchema {
  Currencies: CurrenciesCollection;
  Categories: Category[];
  Items: MenuItem[];
}
