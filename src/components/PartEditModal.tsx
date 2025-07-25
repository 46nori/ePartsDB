import React, { useState } from 'react';
import { PartWithInventory } from '../types';
import { X, Save } from 'lucide-react';

interface PartEditModalProps {
  part: PartWithInventory | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (partId: number, updatedPart: Partial<PartWithInventory>) => void;
  categories: Array<{ id: number; name: string }>;
}

export const PartEditModal: React.FC<PartEditModalProps> = ({
  part,
  isOpen,
  onClose,
  onSave,
  categories
}) => {
  const [formData, setFormData] = useState<Partial<PartWithInventory>>({});

  React.useEffect(() => {
    if (part) {
      setFormData({
        name: part.name || '',
        category_id: part.category_id || 0,
        manufacturer: part.manufacturer || '',
        part_number: part.part_number || '',
        package: part.package || '',
        voltage_rating: part.voltage_rating || '',
        current_rating: part.current_rating || '',
        power_rating: part.power_rating || '',
        tolerance: part.tolerance || '',
        logic_family: part.logic_family || '',
        description: part.description || '',
        datasheet_url: part.datasheet_url || '',
        location: part.location || '',
        purchase_date: part.purchase_date || '',
        shop: part.shop || '',
        shop_url: part.shop_url || '',
        price_per_unit: part.price_per_unit || 0,
        currency: part.currency || 'JPY',
        memo: part.memo || ''
      });
    }
  }, [part]);

  if (!isOpen || !part) return null;

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(part.id, formData);
    onClose();
  };

  const formFields = [
    { key: 'name', label: 'パーツ名', type: 'text', required: true },
    { key: 'category_id', label: 'カテゴリ', type: 'select', required: true },
    { key: 'manufacturer', label: 'メーカー', type: 'text' },
    { key: 'part_number', label: '型番', type: 'text' },
    { key: 'package', label: 'パッケージ', type: 'text' },
    { key: 'voltage_rating', label: '耐圧', type: 'text' },
    { key: 'current_rating', label: '電流定格', type: 'text' },
    { key: 'power_rating', label: '電力定格', type: 'text' },
    { key: 'tolerance', label: '許容誤差', type: 'text' },
    { key: 'logic_family', label: 'タイプ', type: 'text' },
    { key: 'description', label: '説明', type: 'textarea' },
    { key: 'datasheet_url', label: 'データシートURL', type: 'url', fullWidth: true },
    { key: 'price_per_unit', label: '単価', type: 'number' },
    { key: 'currency', label: '通貨', type: 'select' },
    { key: 'shop', label: '購入先', type: 'text' },
    { key: 'shop_url', label: '購入先URL', type: 'url', fullWidth: true },
    { key: 'purchase_date', label: '購入日', type: 'date' },
    { key: 'location', label: '保管場所', type: 'text' },
    { key: 'memo', label: '購入メモ', type: 'textarea' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">パーツ編集</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formFields.map((field) => (
                <div key={field.key} className={
                  field.type === 'textarea' ? 'md:col-span-2' : 
                  field.fullWidth ? 'md:col-span-2' : ''
                }>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </label>
                  
                  {field.type === 'select' ? (
                    field.key === 'category_id' ? (
                      <select
                        value={formData[field.key as keyof PartWithInventory] || ''}
                        onChange={(e) => handleInputChange(field.key, parseInt(e.target.value))}
                        required={field.required}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">カテゴリを選択</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    ) : field.key === 'currency' ? (
                      <select
                        value={formData[field.key as keyof PartWithInventory] || 'JPY'}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="JPY">日本円 (JPY)</option>
                        <option value="USD">米ドル (USD)</option>
                        <option value="EUR">ユーロ (EUR)</option>
                        <option value="CNY">人民元 (CNY)</option>
                      </select>
                    ) : null
                  ) : field.type === 'textarea' ? (
                    <textarea
                      value={formData[field.key as keyof PartWithInventory] || ''}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      required={field.required}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : field.type === 'number' ? (
                    <input
                      type="number"
                      min="0"
                      step={field.key === 'price_per_unit' ? '0.01' : '1'}
                      value={formData[field.key as keyof PartWithInventory] ?? ''}
                      onChange={(e) => handleInputChange(field.key, 
                        field.key === 'price_per_unit' 
                          ? parseFloat(e.target.value) || 0
                          : parseInt(e.target.value) || 0
                      )}
                      required={field.required}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={formData[field.key as keyof PartWithInventory] || ''}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      required={field.required}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 p-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
