"use client";

import { useParams } from "next/navigation";
import StoreDetail from "../components/StoreDetail";

export default function EditStore() {
  const params = useParams();
  const storeId = params.storeId as string;

  return <StoreDetail storeId={storeId} />;
}
