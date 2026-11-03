"use client";

import { Component, type ErrorInfo, type ReactElement, type ReactNode } from "react";
import { SectionUnavailable } from "./SectionUnavailable";

interface ChartErrorBoundaryProps {
  readonly children: ReactNode;
  readonly className?: string;
}

interface ChartErrorBoundaryState {
  readonly failed: boolean;
}

/**
 * Keeps a section that throws while drawing (a chart library choking on a row it
 * did not expect) from taking the whole page down: that section shows as
 * unavailable, in the same place, and Retry draws it again.
 */
export class ChartErrorBoundary extends Component<ChartErrorBoundaryProps, ChartErrorBoundaryState> {
  state: ChartErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ChartErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Analytics section failed to render", error, info.componentStack);
  }

  render(): ReactElement | ReactNode {
    if (this.state.failed) {
      return <SectionUnavailable onRetry={() => this.setState({ failed: false })} className={this.props.className} />;
    }
    return this.props.children;
  }
}
