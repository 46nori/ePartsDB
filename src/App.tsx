import { useState, useEffect } from 'react';
import { SearchSection } from './components/SearchSection';
import { PartsTable } from './components/PartsTable';
import { PartDetailModal } from './components/PartDetailModal';
import { PartEditModal } from './components/PartEditModal';
import { PartAddModal } from './components/PartAddModal';
import { CategoryEditModal } from './components/CategoryEditModal';
import { ActionButtons } from './components/ActionButtons';
import { DatabaseManager } from './utils/database';
import { detectEnvironment } from './utils/environment';
import { PartWithInventory, Category, SearchTab, Environment } from './types';
import { Database, Server } from 'lucide-react';

function App() {
  const [dbManager] = useState(() => new DatabaseManager());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [environment] = useState<Environment>(() => detectEnvironment());
  const [categories, setCategories] = useState<Category[]>([]);
  const [parts, setParts] = useState<PartWithInventory[]>([]);
  const [activeTab, setActiveTab] = useState<SearchTab>('category');
  const [keyword, setKeyword] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedPart, setSelectedPart] = useState<PartWithInventory | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCategoryEditModalOpen, setIsCategoryEditModalOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        setIsLoading(true);
        await dbManager.initialize();
        loadData();
        setHasChanges(dbManager.getHasChanges());
        setIsLoading(false);
      } catch (err) {
        console.error('アプリケーションの初期化に失敗しました:', err);
        setError('アプリケーションの初期化に失敗しました。');
        setIsLoading(false);
      }
    };

    initApp();
  }, [dbManager]);

  const loadData = () => {
    setCategories(dbManager.getCategories());
    // 初期状態では結果を表示しない
    setParts([]);
  };

  const handleSearch = () => {
    if (activeTab === 'keyword') {
      setParts(dbManager.getPartsWithInventory(undefined, keyword));
      setSelectedCategoryId(null);
    }
  };

  const handleCategorySelect = (categoryId: number) => {
    setParts(dbManager.getPartsWithInventory(categoryId));
    setSelectedCategoryId(categoryId);
    setKeyword('');
    setActiveTab('category');
  };

  const handleResetSearch = () => {
    setParts([]);
    setSelectedCategoryId(null);
    setKeyword('');
  };

  const refreshSearchResults = () => {
    // 現在の検索条件に基づいて結果を再取得
    if (selectedCategoryId) {
      setParts(dbManager.getPartsWithInventory(selectedCategoryId));
    } else if (keyword && activeTab === 'keyword') {
      setParts(dbManager.getPartsWithInventory(undefined, keyword));
    }
    // どちらでもない場合は結果をクリアしない（現在の状態を維持）
  };

  const handleQuantityChange = (partId: number, quantity: number) => {
    if (environment === 'local') {
      dbManager.updateInventoryQuantity(partId, quantity);
      refreshSearchResults(); // 検索結果を維持して再取得
      setHasChanges(dbManager.getHasChanges());
    }
  };

  const handlePartDetail = (part: PartWithInventory) => {
    setSelectedPart(part);
    setIsDetailModalOpen(true);
  };

  const handlePartEdit = (part: PartWithInventory) => {
    setSelectedPart(part);
    setIsEditModalOpen(true);
  };

  const handlePartSave = (partId: number, updatedPart: Partial<PartWithInventory>) => {
    if (environment === 'local') {
      const success = dbManager.updatePart(partId, updatedPart);
      if (success) {
        refreshSearchResults(); // 検索結果を更新
        const newHasChanges = dbManager.getHasChanges();
        setHasChanges(newHasChanges);
      } else {
        alert('パーツの更新に失敗しました。');
      }
    }
  };

  const handlePartDelete = (partId: number) => {
    if (environment === 'local' && window.confirm('このパーツを削除してもよろしいですか？')) {
      const success = dbManager.deletePart(partId);
      if (success) {
        refreshSearchResults(); // 検索結果を更新
        const newHasChanges = dbManager.getHasChanges();
        setHasChanges(newHasChanges);
      } else {
        alert('パーツの削除に失敗しました。');
      }
    }
  };

  const handleAddPart = () => {
    if (environment === 'local') {
      setIsAddModalOpen(true);
    }
  };

  const handlePartAdd = (newPart: Omit<PartWithInventory, 'id' | 'created_at'>) => {
    if (environment === 'local') {
      const success = dbManager.addPart(newPart);
      if (success) {
        refreshSearchResults(); // 検索結果を更新
        const newHasChanges = dbManager.getHasChanges();
        setHasChanges(newHasChanges);
        setIsAddModalOpen(false);
      } else {
        alert('パーツの追加に失敗しました。');
      }
    }
  };

  const handleUndo = async () => {
    if (window.confirm('すべての変更を取り消してもよろしいですか？')) {
      await dbManager.resetDatabase();
      setCategories(dbManager.getCategories()); // カテゴリのみ更新
      refreshSearchResults(); // 検索結果を維持して再取得
      setHasChanges(dbManager.getHasChanges());
    }
  };

  const handleSync = async () => {
    try {
      const success = await dbManager.downloadDatabase();
      if (success) {
        // 同期処理完了後に状態を更新
        const newHasChanges = dbManager.getHasChanges();
        setHasChanges(newHasChanges);
      } else {
        alert('ダウンロードに失敗しました。');
      }
    } catch (error) {
      console.error('同期処理エラー:', error);
      alert('ダウンロードに失敗しました。');
    }
  };

  const handleTabChange = (tab: SearchTab) => {
    setActiveTab(tab);
    setKeyword('');
    setSelectedCategoryId(null);
  };

  const handleCategoryEdit = () => {
    setIsCategoryEditModalOpen(true);
  };

  const handleCategorySave = (updatedCategories: Category[], deletedCategoryIds: number[]) => {
    if (environment === 'local') {
      const success = dbManager.updateCategories(updatedCategories, deletedCategoryIds);
      if (success) {
        setCategories(dbManager.getCategories());
        refreshSearchResults();
        setHasChanges(dbManager.getHasChanges());
        setIsCategoryEditModalOpen(false);
      } else {
        alert('カテゴリの更新に失敗しました。');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Database className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">データベースを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Server className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                電子パーツ在庫管理システム
              </h1>
              <p className="text-gray-600 mt-2">
                環境: {environment === 'local' ? 'ローカル' : 'リモート'} - {
                  environment === 'local'
                  ? '編集・追加・削除が可能です'
                  : '読み取り専用モードです'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons (Local mode only) */}
        <ActionButtons
          environment={environment}
          hasChanges={hasChanges}
          onUndo={handleUndo}
          onSync={handleSync}
          onAddPart={handleAddPart}
          onCategoryEdit={handleCategoryEdit}
        />

        {/* Search Section */}
        <SearchSection
          activeTab={activeTab}
          onTabChange={handleTabChange}
          keyword={keyword}
          onKeywordChange={setKeyword}
          onSearch={handleSearch}
          categories={categories}
          onCategorySelect={handleCategorySelect}
          hasSearchResults={parts.length > 0}
          onResetSearch={handleResetSearch}
        />

        {/* Results Info */}
        {parts.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              {selectedCategoryId
                ? `カテゴリ: ${categories.find(c => c.id === selectedCategoryId)?.name || 'Unknown'}`
                : `キーワード: "${keyword}"`} の検索結果: {parts.length}件
            </p>
          </div>
        )}

        {/* Parts Table */}
        {parts.length > 0 ? (
          <PartsTable
            parts={parts}
            environment={environment}
            onQuantityChange={handleQuantityChange}
            onPartDetail={handlePartDetail}
            onPartEdit={handlePartEdit}
            onPartDelete={handlePartDelete}
          />
        ) : (
          (selectedCategoryId || keyword) && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
              <div>
                <p className="text-lg font-medium text-gray-600 mb-2">検索結果が見つかりませんでした</p>
                <p className="text-sm">別のキーワードやカテゴリで再度お試しください。</p>
              </div>
            </div>
          )
        )}

        {/* Part Detail Modal */}
        <PartDetailModal
          part={selectedPart}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedPart(null);
          }}
          categories={categories}
        />

        {/* Part Edit Modal */}
        <PartEditModal
          part={selectedPart}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedPart(null);
          }}
          onSave={handlePartSave}
          categories={categories}
        />

        {/* Part Add Modal */}
        <PartAddModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handlePartAdd}
          categories={categories}
        />

        {/* Category Edit Modal */}
        <CategoryEditModal
          isOpen={isCategoryEditModalOpen}
          onClose={() => setIsCategoryEditModalOpen(false)}
          onSave={handleCategorySave}
          categories={categories}
        />
      </div>
    </div>
  );
}

export default App;
