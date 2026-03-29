import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

/**
 * Evita que un error de renderizado deje la app en blanco; muestra una pantalla recuperable.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 py-12">
          <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
            <p className="text-4xl" aria-hidden>
              ⚠️
            </p>
            <h1 className="mt-4 text-xl font-semibold text-zinc-900">Ups, algo salió mal</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Ocurrió un error inesperado en la interfaz. Puedes recargar la página para seguir usando la
              aplicación.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-800"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
