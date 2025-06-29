import { Category } from '../types';

/**
 * カテゴリIDからカテゴリ名を取得するユーティリティ関数
 */
export const getCategoryName = (categories: Category[], categoryId?: number): string => {
  if (!categoryId) return '-';
  const category = categories.find(cat => cat.id === categoryId);
  return category ? category.name : '-';
};

/**
 * カテゴリIDからカテゴリの表示順序を取得するユーティリティ関数
 */
export const getCategoryDisplayOrder = (categories: Category[], categoryId?: number): number => {
  if (!categoryId) return 999999; // 未設定のカテゴリは最後に表示
  const category = categories.find(cat => cat.id === categoryId);
  return category ? category.display_order : 999999;
};

/**
 * パフォーマンス最適化用: カテゴリをMapに変換
 */
export const createCategoryMap = (categories: Category[]): Map<number, Category> => {
  const map = new Map<number, Category>();
  categories.forEach(category => {
    map.set(category.id, category);
  });
  return map;
};

/**
 * Mapを使用した高速なカテゴリ名取得
 */
export const getCategoryNameFromMap = (categoryMap: Map<number, Category>, categoryId?: number): string => {
  if (!categoryId) return '-';
  const category = categoryMap.get(categoryId);
  return category ? category.name : '-';
};

/**
 * Mapを使用した高速なカテゴリ表示順序取得
 */
export const getCategoryDisplayOrderFromMap = (categoryMap: Map<number, Category>, categoryId?: number): number => {
  if (!categoryId) return 999999; // 未設定のカテゴリは最後に表示
  const category = categoryMap.get(categoryId);
  return category ? category.display_order : 999999;
};
