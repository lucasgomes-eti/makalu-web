import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Primary action(s) for the page, rendered on the trailing edge. */
  action?: React.ReactNode;
}

/** Consistent page title block; keeps heading levels out of feature components. */
export default function PageHeader({
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 2,
        width: "100%",
        mb: 2,
      }}
    >
      <Box>
        <Typography variant="h5" component="h1">
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {description}
          </Typography>
        )}
      </Box>
      {action}
    </Box>
  );
}
