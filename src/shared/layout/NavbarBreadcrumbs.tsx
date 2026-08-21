"use client";

import Breadcrumbs, { breadcrumbsClasses } from "@mui/material/Breadcrumbs";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import { usePathname } from "next/navigation";

const StyledBreadcrumbs = styled(Breadcrumbs)(({ theme }) => ({
  margin: theme.spacing(1, 0),
  [`& .${breadcrumbsClasses.separator}`]: {
    color: (theme.vars || theme).palette.action.disabled,
    margin: 1,
  },
  [`& .${breadcrumbsClasses.ol}`]: { alignItems: "center" },
}));

/** Numeric ids read as noise in a trail; label them by what they identify. */
function labelFor(segment: string, previousSegment: string | undefined): string {
  if (/^\d+$/.test(segment)) {
    return previousSegment ? `#${segment}` : segment;
  }
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

/** Derives the trail from the current path — no per-route registration needed. */
export default function NavbarBreadcrumbs() {
  const segments = usePathname().split("/").filter(Boolean);

  return (
    <StyledBreadcrumbs
      aria-label="breadcrumb"
      separator={<NavigateNextRoundedIcon fontSize="small" />}
    >
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        return (
          <Typography
            key={`${segment}-${index}`}
            variant="body1"
            sx={{
              color: isLast ? "text.primary" : "inherit",
              fontWeight: isLast ? 600 : 400,
            }}
          >
            {labelFor(segment, segments[index - 1])}
          </Typography>
        );
      })}
    </StyledBreadcrumbs>
  );
}
