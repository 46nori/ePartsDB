import React, { useEffect, useRef } from 'react';
import { PartWithInventory, Category } from '../types';
import { X, ExternalLink } from 'lucide-react';
import { getCategoryName } from '../utils/categoryUtils';

interface PartDetailModalProps {
  part: PartWithInventory | null;
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

export const PartDetailModal: React.FC<PartDetailModalProps> = ({
  part,
  isOpen,
  onClose,
  categories
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // キーボードイベントハンドラー
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'Enter') {
        // フォーカス可能な要素がない場合、Enterキーでも閉じる
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0 || 
            !Array.from(focusableElements).some(el => el === document.activeElement)) {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // モーダル要素にフォーカスを設定
    if (modalRef.current) {
      modalRef.current.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !part) return null;

  // カテゴリIDからカテゴリ名を取得
  const categoryDisplayName = getCategoryName(categories, part.category_id);

  const categoryDisplay = part.category_id 
    ? `${categoryDisplayName}(${part.category_id})`
    : 'Not specified';

  const basicFields = [
    { label: 'ID', value: part.id },
    { label: 'カテゴリ(ID)', value: categoryDisplay },
    { label: 'パーツ名', value: part.name },
    { label: 'メーカー', value: part.manufacturer },
    { label: '型番', value: part.part_number },
    { label: 'パッケージ', value: part.package },
    { label: '耐圧', value: part.voltage_rating },
    { label: '電流定格', value: part.current_rating },
    { label: '電力定格', value: part.power_rating },
    { label: '許容誤差', value: part.tolerance },
    { label: 'タイプ', value: part.logic_family },
    { label: '説明', value: part.description, isLongText: true },
    { label: 'データシートURL', value: part.datasheet_url, isUrl: true },
    { label: '在庫数', value: part.quantity },
    { label: '保管場所', value: part.location },
    { label: '作成日時', value: part.created_at }
  ];

  const purchaseFields = [
    { label: '購入先', value: part.shop },
    { label: '購入先URL', value: part.shop_url, isUrl: true },
    { label: '単価', value: part.price_per_unit ? `${part.price_per_unit} ${part.currency || 'JPY'}` : null },
    { label: '購入日', value: part.purchase_date },
    { label: '購入メモ', value: part.memo, isLongText: true }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        ref={modalRef}
        tabIndex={-1}
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto outline-none"
      >
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
          {/* 基本情報セクション */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">基本情報</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {basicFields.map((field) => (
                <div key={field.label} className={`border-b border-gray-200 pb-2 ${field.isUrl || field.isLongText ? 'md:col-span-2' : ''}`}>
                  <dt className="text-sm font-medium text-gray-500">{field.label}</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {field.isUrl && field.value ? (
                      <a
                        href={field.value as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-start gap-1 break-all"
                      >
                        <span className="break-all">{field.value}</span>
                        <ExternalLink className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      </a>
                    ) : field.isLongText && field.value ? (
                      <div className="break-words whitespace-pre-wrap">{field.value}</div>
                    ) : (
                      field.value || '-'
                    )}
                  </dd>
                </div>
              ))}
            </div>
          </div>

          {/* 購入情報セクション */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">購入情報</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {purchaseFields.map((field) => (
                <div key={field.label} className={`border-b border-gray-200 pb-2 ${field.isUrl || field.isLongText ? 'md:col-span-2' : ''}`}>
                  <dt className="text-sm font-medium text-gray-500">{field.label}</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {field.isUrl && field.value ? (
                      <a
                        href={field.value as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                      >
                        <span>{field.value}</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : field.isLongText && field.value ? (
                      <div className="break-words whitespace-pre-wrap">{field.value}</div>
                    ) : (
                      field.value || '-'
                    )}
                  </dd>
                </div>
              ))}
            </div>
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
