import { getBooksData } from '@/lib/serverData';
import BooksClientWrapper from '@/components/BooksClientWrapper';

interface BooksPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    availability?: string;
    sort?: string;
    order?: string;
    page?: string;
  }>;
}

export default async function BooksPage({ searchParams }: BooksPageProps) {
  const params = await searchParams;

  const data = await getBooksData({
    search: params.search,
    category: params.category,
    availability: params.availability,
    sort: params.sort,
    order: params.order,
    page: params.page,
    limit: 10,
  });

  return (
    <BooksClientWrapper
      books={data.books}
      categories={data.categories}
      publishers={data.publishers}
      pagination={data.pagination}
      filters={data.filters}
    />
  );
}
