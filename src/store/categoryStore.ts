import { create } from 'zustand';
import type { Category, CategoryType } from '@/types';
import { repository } from '@/database';
import { generateId, getTodayISO } from '@/utils/date';

interface CategoryState {
  categories: Category[];
  isLoading: boolean;

  loadCategories: () => void;
  addCategory: (data: {
    name: string;
    icon: string;
    color: string;
    type: CategoryType;
  }) => Category;
  updateCategory: (id: string, data: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  getExpenseCategories: () => Category[];
  getIncomeCategories: () => Category[];
  getCategoryById: (id: string) => Category | undefined;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  isLoading: false,

  loadCategories: () => {
    try {
      const categories = repository.getCategories();
      set({ categories });
    } catch (e) {
      console.error('Failed to load categories:', e);
    }
  },

  addCategory: (data) => {
    const now = getTodayISO();
    const category: Category = {
      id: generateId(),
      ...data,
      isDefault: false,
      createdAt: now,
    };

    repository.addCategory(category);
    set((state) => ({ categories: [...state.categories, category] }));
    return category;
  },

  updateCategory: (id, data) => {
    repository.updateCategory(id, data);
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, ...data } : c
      ),
    }));
  },

  deleteCategory: (id) => {
    repository.deleteCategory(id);
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
    }));
  },

  getExpenseCategories: () => {
    return get().categories.filter((c) => c.type === 'expense');
  },

  getIncomeCategories: () => {
    return get().categories.filter((c) => c.type === 'income');
  },

  getCategoryById: (id) => {
    return get().categories.find((c) => c.id === id);
  },
}));
