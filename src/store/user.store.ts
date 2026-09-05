import { defineStore } from 'pinia';
import type { UserType } from '@/types/user.type';

export const useUserStore = defineStore('user', {
  state: () => {
    return {
      user: null as UserType | null,
      accessToken: null as string | null,
      refreshToken: null as string | null,
    };
  },

  actions: {

    setUser(user: UserType | null) {
      this.user = user;
    },

    setAccessToken(accessToken: string) {
      this.accessToken = accessToken;
    },

    setRefreshToken(refreshToken: string) {
      this.refreshToken = refreshToken;
    },

    logout() {
      this.user = null;
      this.accessToken = null;
      this.refreshToken = null;
    }
  },

  getters: {
    isAuthenticated: (state) => !!state.user,
    getUser: (state) => state.user,
    getAccessToken: (state) => state.accessToken,
    getRefreshToken: (state) => state.refreshToken,
  }
});