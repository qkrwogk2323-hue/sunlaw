import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { listDocuments } from '@/lib/queries/documents';
import { DocumentsClient } from '@/components/documents-client';

export default async function DocumentsPage() {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const documents = await listDocuments(organizationId);

  return <DocumentsClient documents={documents as any} />;
}
