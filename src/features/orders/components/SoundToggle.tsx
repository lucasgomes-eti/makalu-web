import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import VolumeOffRoundedIcon from "@mui/icons-material/VolumeOffRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";

interface SoundToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

/** Switches the new-order sound. The click is also what lets the browser play it. */
export default function SoundToggle({ enabled, onToggle }: SoundToggleProps) {
  const label = enabled ? "Mute new order sound" : "Play a sound for new orders";
  return (
    <Tooltip title={label}>
      <IconButton size="small" aria-label={label} aria-pressed={enabled} onClick={onToggle}>
        {enabled ? <VolumeUpRoundedIcon /> : <VolumeOffRoundedIcon />}
      </IconButton>
    </Tooltip>
  );
}
