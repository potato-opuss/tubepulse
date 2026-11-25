import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './ui';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Never log error details: they can contain user data or secrets.
  }

  private reset = () => {
    this.setState({ hasError: false });
  };

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="safe-top flex min-h-dvh flex-col items-center justify-center bg-bg px-6 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-negative/10 text-negative">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold text-ink">Something went wrong</h1>
        <p className="mt-1.5 max-w-sm text-sm text-muted">
          TubePulse hit an unexpected error. Your stored settings are safe. You can try again.
        </p>
        <Button className="mt-5" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={this.reset}>
          Try again
        </Button>
      </div>
    );
  }
}
