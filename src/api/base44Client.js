// Mock base44 client — fully standalone, no external dependencies.
// All data is persisted to browser LocalStorage.

const generateId = () => crypto.randomUUID();

const getLocalData = (entityName) => {
  const data = localStorage.getItem(`mock_${entityName}`);
  return data ? JSON.parse(data) : [];
};

const setLocalData = (entityName, data) => {
  localStorage.setItem(`mock_${entityName}`, JSON.stringify(data));
};

const mockEntityHandler = (entityName) => ({
  list: async (sort, limit) => {
    return getLocalData(entityName);
  },
  filter: async (query) => {
    const data = getLocalData(entityName);
    return data.filter(item => {
      return Object.entries(query).every(([key, val]) => item[key] === val);
    });
  },
  get: async (id) => {
    const data = getLocalData(entityName);
    return data.find(item => item.id === id);
  },
  create: async (payload) => {
    const data = getLocalData(entityName);
    const newItem = { id: generateId(), created_date: new Date().toISOString(), ...payload };
    setLocalData(entityName, [...data, newItem]);
    return newItem;
  },
  update: async (id, payload) => {
    const data = getLocalData(entityName);
    let updatedItem = null;
    const newData = data.map(item => {
      if (item.id === id) {
        updatedItem = { ...item, ...payload, updated_date: new Date().toISOString() };
        return updatedItem;
      }
      return item;
    });
    setLocalData(entityName, newData);
    return updatedItem;
  },
  delete: async (id) => {
    const data = getLocalData(entityName);
    setLocalData(entityName, data.filter(item => item.id !== id));
    return { success: true };
  }
});

// Dynamic proxy to handle any entity name (e.g., base44.entities.Invoice.list())
const entitiesProxy = new Proxy({}, {
  get: (target, entityName) => {
    return mockEntityHandler(entityName);
  }
});

export const base44 = {
  entities: entitiesProxy,
  auth: {
    // Core auth (used by AuthContext)
    me: async () => ({ id: 'mock_user_1', email: 'admin@filingsx.local', name: 'Admin User' }),
    login: async () => {},
    logout: async () => { window.location.href = '/'; },
    redirectToLogin: () => { window.location.href = '/'; },
    // Password flows (ForgotPassword, ResetPassword pages)
    resetPasswordRequest: async () => {},
    resetPassword: async () => {},
    // Email/password login (Login page)
    loginViaEmailPassword: async (email, password) => {
      console.warn('[Mock Auth] loginViaEmailPassword called — auto-authenticated locally.');
    },
    // OAuth (Login & Register pages)
    loginWithProvider: (provider, redirectUrl) => {
      console.warn(`[Mock Auth] loginWithProvider(${provider}) called — not available locally.`);
    },
    // Registration flow (Register page)
    register: async ({ email, password }) => {
      console.warn('[Mock Auth] register called — auto-authenticated locally.');
    },
    verifyOtp: async ({ email, otpCode }) => {
      console.warn('[Mock Auth] verifyOtp called — returning mock token.');
      return { access_token: 'mock_local_token' };
    },
    resendOtp: async (email) => {
      console.warn('[Mock Auth] resendOtp called — no-op locally.');
    },
    setToken: (token) => {
      console.warn('[Mock Auth] setToken called — no-op locally.');
    }
  }
};

