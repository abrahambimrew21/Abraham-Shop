import { defineStore } from 'pinia'
import type {UserType} from '@/types/user.type'

export const useUserStore = defineStore('user', {
  state: () => {
    let initialUser: UserType | null = null;
    try {
      const stored = localStorage.getItem('user');
      if (stored) initialUser = JSON.parse(stored);
    } catch (e) {
      initialUser = null;
    }
    return {
      user: initialUser as UserType | null,
      accessToken: (localStorage.getItem('accessToken') || null) as string | null,
      refreshToken: (localStorage.getItem('refreshToken') || null) as string | null,
    };
  },

  actions: {

    setUser(user: UserType | null) {
      this.user = user;
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.removeItem('user');
      }
    },

    setAccessToken(accessToken: string) {
      this.accessToken = accessToken;
      localStorage.setItem('accessToken', accessToken);
    },

    setRefreshToken(refreshToken: string) {
      this.refreshToken = refreshToken;
      localStorage.setItem('refreshToken', refreshToken);
    },

    logout() {
      this.user = null;
      this.accessToken = null;
      this.refreshToken = null;
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  },

  getters: {
    isAuthenticated: (state) => !!state.user,
    getUser: (state) => state.user,
    getAccessToken: (state) => state.accessToken,
    getRefreshToken: (state) => state.refreshToken,
  }
})