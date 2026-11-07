import { useTranslation } from "react-i18next";
import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from "react";
import { logger } from "../lib/logger";

interface ErrorBoundaryProps extends PropsWithChildren {
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error("error boundary caught an error", { error, errorInfo });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? <ErrorFallback />;
    }
    return this.props.children;
  }
}

/** Default full-area fallback shown when a boundary catches a render error. */
export function ErrorFallback() {
  const { t } = useTranslation("errors");
  return (
    <div role="alert" style={{ padding: "2rem", textAlign: "center" }}>
      <p>{t("boundary.title")}</p>
      <button type="button" onClick={() => window.location.reload()}>
        {t("boundary.reload")}
      </button>
    </div>
  );
}

export default ErrorBoundary;
