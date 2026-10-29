import React from "react";
import { AlertTriangle } from "lucide-react";
import Button from "./Button";

/**
 * Catches render-time exceptions so a thrown component shows a recoverable
 * panel instead of unmounting the tree and leaving a blank white page.
 *
 * WHAT THIS DOES NOT CATCH. React error boundaries only see errors thrown
 * during render, in lifecycle methods, and in constructors. Errors inside
 * event handlers, promises, async callbacks and setTimeout never reach here —
 * those still need their own try/catch and their own user feedback. This
 * closes the white-screen failure mode, not error handling in general.
 *
 * Used at two levels (see App.tsx and MainLayout.tsx):
 *   • outer — around the router, the last line of defence; its fallback fills
 *     the page because at that level the app shell itself may be what broke.
 *   • inner — around the routed page, keyed on the pathname so the sidebar and
 *     header survive and the user can navigate away without reloading.
 */

interface Props {
  children: React.ReactNode;
  /**
   * `page` fills the viewport (used when the shell itself may be broken);
   * `region` sits inside the existing layout so the chrome stays usable.
   */
  variant?: "page" | "region";
}

interface State {
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // The only sink available: this app has no error-reporting service wired
    // up (no Sentry/Bugsnag/LogRocket anywhere in src/). If one is added later,
    // report it HERE — `info.componentStack` is what makes these traceable.
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  /**
   * Clear the error and re-render the same children in place. No reload, so
   * the route, the URL and everything above this boundary are preserved. If
   * whatever threw is still throwing, the boundary simply catches again and
   * the user can fall back to Reload page.
   */
  private handleRetry = () => this.setState({ error: null });

  private handleReload = () => window.location.reload();

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isPage = this.props.variant !== "region";

    return (
      <div
        className={
          isPage
            ? "min-h-screen flex items-center justify-center bg-[#f5f5f5] p-4"
            : "flex items-center justify-center py-12 px-4"
        }
      >
        <div className="bg-white rounded-[12px] border border-[#e5e7eb] p-8 sm:p-10 max-w-sm w-full text-center shadow-sm">
          <div className="flex justify-center mb-5">
            <div className="bg-[#fff0f4] rounded-full w-16 h-16 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-[#FE2B73]" strokeWidth={1.5} />
            </div>
          </div>
          <h1 className="text-[18px] font-bold text-[#333] mb-2">Something went wrong</h1>
          <p className="text-[13px] text-[#999] mb-1">
            This screen ran into an unexpected problem and could not finish loading.
          </p>
          <p className="text-[12px] text-[#bbb] mb-6">
            Your work on other screens is unaffected. Try again, or reload the page if the
            problem continues.
          </p>

          {/* Dev only: the message and component stack are a debugging aid, not
              something to put in front of a workshop user in production. */}
          {import.meta.env.DEV && (
            <details className="mb-6 text-left">
              <summary className="text-[12px] text-[#999] cursor-pointer">
                Error details (development only)
              </summary>
              <pre className="mt-2 text-[11px] text-[#666] bg-[#f5f5f5] p-3 rounded-[8px] overflow-x-auto whitespace-pre-wrap break-words">
                {error.message || String(error)}
              </pre>
            </details>
          )}

          <div className="flex flex-col gap-2">
            <Button variant="gradient" onClick={this.handleRetry} className="w-full">
              Try again
            </Button>
            <Button variant="outline" onClick={this.handleReload} className="w-full">
              Reload page
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
