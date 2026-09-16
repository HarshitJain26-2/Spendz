import { getDatabase } from './index';
import { schema } from './index';
import { eq } from 'drizzle-orm';
import { ALL_DEFAULT_CATEGORIES } from '@/constants/categories';
import { generateId, getTodayISO } from '@/utils/date';

export const seedDefaultCategories = () => {
  const db = getDatabase();

  // Check if categories already exist
  const existing = db.select().from(schema.categories).all();
  if (existing.length > 0) return;

  const now = getTodayISO();

  for (const cat of ALL_DEFAULT_CATEGORIES) {
    db.insert(schema.categories)
      .values({
        id: generateId(),
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        type: cat.type,
        isDefault: true,
        createdAt: now,
      })
      .run();
  }
};
