/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-surface)] text-white">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-[var(--danger)] mx-auto" />
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-[var(--text-faint)]">The application encountered an unexpected error.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 font-bold"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
