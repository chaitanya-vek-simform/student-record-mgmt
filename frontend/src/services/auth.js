const TOKEN_KEY = "sms_token";
const USER_KEY = "sms_user";

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getUser = () => {
  const value = localStorage.getItem(USER_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const setAuth = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const isAdmin = () => getUser()?.role === "admin";
