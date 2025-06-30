import React, { useState, useMemo } from 'react';
import { PartWithInventory, Environment, Category } from '../types';
import { ExternalLink, Info, Edit, Trash2, ArrowUpDown } from 'lucide-react';
import { createCategoryMap, getCategoryNameFromMap, getCategoryDisplayOrderFromMap } from '../utils/categoryUtils';

interface PartsTableProps {
  parts: PartWithInventory[];
  environment: Environment;
  categories: Category[];
  showCategoryColumn?: boolean; // キーワード検索時にカテゴリ列を表示するかどうか
  onQuantityChange: (partId: number, quantity: number) => void;
  onPartDetail: (part: PartWithInventory) => void;
  onPartEdit: (part: PartWithInventory) => void;
  onPartDelete: (partId: number) => void;
}

type SortField = 'quantity' | 'name' | 'part_number' | 'package' | 'logic_family' | 'description' | 'category';
type SortDirection = 'asc' | 'desc';

export const PartsTable: React.FC<PartsTableProps> = ({
  parts,
  environment,
  categories,
  showCategoryColumn = false,
  onQuantityChange,
  onPartDetail,
  onPartEdit,
  onPartDelete
}) => {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // パフォーマンス最適化: カテゴリをMapに変換
  const categoryMap = useMemo(() => createCategoryMap(categories), [categories]);

  const getCategoryName = (categoryId?: number): string => {
    return getCategoryNameFromMap(categoryMap, categoryId);
  };

  const getCategoryDisplayOrder = (categoryId?: number): number => {
    return getCategoryDisplayOrderFromMap(categoryMap, categoryId);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedParts = [...parts].sort((a, b) => {
    if (sortField === 'quantity') {
      const aValue = a.quantity;
      const bValue = b.quantity;
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    } else if (sortField === 'category') {
      const aValue = getCategoryDisplayOrder(a.category_id);
      const bValue = getCategoryDisplayOrder(b.category_id);
      // デバッグ用（開発環境でのみ）
      if (import.meta.env.DEV) {
        console.log(`Sorting categories: Part A (${a.name}) order: ${aValue}, Part B (${b.name}) order: ${bValue}, Direction: ${sortDirection}`);
      }
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    } else {
      let aValue = a[sortField as keyof PartWithInventory] || '';
      let bValue = b[sortField as keyof PartWithInventory] || '';
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    }
  });

  const SortHeader: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="w-3 h-3" />
      </div>
    </th>
  );

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortHeader field="quantity">在庫数</SortHeader>
              <SortHeader field="name">パーツ名</SortHeader>
              <SortHeader field="part_number">型番</SortHeader>
              <SortHeader field="package">外形</SortHeader>
              <SortHeader field="logic_family">タイプ</SortHeader>
              <SortHeader field="description">詳細</SortHeader>
              {showCategoryColumn && (
                <SortHeader field="category">カテゴリ</SortHeader>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedParts.map((part) => (
              <tr key={part.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap">
                  {environment === 'local' ? (
                    <input
                      type="number"
                      min="0"
                      value={part.quantity}
                      onChange={(e) => onQuantityChange(part.id, parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <span className="text-sm font-medium text-gray-900">{part.quantity}</span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {part.datasheet_url ? (
                    <a
                      href={part.datasheet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                    >
                      {part.name}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-sm font-medium text-gray-900">{part.name}</span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {part.part_number || '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {part.package || '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {part.logic_family || '-'}
                </td>
                <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate">
                  {part.description || '-'}
                </td>
                {showCategoryColumn && (
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getCategoryName(part.category_id)}
                  </td>
                )}
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onPartDetail(part)}
                      className="text-blue-600 hover:text-blue-800"
                      title="詳細表示"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    {environment === 'local' && (
                      <>
                        <button
                          onClick={() => onPartEdit(part)}
                          className="text-green-600 hover:text-green-800"
                          title="編集"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onPartDelete(part.id)}
                          className="text-red-600 hover:text-red-800"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
