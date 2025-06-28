import React, { useState, useEffect } from 'react';
import { Category } from '../types';
import { X, ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react';

interface CategoryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (categories: Category[], deletedCategoryIds: number[]) => void;
  categories: Category[];
}

export const CategoryEditModal: React.FC<CategoryEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categories
}) => {
  const [editedCategories, setEditedCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [nextTempId, setNextTempId] = useState<number>(-1); // 一時的なIDは負の値を使用
  const [deletedCategoryIds, setDeletedCategoryIds] = useState<number[]>([]); // 削除対象の既存カテゴリID

  useEffect(() => {
    if (isOpen) {
      // カテゴリをdisplay_orderで昇順ソート
      const sortedCategories = [...categories].sort((a, b) => a.display_order - b.display_order);
      setEditedCategories(sortedCategories);
      setNewCategoryName('');
      setDeletedCategoryIds([]); // 削除対象IDをリセット
      // 一時的なIDの初期値を設定（既存のIDと重複しないように負の値から開始）
      setNextTempId(-1);
    }
  }, [isOpen, categories]);

  if (!isOpen) return null;

  const moveUp = (index: number) => {
    if (index === 0) return; // 一番上の場合は何もしない
    
    const newCategories = [...editedCategories];
    [newCategories[index], newCategories[index - 1]] = [newCategories[index - 1], newCategories[index]];
    setEditedCategories(newCategories);
  };

  const moveDown = (index: number) => {
    if (index === editedCategories.length - 1) return; // 一番下の場合は何もしない
    
    const newCategories = [...editedCategories];
    [newCategories[index], newCategories[index + 1]] = [newCategories[index + 1], newCategories[index]];
    setEditedCategories(newCategories);
  };

  const handleNameChange = (index: number, newName: string) => {
    const newCategories = [...editedCategories];
    newCategories[index] = { ...newCategories[index], name: newName };
    setEditedCategories(newCategories);
  };

  const addNewCategory = () => {
    if (!newCategoryName.trim()) {
      return; // 空欄の場合は何もしない
    }

    const newCategory: Category = {
      id: nextTempId, // 一時的なID（負の値）
      name: newCategoryName.trim(),
      parent_id: undefined,
      display_order: 1 // 先頭に表示されるように小さい値
    };

    // カテゴリ一覧の先頭に追加
    setEditedCategories([newCategory, ...editedCategories]);
    setNewCategoryName(''); // 入力欄をクリア
    setNextTempId(nextTempId - 1); // 次の一時的IDを準備
  };

  const deleteCategory = (index: number) => {
    const categoryToDelete = editedCategories[index];
    
    if (categoryToDelete.id >= 0) {
      // 既存カテゴリの場合は削除対象IDに追加
      setDeletedCategoryIds([...deletedCategoryIds, categoryToDelete.id]);
    }
    // 新規追加カテゴリ（負のID）の場合は単に一覧から削除

    // 表示一覧から削除
    const newCategories = editedCategories.filter((_, i) => i !== index);
    setEditedCategories(newCategories);
  };

  const handleSave = () => {
    // 空欄チェック
    const hasEmptyName = editedCategories.some(category => !category.name.trim());
    if (hasEmptyName) {
      alert('カテゴリ名が空欄のものがあります。すべてのカテゴリ名を入力してください。');
      return;
    }

    // display_orderを新しい順序で更新
    const updatedCategories = editedCategories.map((category, index) => ({
      ...category,
      display_order: (index + 1) * 100 // 100, 200, 300... のように設定
    }));

    // デバッグログ
    console.log('CategoryEditModal - handleSave:', {
      updatedCategories: updatedCategories.length,
      deletedCategoryIds,
      categories: updatedCategories.map(c => ({ id: c.id, name: c.name }))
    });

    onSave(updatedCategories, deletedCategoryIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">カテゴリ編集</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="mb-3">
            <p className="text-sm text-gray-600">
              カテゴリの名前を編集し、上下ボタンで表示順序を変更できます。
            </p>
          </div>
          
          {/* 新しいカテゴリ追加フォーム */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="新しいカテゴリ名を入力"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="button"
                onClick={addNewCategory}
                disabled={!newCategoryName.trim()}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
                  newCategoryName.trim()
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                title="カテゴリを追加"
              >
                <Plus className="w-4 h-4" />
                追加
              </button>
            </div>
          </div>
          
          <div className="space-y-1">
            {editedCategories.map((category, index) => (
              <div 
                key={category.id} 
                className={`flex items-center gap-2 py-1 px-2 border rounded ${
                  category.id < 0 
                    ? 'border-green-200 bg-green-50' // 新規追加カテゴリ
                    : 'border-gray-200'               // 既存カテゴリ
                }`}
              >
                <button
                  type="button"
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className={`p-1 rounded ${
                    index === 0 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="上に移動"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                
                <button
                  type="button"
                  onClick={() => moveDown(index)}
                  disabled={index === editedCategories.length - 1}
                  className={`p-1 rounded ${
                    index === editedCategories.length - 1 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="下に移動"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
                
                <div className="flex-1">
                  <input
                    type="text"
                    value={category.name}
                    onChange={(e) => handleNameChange(index, e.target.value)}
                    required
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    placeholder="カテゴリ名"
                  />
                </div>
                
                <button
                  type="button"
                  onClick={() => deleteCategory(index)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="カテゴリを削除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded text-sm font-medium transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
          >
            変更
          </button>
        </div>
      </div>
    </div>
  );
};
