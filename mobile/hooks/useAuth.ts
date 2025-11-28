import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';
import type { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const { user } = await apiClient.getCurrentUser();
      setUser(user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const response = await apiClient.login(email, password);
    setUser(response.user);
    return response;
  }

  async function loginWithGoogle(idToken: string) {
    const response = await apiClient.loginWithGoogle(idToken);
    setUser(response.user);
    return response;
  }

  async function loginWithApple(idToken: string, fullName?: { givenName?: string; familyName?: string }) {
    const response = await apiClient.loginWithApple(idToken, fullName);
    setUser(response.user);
    return response;
  }

  async function register(
    email: string,
    password: string,
    fullName?: string,
    phone?: string
  ) {
    const response = await apiClient.register(email, password, fullName, phone);
    // User might not be set if verification is required
    if (response.user) {
      setUser(response.user);
    }
    return response;
  }

  async function logout() {
    await apiClient.logout();
    setUser(null);
  }

  async function refreshUser() {
    try {
      const { user } = await apiClient.getCurrentUser();
      setUser(user);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }

  return {
    user,
    loading,
    login,
    register,
    logout,
    loginWithGoogle,
    loginWithApple,
    refreshUser,
    isAuthenticated: !!user,
    isOfficer: user?.role === 'officer' || user?.role === 'admin',
    isAdmin: user?.role === 'admin',
  };
}



