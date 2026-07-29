import { PageHeader } from '@/components/layout/page-header';
import { CampaignWizard } from '@/components/campaigns/campaign-wizard';

export default function NewCampaignPage() {
  return (
    <div>
      <PageHeader title="Create campaign" description="Set up a new advertising campaign in a few steps." />
      <CampaignWizard />
    </div>
  );
}
