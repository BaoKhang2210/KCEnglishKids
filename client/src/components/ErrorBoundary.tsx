import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * §2.3.1 — Without an error boundary any render error = white screen in front
 * of the review panel. This catches render/lifecycle errors and shows a
 * friendly, child-safe recovery screen instead.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught render error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-sky-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-4xl border-4 border-amber-200 shadow-2xl p-10 max-w-lg w-full text-center">
            <div className="text-7xl mb-4 animate-soft-bounce">🐻</div>
            <h1 className="text-3xl font-black text-slate-800 mb-3">
              Ôi! Koko bị vấp một chút rồi!
            </h1>
            <p className="text-slate-600 font-bold mb-8 leading-relaxed">
              Có một lỗi nhỏ xảy ra khi hiển thị trang. Bé hãy thử lại hoặc quay về trang chủ nhé!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="btn-3d-amber text-amber-950 font-black text-lg py-3.5 px-8 rounded-2xl cursor-pointer"
              >
                Thử lại 🔄
              </button>
              <button
                onClick={this.handleHome}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-lg py-3.5 px-8 rounded-2xl cursor-pointer transition-colors"
              >
                Về trang chủ 🏠
              </button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <summary className="font-black text-slate-500 text-sm cursor-pointer">
                  Chi tiết lỗi (chỉ hiện khi phát triển)
                </summary>
                <pre className="mt-2 text-xs text-rose-600 whitespace-pre-wrap break-all">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
