import React from 'react';
import { Environment } from '../types';
import { Undo, Download, Plus, Edit3 } from 'lucide-react';

interface ActionButtonsProps {
  environment: Environment;
  hasChanges: boolean;
  onUndo: () => void;
  onSync: () => void;
  onAddPart: () => void;
  onCategoryEdit: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  environment,
  hasChanges,
  onUndo,
  onSync,
  onAddPart,
  onCategoryEdit
}) => {
  if (environment === 'remote') {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onAddPart}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          パーツの追加
        </button>
        
        <button
          onClick={onCategoryEdit}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
        >
          <Edit3 className="w-4 h-4" />
          カテゴリ編集
        </button>
        
        {hasChanges && (
          <>
            <button
              onClick={onUndo}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              <Undo className="w-4 h-4" />
              取り消し
            </button>
            
            <button
              onClick={onSync}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              同期（ダウンロード）
            </button>
          </>
        )}
      </div>
      
      {hasChanges && (
        <p className="text-sm text-orange-600 mt-2">
          未保存の変更があります。「同期（ダウンロード）」ボタンでデータベースファイルをダウンロードしてください。
        </p>
      )}
    </div>
  );
};
