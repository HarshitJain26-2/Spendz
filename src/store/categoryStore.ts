import { create } from 'zustand';
import type { Category, CategoryType } from '@/types';
import { getDatabase, schema } from '@/database';
import { eq } from 'drizzle-orm';
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
      const db = getDatabase();
      const results = db.select().from(schema.categories).all();
      set({
        categories: results.map((r) => ({
          id: r.id,
          name: r.name,
          icon: r.icon,
          color: r.color,
          type: r.type as CategoryType,
          isDefault: r.isDefault,
          createdAt: r.createdAt,
        })),
      });
    } catch (e) {
      console.error('Failed to load categories:', e);
    }
  },

  addCategory: (data) => {
    const db = getDatabase();
    const now = getTodayISO();
    const category: Category = {
      id: generateId(),
      ...data,
      isDefault: false,
      createdAt: now,
    };

    db.insert(schema.categories).values(category).run();
    set((state) => ({ categories: [...state.categories, category] }));
    return category;
  },

  updateCategory: (id, data) => {
    const db = getDatabase();
    db.update(schema.categories)
      .set(data as any)
      .where(eq(schema.categories.id, id))
      .run();

    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, ...data } : c
      ),
    }));
  },

  deleteCategory: (id) => {
    const db = getDatabase();
    db.delete(schema.categories).where(eq(schema.categories.id, id)).run();
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
