import LoadingState from "@/shared/components/LoadingState";

/** Shown while a dashboard route segment streams in. */
export default function DashboardLoading() {
  return <LoadingState label="Loading page" />;
}
