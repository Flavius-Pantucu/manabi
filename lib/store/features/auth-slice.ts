import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface User {
  name: string;
  email: string;
  avatarInitials: string;
  avatarUrl?: string; // NEW
  joinedAt: string;
  role: "user" | "admin"; // NEW
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
}

const initialState: AuthState = {
  user: null,
  isLoading: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isLoading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    updateUser: (
      state,
      action: PayloadAction<
        Partial<Pick<User, "name" | "email" | "avatarUrl" | "role">>
      >,
    ) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        if (action.payload.name) {
          state.user.avatarInitials = action.payload.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
        }
      }
    },
    clearUser: (state) => {
      state.user = null;
      state.isLoading = false;
    },
  },
});

export const { setUser, setLoading, updateUser, clearUser } = authSlice.actions;
export default authSlice.reducer;
