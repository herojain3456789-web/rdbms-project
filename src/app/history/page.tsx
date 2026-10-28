import { getHistoryData } from '@/lib/serverData';
import HistoryClientWrapper from '@/components/HistoryClientWrapper';

interface HistoryPageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const params = await searchParams;

  const data = await getHistoryData({
    status: params.status,
    search: params.search,
    page: params.page,
    limit: 10,
  });

  return (
    <HistoryClientWrapper
      loans={data.loans}
      pagination={data.pagination}
      filters={data.filters}
    />
  );
}
