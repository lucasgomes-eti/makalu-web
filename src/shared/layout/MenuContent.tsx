"use client";

import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import AnalyticsRoundedIcon from "@mui/icons-material/AnalyticsRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Top-level dashboard destinations. Add a route here and in `app/dashboard/`. */
const NAVIGATION_ITEMS = [
  { label: "Orders", href: "/dashboard/orders", icon: <ReceiptLongRoundedIcon /> },
  { label: "Menu", href: "/dashboard/menu", icon: <MenuBookRoundedIcon /> },
  { label: "Analytics", href: "/dashboard/analytics", icon: <AnalyticsRoundedIcon /> },
] as const;

interface MenuContentProps {
  /** Called after a destination is chosen, so the mobile drawer can close. */
  onNavigate?: () => void;
}

export default function MenuContent({ onNavigate }: MenuContentProps) {
  const pathname = usePathname();

  return (
    <Stack sx={{ flexGrow: 1, p: 1, justifyContent: "space-between" }}>
      <List dense>
        {NAVIGATION_ITEMS.map((item) => (
          <ListItem key={item.href} disablePadding sx={{ display: "block" }}>
            {/* `Link` keeps prefetching and middle-click/open-in-new-tab working,
                which an onClick-based router.push does not. */}
            <ListItemButton
              component={Link}
              href={item.href}
              selected={pathname.startsWith(item.href)}
              onClick={onNavigate}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}
