import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
import './styles/global.css'

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: Error | null}> {
  constructor(props: {children: React.ReactNode}) { super(props); this.state = {error: null}; }
  static getDerivedStateFromError(error: Error) { return {error}; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[React render error]', error.message, error.stack, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return /*#__PURE__*/ React.createElement('div', {style: {padding:'40px', color:'#ff4444', fontFamily:'monospace', fontSize:'14px'}},
        'App error: ' + this.state.error.message,
        /*#__PURE__*/ React.createElement('pre', {style: {marginTop:'12px', whiteSpace:'pre-wrap', fontSize:'12px', color:'#aaa'}}, this.state.error.stack)
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
