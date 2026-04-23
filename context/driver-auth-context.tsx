import React, { createContext, useContext, useMemo, useState } from 'react';

import { API_BASE_URL, parseApiResponse } from '@/lib/api';
import { clearDriverToken, setDriverToken } from '@/lib/driver-session';

export type DriverVehicle = {
  licensePlate?: string;
  carModel?: string;
  year?: string;
  color?: string;
  category?: string;
  registrationNumber?: string;
  status?: string;
};

export type DriverDocument = {
  documentType: 'license' | 'insurance' | 'registration';
  fileUrl?: string;
  status: 'missing' | 'review' | 'approved' | 'rejected';
  submittedAt?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string;
};

export type DriverProfile = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  emergencyContact?: string;
  profileImageUrl?: string;
  status?: string;
  vehicle?: DriverVehicle;
  documents?: DriverDocument[];
  security?: {
    twoStepVerificationEnabled?: boolean;
  };
};

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
};

type UpdateProfilePayload = {
  fullName: string;
  email: string;
  phoneNumber: string;
  emergencyContact?: string;
  profileImageUrl?: string;
};

type UpdateVehiclePayload = Required<Omit<DriverVehicle, 'status'>>;

type AuthResponse = {
  token: string;
  driver: DriverProfile;
};

type DriverResponse = {
  driver: DriverProfile;
};

type DriverAuthContextValue = {
  driver: DriverProfile | null;
  token: string | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
  updateVehicle: (payload: UpdateVehiclePayload) => Promise<void>;
  updateDocument: (documentType: DriverDocument['documentType'], fileUrl: string) => Promise<void>;
  updateSecurity: (twoStepVerificationEnabled: boolean) => Promise<void>;
  logout: () => void;
};

const DriverAuthContext = createContext<DriverAuthContextValue | null>(null);

export function DriverAuthProvider({ children }: { children: React.ReactNode }) {
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const persistAuth = (nextToken: string, nextDriver: DriverProfile) => {
    setToken(nextToken);
    setDriver(nextDriver);
    setDriverToken(nextToken);
  };

  const getRequestErrorMessage = (error: unknown, fallbackMessage: string) => {
    if (error instanceof Error) {
      if (error.message === 'Network request failed' || error.message === 'Failed to fetch') {
        return 'Unable to reach the driver API. Check EXPO_PUBLIC_API_URL in .env and make sure the backend is running on the same network.';
      }

      return error.message;
    }

    return fallbackMessage;
  };

  const login = async ({ email, password }: LoginPayload) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/driver-auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await parseApiResponse<AuthResponse>(response);
      persistAuth(data.token, data.driver);
    } catch (error) {
      throw new Error(getRequestErrorMessage(error, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const register = async ({ fullName, email, phoneNumber, password }: RegisterPayload) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/driver-auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fullName, email, phoneNumber, password }),
      });

      const data = await parseApiResponse<AuthResponse>(response);
      persistAuth(data.token, data.driver);
    } catch (error) {
      throw new Error(getRequestErrorMessage(error, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  const requireToken = () => {
    if (!token) {
      throw new Error('Please sign in again.');
    }

    return token;
  };

  const updateProfile = async (payload: UpdateProfilePayload) => {
    const nextToken = requireToken();
    const response = await fetch(`${API_BASE_URL}/driver-auth/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nextToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await parseApiResponse<DriverResponse>(response);
    setDriver(data.driver);
  };

  const updateVehicle = async (payload: UpdateVehiclePayload) => {
    const nextToken = requireToken();
    const response = await fetch(`${API_BASE_URL}/driver-auth/me/vehicle`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nextToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await parseApiResponse<DriverResponse>(response);
    setDriver(data.driver);
  };

  const updateDocument = async (documentType: DriverDocument['documentType'], fileUrl: string) => {
    const nextToken = requireToken();
    const response = await fetch(`${API_BASE_URL}/driver-auth/me/documents/${documentType}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nextToken}`,
      },
      body: JSON.stringify({ fileUrl }),
    });

    const data = await parseApiResponse<DriverResponse>(response);
    setDriver(data.driver);
  };

  const updateSecurity = async (twoStepVerificationEnabled: boolean) => {
    const nextToken = requireToken();
    const response = await fetch(`${API_BASE_URL}/driver-auth/me/security`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nextToken}`,
      },
      body: JSON.stringify({ twoStepVerificationEnabled }),
    });

    const data = await parseApiResponse<DriverResponse>(response);
    setDriver(data.driver);
  };

  const logout = () => {
    setDriver(null);
    setToken(null);
    clearDriverToken();
  };

  const value = useMemo(
    () => ({
      driver,
      token,
      loading,
      login,
      register,
      updateProfile,
      updateVehicle,
      updateDocument,
      updateSecurity,
      logout,
    }),
    [driver, token, loading]
  );

  return <DriverAuthContext.Provider value={value}>{children}</DriverAuthContext.Provider>;
}

export function useDriverAuth() {
  const context = useContext(DriverAuthContext);
  if (!context) {
    throw new Error('useDriverAuth must be used inside DriverAuthProvider');
  }

  return context;
}
