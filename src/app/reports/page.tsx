import { getReportsData } from '@/lib/serverData';
import ReportsClientWrapper from '@/components/ReportsClientWrapper';

interface ReportsPageProps {
  searchParams: Promise<{
    type?: string;
  }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const activeTab = params.type || 'most-borrowed';

  const reportData = await getReportsData(activeTab);

  return <ReportsClientWrapper activeTab={activeTab} reportData={reportData} />;
}
