import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import { ConnectionStatus } from "@/lib/realtime/emitterConnection";

const PRESENTATION: Record<
  ConnectionStatus,
  { label: string; color: "success" | "warning" | "default"; hint: string }
> = {
  live: {
    label: "Live",
    color: "success",
    hint: "New orders and status changes appear on their own.",
  },
  connecting: {
    label: "Connecting…",
    color: "default",
    hint: "Setting up live updates.",
  },
  reconnecting: {
    label: "Reconnecting…",
    color: "warning",
    hint: "Live updates are interrupted. The board may be out of date until it reconnects; use Refresh to be sure.",
  },
  unavailable: {
    label: "Live updates off",
    color: "default",
    hint: "Live updates are not available right now. Use Refresh to see new orders.",
  },
};

/** Tells the store whether it can trust the board to update on its own. */
export default function RealtimeStatus({ status }: { status: ConnectionStatus }) {
  const { label, color, hint } = PRESENTATION[status];
  return (
    <Tooltip title={hint}>
      <Chip
        role="status"
        aria-label={`Live updates: ${label}`}
        size="small"
        variant="outlined"
        color={color}
        label={label}
      />
    </Tooltip>
  );
}
