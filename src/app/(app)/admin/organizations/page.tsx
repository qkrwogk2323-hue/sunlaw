import { redirect } from 'next/navigation';
import { requirePlatformAdmin } from '@/lib/auth';

export default async function AdminOrganizationsPage() {
  await requirePlatformAdmin();
  redirect('/admin/organization-requests');
}