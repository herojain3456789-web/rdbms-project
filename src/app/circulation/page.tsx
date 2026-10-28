import { getCirculationData } from '@/lib/serverData';
import CirculationClientWrapper from '@/components/CirculationClientWrapper';

export default async function CirculationPage() {
  const data = await getCirculationData();

  return (
    <CirculationClientWrapper
      activeMembers={data.activeMembers}
      availableBooks={data.availableBooks}
      activeLoans={data.activeLoans}
      sessionLogs={data.sessionLogs}
    />
  );
}
