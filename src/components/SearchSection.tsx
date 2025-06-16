import React from 'react';
import { SearchTab } from '../types';
import { Search, Grid } from 'lucide-react';

interface SearchSectionProps {
  activeTab: SearchTab;
  onTabChange: (tab: SearchTab) => void;
  keyword: string;
  onKeywordChange: (keyword: string) => void;
  onSearch: () => void;
  categories: Array<{ id: number; name: string }>;
  onCategorySelect: (categoryId: number) => void;
  hasSearchResults?: boolean; // 検索結果があるかどうか
  onResetSearch?: () => void; // 検索状態をリセットする関数
}

export const SearchSection: React.FC<SearchSectionProps> = ({
  activeTab,
  onTabChange,
  keyword,
  onKeywordChange,
  onSearch,
  categories,
  onCategorySelect,
  hasSearchResults = false,
  onResetSearch
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex border-b mb-4">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'category'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => onTabChange('category')}
        >
          <Grid className="inline-block w-4 h-4 mr-2" />
          カテゴリ検索
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'keyword'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => onTabChange('keyword')}
        >
          <Search className="inline-block w-4 h-4 mr-2" />
          キーワード検索
        </button>
      </div>

      {activeTab === 'category' && (
        <div>
          {hasSearchResults && activeTab === 'category' ? (
            <div className="text-center">
              <button
                onClick={() => onResetSearch?.()}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                カテゴリ選択に戻る
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {categories.length > 0 ? (
                categories.map((category) => (
                  <button
                    key={category.id}
                    className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                    onClick={() => onCategorySelect(category.id)}
                  >
                    {category.name}
                  </button>
                ))
              ) : (
                <div className="col-span-full text-center text-gray-500 py-8">
                  カテゴリが見つかりません。
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'keyword' && (
        <div className="flex gap-3">
          <input
            type="text"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSearch()}
            placeholder="パーツ名、型番、メーカー、説明を検索..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={onSearch}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            検索
          </button>
        </div>
      )}
    </div>
  );
};
