import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-red-50 text-red-900 font-sans">
                    <h1 className="text-4xl font-black mb-4">Algo deu errado 😭</h1>
                    <p className="text-xl mb-8">Ocorreu um erro ao carregar a aplicação.</p>

                    <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-4xl overflow-auto border-2 border-red-200">
                        <h2 className="text-lg font-bold mb-2 text-red-600">Erro:</h2>
                        <pre className="bg-red-50 p-4 rounded-lg text-sm font-mono mb-6 whitespace-pre-wrap">
                            {this.state.error && this.state.error.toString()}
                        </pre>

                        <h2 className="text-lg font-bold mb-2 text-gray-700">Stack Trace:</h2>
                        <pre className="bg-gray-50 p-4 rounded-lg text-xs font-mono whitespace-pre-wrap text-gray-600">
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </div>

                    <button
                        onClick={() => window.location.reload()}
                        className="mt-8 px-8 py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
                    >
                        Tentar Novamente
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
