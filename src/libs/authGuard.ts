import { useUserStore } from '@/store/user.store';

export const authGuard = () => {
    const userStore = useUserStore();
    if (!userStore.isAuthenticated) {
        return { name: 'Login' };
    }
    return true;
};