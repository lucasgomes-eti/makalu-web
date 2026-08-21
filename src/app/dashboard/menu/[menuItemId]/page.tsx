import { notFound } from "next/navigation";
import EditMenuItemScreen from "@/features/menu/components/EditMenuItemScreen";

/**
 * Route params are strings. Parsing here — at the boundary — means everything
 * downstream can take a `number` and the "id" is never a string wearing a
 * `number` type, as it was before.
 */
export default async function EditMenuItemPage({
  params,
}: {
  params: Promise<{ menuItemId: string }>;
}) {
  const { menuItemId } = await params;
  const parsedId = Number.parseInt(menuItemId, 10);

  if (!Number.isInteger(parsedId) || parsedId <= 0) notFound();

  return <EditMenuItemScreen menuItemId={parsedId} />;
}
