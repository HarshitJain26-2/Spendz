import { repository } from './repository';
import * as schema from './schema';

export const initializeDatabase = async () => {
  await repository.init();
};

export const seedDefaultCategories = () => {
  repository.seedDefaultCategories();
};

export { repository, schema };
