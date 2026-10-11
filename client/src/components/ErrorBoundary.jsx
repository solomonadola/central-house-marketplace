import { Component } from 'react';

// Catches render errors in the route tree so a single broken page shows a
// friendly message instead of a blank screen.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div role='alert' className='container-page py-20 text-center'>
          <h1 className='page-title'>Something went wrong</h1>
          <p className='mt-2 text-slate-600'>Please try again. If it keeps happening, reload the page.</p>
          <button type='button' onClick={() => this.setState({ error: null })} className='btn-primary mt-6'>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
