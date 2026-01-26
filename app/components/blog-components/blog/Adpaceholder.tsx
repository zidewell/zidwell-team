interface AdPlaceholderProps {
  variant?: "horizontal" | "vertical" | "inline";
}

const AdPlaceholder = ({ variant = "horizontal" }: AdPlaceholderProps) => {
  const getStyles = () => {
    switch (variant) {
      case "vertical":
        return "w-full h-64";
      case "inline":
        return "w-full h-24 my-8";
      default:
        return "w-full h-24";
    }
  };

  return (
    <div className={`bg-muted/50 rounded border border-dashed border-border flex flex-col items-center justify-center ${getStyles()}`}>
      <p className="text-xs text-muted-foreground uppercase tracking-wider">
        Advertisement
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Google Ads Placement
      </p>
    </div>
  );
};

export default AdPlaceholder;
