import { notFound } from "next/navigation";
import EditStoreScreen from "@/features/stores/components/EditStoreScreen";

export default async function EditStorePage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  const parsedId = Number.parseInt(storeId, 10);

  if (!Number.isInteger(parsedId) || parsedId <= 0) notFound();

  return <EditStoreScreen storeId={parsedId} />;
}
