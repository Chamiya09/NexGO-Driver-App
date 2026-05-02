import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { API_BASE_URL, parseApiResponse } from '@/lib/api';
import { clearDriverToken, loadDriverToken, setDriverToken } from '@/lib/driver-session';

export type DriverDocument = {
  documentType: 'license' | 'insurance' | 'registration';
  fileUrl?: string;
  status: 'missing' | 'review' | 'approved' | 'rejected';
  submittedAt?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string;
};

export type DriverVehicle = {
  category: 'Bike' | 'Tuk' | 'Mini' | 'Car' | 'Van';
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  color: string;
  seats: number;
};

export type DriverProfile = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  emergencyContact?: string;
  profileImageUrl?: string;
  status?: string;
  isOnline?: boolean;
  documents?: DriverDocument[];
  vehicle?: DriverVehicle | null;
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

type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

type CreateVehiclePayload = {
  category: DriverVehicle['category'];
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  color: string;
  seats: number;
};

type UpdateVehiclePayload = CreateVehiclePayload;

type AuthResponse = {
  token: string;
  driver: DriverProfile;
};

type DriverResponse = {
  driver: DriverProfile;
};

type VehicleResponse = {
  vehicle: DriverVehicle | null;
};

type DriverAuthContextValue = {
  driver: DriverProfile | null;
  token: string | null;
  loading: boolean;
  refreshDriver: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
  changePassword: (payload: ChangePasswordPayload) => Promise<void>;
  getVehicle: () => Promise<DriverVehicle | null>;
  createVehicle: (payload: CreateVehiclePayload) => Promise<void>;
  updateVehicle: (payload: UpdateVehiclePayload) => Promise<void>;
  deleteVehicle: () => Promise<void>;
  updateDocument: (documentType: DriverDocument['documentType'], fileUrl: string) => Promise<void>;
  updateSecurity: (twoStepVerificationEnabled: boolean) => Promise<void>;
  logout: () => Promise<void>;
};

const DriverAuthContext = createContext<DriverAuthContextValue | null>(null);

export function DriverAuthProvider({ children }: { children: React.ReactNode }) {
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(true);

  const persistAuth = async (nextToken: string, nextDriver: DriverProfile) => {
    setToken(nextToken);
    setDriver(nextDriver);
    await setDriverToken(nextToken);
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
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await parseApiResponse<AuthResponse>(response);
      await persistAuth(data.token, data.driver);
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
        credentials: 'include',
        body: JSON.stringify({ fullName, email, phoneNumber, password }),
      });

      const data = await parseApiResponse<AuthResponse>(response);
      await persistAuth(data.token, data.driver);
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

  const refreshDriver = async () => {
    const nextToken = requireToken();
    const response = await fetch(`${API_BASE_URL}/driver-auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${nextToken}`,
      },
    });

    const data = await parseApiResponse<DriverResponse>(response);
    setDriver(data.driver);
  };

  const changePassword = async ({ currentPassword, newPassword, confirmNewPassword }: ChangePasswordPayload) => {
    const nextToken = requireToken();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/driver-auth/me/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${nextToken}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmNewPassword,
        }),
      });

      await parseApiResponse<{ message: string }>(response);
    } finally {
      setLoading(false);
    }
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

  const getVehicle = useCallback(async () => {
    if (!token) {
      throw new Error('Please sign in again.');
    }

    const response = await fetch(`${API_BASE_URL}/driver-auth/me/vehicle`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await parseApiResponse<VehicleResponse>(response);
    setDriver((currentDriver) => {
      if (!currentDriver) {
        return currentDriver;
      }

      return {
        ...currentDriver,
        vehicle: data.vehicle,
      };
    });

    return data.vehicle;
  }, [token]);

  const createVehicle = async (payload: CreateVehiclePayload) => {
    const nextToken = requireToken();
    const response = await fetch(`${API_BASE_URL}/driver-auth/me/vehicle`, {
      method: 'POST',
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

  const deleteVehicle = async () => {
    const nextToken = requireToken();
    const response = await fetch(`${API_BASE_URL}/driver-auth/me/vehicle`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${nextToken}`,
      },
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

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/driver-auth/logout`, { method: 'POST' });
    } catch {
      // Ignore logout network errors and clear local session anyway.
    }

    setDriver(null);
    setToken(null);
    await clearDriverToken();
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const storedToken = await loadDriverToken();
        if (!mounted) return;

        if (storedToken) {
          setToken(storedToken);
          const response = await fetch(`${API_BASE_URL}/driver-auth/me`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          });

          const data = await parseApiResponse<DriverResponse>(response);
          if (mounted) {
            setDriver(data.driver);
          }
        }
      } catch {
        await clearDriverToken();
        if (mounted) {
          setToken(null);
          setDriver(null);
        }
      } finally {
        if (mounted) {
          setHydrating(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!token || hydrating) {
      return;
    }

    refreshDriver().catch(() => {
      void logout();
    });
  }, [token, hydrating]);

  const value = useMemo(
    () => ({
      driver,
      token,
      loading,
      refreshDriver,
      login,
      register,
      updateProfile,
      changePassword,
      getVehicle,
      createVehicle,
      updateVehicle,
      deleteVehicle,
      updateDocument,
      updateSecurity,
      logout,
    }),
    [driver, token, loading, hydrating]
  );

  return (
    <DriverAuthContext.Provider value={{ ...value, loading: loading || hydrating }}>
      {children}
    </DriverAuthContext.Provider>
  );
}

export function useDriverAuth() {
  const context = useContext(DriverAuthContext);
  if (!context) {
    throw new Error('useDriverAuth must be used inside DriverAuthProvider');
  }

  return context;
}
