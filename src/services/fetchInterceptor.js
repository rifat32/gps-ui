const originalFetch = window.fetch;

// List of URL patterns that require authentication
const PROTECTED_API_PATTERNS = [
  ':4020',
  ':4031',
  ':8040',
  '/api/'
];

window.fetch = async (...args) => {
  let [resource, config] = args;
  
  // Get URL string
  const url = typeof resource === 'string' ? resource : (resource instanceof Request ? resource.url : String(resource));

  // Check if it's our API
  const isOurApi = PROTECTED_API_PATTERNS.some(pattern => url.includes(pattern));

  if (isOurApi) {
    config = config || {};
    config.headers = config.headers || {};

    const userStr = localStorage.getItem("user");
    let token = null;

    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        token = user.accessToken || user.token;
      } catch (e) {
        console.error("❌ [FetchInterceptor] Error parsing user data:", e);
      }
    }

    if (token) {
      // Use Headers object for case-insensitive management
      const headers = config.headers instanceof Headers 
        ? config.headers 
        : new Headers(config.headers);

      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
        config.headers = headers;
        // console.log(`✅ [FetchInterceptor] Attached token to: ${url}`);
      }
    } else {
      // No token found for a protected API call
      console.warn(`🚨 [FetchInterceptor] Token missing for protected API: ${url}`);
      
      // If we're not on the login page, clear storage and force redirect
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem("user");
        window.location.href = '/login';
        // Block the request
        return new Response(JSON.stringify({ error: 'Unauthorized: Missing token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  }

  try {
    const response = await originalFetch(resource, config);

    if (response.status === 401 && isOurApi) {
      console.warn(`🔐 [FetchInterceptor] 401 Unauthorized from ${url}. Logging out...`);
      localStorage.removeItem("user");
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    return response;
  } catch (error) {
    // console.error(`❌ [FetchInterceptor] Fetch error for ${url}:`, error);
    throw error;
  }
};

