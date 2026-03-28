import React, { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name ?? "unknown"}]`, error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex items-center justify-center h-full w-full">
          <div className="text-center flex flex-col items-center gap-3">
            {this.props.name && (
              <p className="text-[9px] uppercase tracking-widest text-text-disabled">
                {this.props.name}
              </p>
            )}
            <p className="text-[10px] uppercase tracking-widest text-negative">
              ERROR
            </p>
            <p className="text-[9px] text-text-disabled max-w-[320px]">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
            <button
              onClick={this.handleRetry}
              className="mt-1 px-3 py-1 text-[9px] tracking-widest uppercase border border-border text-accent hover:text-accent hover:border-accent transition-colors"
            >
              RETRY
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
