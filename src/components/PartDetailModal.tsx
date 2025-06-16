import React from 'react';
import { PartWithInventory } from '../types';
import { X, ExternalLink } from 'lucide-react';

interface PartDetailModalProps {
  part: PartWithInventory | null;
  isOpen: boolean;
  onClose: () => void;
  categories: Array<{ id: number; name: string }>;
}

export const PartDetailModal: React.FC<PartDetailModalProps> = ({
  part,
  isOpen,
  onClose,
  categories
}) => {
  if (!isOpen || !part) return null;

  // カテゴリIDからカテゴリ名を取得
  const getCategoryName = (categoryId: number | undefined) => {
    if (!categoryId) return 'Unknown';
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  const categoryDisplay = part.category_id 
    ? `${part.category_id} (${getCategoryName(part.category_id)})`
    : 'Not specified';

  const fields = [
    { label: 'ID', value: part.id },
    { label: 'パーツ名', value: part.name },
    { label: 'カテゴリ', value: categoryDisplay },
    { label: 'メーカー', value: part.manufacturer },
    { label: '型番', value: part.part_number },
    { label: 'パッケージ', value: part.package },
    { label: '耐圧', value: part.voltage_rating },
    { label: '電流定格', value: part.current_rating },
    { label: '電力定格', value: part.power_rating },
    { label: '許容誤差', value: part.tolerance },
    { label: 'タイプ', value: part.logic_family },
    { label: '説明', value: part.description },
    { label: 'データシートURL', value: part.datasheet_url, isUrl: true },
    { label: '在庫数', value: part.quantity },
    { label: '保管場所', value: part.location },
    { label: '作成日時', value: part.created_at }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">パーツ詳細情報</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => (
              <div key={field.label} className="border-b border-gray-200 pb-2">
                <dt className="text-sm font-medium text-gray-500">{field.label}</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {field.isUrl && field.value ? (
                    <a
                      href={field.value as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      {field.value}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    field.value || '-'
                  )}
                </dd>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-end p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
