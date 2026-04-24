// authApi.js - Updated with flexible GraphQL URL
const getGraphqlUrl = () => {
  // If explicitly defined in environment
  if (import.meta.env.VITE_GRAPHQL_URL) {
    return import.meta.env.VITE_GRAPHQL_URL;
  }
  
  // Fallback 1: Use the same host as VITE_API_BASE_URL but on port 8040 (HAProxy)
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
  if (apiBaseUrl) {
    try {
      const url = new URL(apiBaseUrl);
      return `${url.protocol}//${url.hostname}:8040/graphql`;
    } catch (e) {
      console.warn("Invalid VITE_API_BASE_URL", e);
    }
  }

  // Fallback 2: Localhost/Current Host on port 8040
  return `${window.location.protocol}//${window.location.hostname}:8040/graphql`;
};

const GRAPHQL_URL = getGraphqlUrl();

const authApi = {
  login: async (email, password) => {
    const query = `
      mutation Login($email: String!, $password: String!) {
        login(loginInput: { email: $email, password: $password }) {
          success
          message
          data {
            accessToken
            user {
              id
              email
              role {
                name
              }
              profile {
                fullName
              }
            }
          }
        }
      }
    `;

    console.log(`🔐 Attempting login at: ${GRAPHQL_URL}`);

    try {
      const response = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          variables: { email, password },
        }),
      });

      if (!response.ok) {
        // If 8040 fails, try port 3000 as a last resort (direct API access)
        if (GRAPHQL_URL.includes(":8040")) {
          console.warn("⚠️ HAProxy (8040) failed, attempting direct API (3000)...");
          const directUrl = GRAPHQL_URL.replace(":8040", ":3000");
          return authApi.loginDirect(email, password, directUrl);
        }
        throw new Error(`Server responded with ${response.status}`);
      }

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      if (!result.data.login.success) {
        throw new Error(result.data.login.message);
      }

      const { accessToken, user } = result.data.login.data;
      
      const userData = {
        accessToken,
        id: user.id,
        email: user.email,
        role: user.role?.name || "USER",
        name: user.profile?.fullName || user.email,
      };

      localStorage.setItem("user", JSON.stringify(userData));
      return userData;
    } catch (error) {
      console.error("❌ Login Error:", error);
      
      // Automatic fallback to port 3000 if 8040 fails with "Failed to fetch"
      if (error.message === "Failed to fetch" && GRAPHQL_URL.includes(":8040")) {
        console.warn("⚠️ Connection refused on 8040, trying 3000...");
        const directUrl = GRAPHQL_URL.replace(":8040", ":3000");
        return authApi.loginDirect(email, password, directUrl);
      }
      
      throw error;
    }
  },

  loginDirect: async (email, password, url) => {
    const query = `
      mutation Login($email: String!, $password: String!) {
        login(loginInput: { email: $email, password: $password }) {
          success
          message
          data {
            accessToken
            user {
              id
              email
              role {
                name
              }
              profile {
                fullName
              }
            }
          }
        }
      }
    `;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { email, password } }),
    });

    const result = await response.json();
    if (result.errors) throw new Error(result.errors[0].message);
    if (!result.data.login.success) throw new Error(result.data.login.message);

    const { accessToken, user } = result.data.login.data;
    const userData = {
      accessToken,
      id: user.id,
      email: user.email,
      role: user.role?.name || "USER",
      name: user.profile?.fullName || user.email,
    };
    localStorage.setItem("user", JSON.stringify(userData));
    return userData;
  },

  logout: () => {
    localStorage.removeItem("user");
  },
};

export default authApi;
