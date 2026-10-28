import { getSettingsData } from '@/lib/serverData';
import SettingsClientWrapper from '@/components/SettingsClientWrapper';

export default async function SettingsPage() {
  const data = await getSettingsData();

  return (
    <SettingsClientWrapper
      initialDbStatus={data.dbStatus}
      initialCounts={data.counts}
    />
  );
}
