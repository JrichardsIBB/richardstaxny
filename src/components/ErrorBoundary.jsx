import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
          <h1 className="mb-4 text-3xl font-bold text-brand-blue-500">
            Something went wrong
          </h1>
          <p className="mb-6 max-w-md text-gray-600">
            We encountered an unexpected error. Please try refreshing the page
            or go back to the home page.
          </p>
          <a
            href="/"
            className="rounded-lg bg-brand-blue-500 px-6 py-2.5 font-semibold text-white transition hover:bg-brand-blue-600"
          >
            Go back to home
          </a>
        </div>
      );
    }

    return this.props.children;
  }
}
