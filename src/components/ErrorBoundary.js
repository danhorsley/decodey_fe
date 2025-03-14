// src/components/ErrorBoundary.js
import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div
          style={{
            padding: "20px",
            margin: "20px",
            backgroundColor: "#ffeded",
            border: "1px solid #f5c6cb",
            borderRadius: "4px",
            color: "#721c24",
          }}
        >
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: "pre-wrap", marginTop: "10px" }}>
            <summary>Error Details</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          {this.props.fallback || null}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
