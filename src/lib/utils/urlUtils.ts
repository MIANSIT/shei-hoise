// lib/utils/urlUtils.ts
export class URLStateManager {
  private searchParams: URLSearchParams;
  private pathname: string;
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.searchParams = new URLSearchParams(window.location.search);
      this.pathname = window.location.pathname;
    } else {
      this.searchParams = new URLSearchParams();
      this.pathname = '';
    }
  }

  // Update URL without page reload
  updateURL(params: Record<string, string | null>) {
    if (typeof window === 'undefined') return;

    const newSearchParams = new URLSearchParams();
    
    // Set new params
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        newSearchParams.set(key, value);
      }
    });

    const newUrl = `${this.pathname}?${newSearchParams.toString()}`;
    window.history.pushState({}, '', newUrl);
  }

  // Get current params
  getParams(): Record<string, string> {
    const params: Record<string, string> = {};
    this.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }

  // Get specific param
  getParam(key: string): string | null {
    return this.searchParams.get(key);
  }

  // Clear all params
  clearAll() {
    this.searchParams = new URLSearchParams();
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', this.pathname);
    }
  }

  // Clear specific param
  clearParam(key: string) {
    this.searchParams.delete(key);
    if (typeof window !== 'undefined') {
      const newUrl = `${this.pathname}?${this.searchParams.toString()}`;
      window.history.pushState({}, '', newUrl);
    }
  }
}