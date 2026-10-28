import { getMembersData } from '@/lib/serverData';
import MembersClientWrapper from '@/components/MembersClientWrapper';

interface MembersPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const params = await searchParams;

  const data = await getMembersData({
    search: params.search,
    status: params.status,
    page: params.page,
    limit: 10,
  });

  return (
    <MembersClientWrapper
      members={data.members}
      pagination={data.pagination}
      filters={data.filters}
    />
  );
}
