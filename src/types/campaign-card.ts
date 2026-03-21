export interface CampaignCardData {
  id: string;
  name: string;
  company: string;
  companyInitial: string;
  description: string;
  totalBudget: number;
  currency: string;
  cpvLabel: string;
  geo: string[];
  daysLeft: number;
  applicants: number;
  maxApplicants: number;
  minFollowers: number;
}
