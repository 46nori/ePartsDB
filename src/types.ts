// データベースの型定義
export interface Category {
  id: number;
  name: string;
  parent_id?: number;
  display_order: number;
}

export interface Part {
  id: number;
  name: string;
  category_id?: number;
  manufacturer?: string;
  part_number?: string;
  package?: string;
  voltage_rating?: string;
  current_rating?: string;
  power_rating?: string;
  tolerance?: string;
  logic_family?: string;
  description?: string;
  datasheet_url?: string;
  created_at: string;
}

export interface Inventory {
  id: number;
  part_id: number;
  quantity: number;
  location?: string;
  purchase_date?: string;
  shop?: string;
  price_per_unit?: number;
  currency: string;
  memo?: string;
}

// パーツと在庫情報を結合した表示用の型
export interface PartWithInventory extends Part {
  quantity: number;
  location?: string;
  inventory_id?: number;
  purchase_date?: string;
  shop?: string;
  price_per_unit?: number;
  currency?: string;
  memo?: string;
}

// 環境判別用の型
export type Environment = 'local' | 'remote';

// 検索タブの型
export type SearchTab = 'category' | 'keyword';
