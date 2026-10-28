import { getCategoriesData } from '@/lib/serverData';
import CategoriesClientWrapper from '@/components/CategoriesClientWrapper';

export default async function CategoriesPage() {
  const categories = await getCategoriesData();

  return <CategoriesClientWrapper categories={categories} />;
}
