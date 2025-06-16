import React, { useState } from 'react';
import { PartWithInventory } from '../types';
import { X, Plus } from 'lucide-react';

interface PartAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newPart: Omit<PartWithInventory, 'id' | 'created_at'>) => void;
  categories: Array<{ id: number; name: string }>;
}

export const PartAddModal: React.FC<PartAddModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  categories
}) => {
  const [formData, setFormData] = useState<Omit<PartWithInventory, 'id' | 'created_at'>>({
    name: '',
    category_id: 0,
    manufacturer: '',
    part_number: '',
    package: '',
    voltage_rating: '',
    current_rating: '',
    power_rating: '',
    tolerance: '',
    logic_family: '',
    description: '',
    datasheet_url: '',
    quantity: 0,
    location: '',
    purchase_date: '',
    shop: '',
    price_per_unit: 0,
    currency: 'JPY',
    memo: ''
  });

  if (!isOpen) return null;

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 必須フィールドのチェック
    if (!formData.name || !formData.category_id) {
      alert('パーツ名とカテゴリは必須です。');
      return;
    }

    onAdd(formData);
    
    // フォームをリセット
    setFormData({
      name: '',
      category_id: 0,
      manufacturer: '',
      part_number: '',
      package: '',
      voltage_rating: '',
      current_rating: '',
      power_rating: '',
      tolerance: '',
      logic_family: '',
      description: '',
      datasheet_url: '',
      quantity: 0,
      location: '',
      purchase_date: '',
      shop: '',
      price_per_unit: 0,
      currency: 'JPY',
      memo: ''
    });
    
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
    { key: 'datasheet_url', label: 'データシートURL', type: 'url' },
    { key: 'quantity', label: '初期在庫数', type: 'number' },
    { key: 'location', label: '保管場所', type: 'text' },
    { key: 'purchase_date', label: '購入日', type: 'date' },
    { key: 'shop', label: '購入先', type: 'text' },
    { key: 'price_per_unit', label: '単価', type: 'number' },
    { key: 'currency', label: '通貨', type: 'select' },
    { key: 'memo', label: 'メモ', type: 'textarea' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">新規パーツ追加</h2>
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
                <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </label>
                  
                  {field.type === 'select' ? (
                    field.key === 'category_id' ? (
                      <select
                        value={formData[field.key as keyof typeof formData] || ''}
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
                        value={formData[field.key as keyof typeof formData] || 'JPY'}
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
                      value={formData[field.key as keyof typeof formData] || ''}
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
                      value={formData[field.key as keyof typeof formData] || ''}
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
                      value={formData[field.key as keyof typeof formData] || ''}
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
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              追加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
