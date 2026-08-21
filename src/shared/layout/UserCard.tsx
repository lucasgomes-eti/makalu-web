"use client";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { imageUrl } from "@/lib/api/media";
import { useProfile } from "@/features/profile/hooks/useProfile";

interface UserCardProps {
  /** Trailing slot, e.g. the options menu on desktop. */
  action?: React.ReactNode;
}

/** Signed-in user's avatar, name and email. Shared by both navigation variants. */
export default function UserCard({ action }: UserCardProps) {
  const { profile, isLoading } = useProfile();

  return (
    <Stack direction="row" sx={{ gap: 1, alignItems: "center", width: "100%" }}>
      <Avatar
        alt={profile?.name ?? "User"}
        src={imageUrl(profile?.profile_image_id)}
        sx={{ width: 36, height: 36 }}
      />
      <Box sx={{ mr: "auto", minWidth: 0 }}>
        {isLoading ? (
          <>
            <Skeleton width={120} height={16} />
            <Skeleton width={160} height={14} />
          </>
        ) : (
          <>
            <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: "16px" }}>
              {profile?.name ?? "Unknown user"}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {profile?.email ?? "No email"}
            </Typography>
          </>
        )}
      </Box>
      {action}
    </Stack>
  );
}
