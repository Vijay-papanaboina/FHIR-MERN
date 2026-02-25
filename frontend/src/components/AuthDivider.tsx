import type { ReactNode } from "react";

interface AuthDividerProps {
  children?: ReactNode;
}

export function AuthDivider({
  children = "Or continue with",
}: AuthDividerProps) {
  return (
    <div className="relative" role="separator">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-card px-2 text-muted-foreground">{children}</span>
      </div>
    </div>
  );
}
