/**
 * Server-side user creation utilities
 * These functions should be called from API routes, not client-side
 */

import { auth, db } from '../firebaseAdmin';
import { UserType, CustomClaims } from '@/types/user';
import { Timestamp } from 'firebase-admin/firestore';

interface CreateUserParams {
  email: string;
  password: string;
  displayName: string;
  userType: UserType;
  customClaims?: Partial<CustomClaims>;
  additionalData?: Record<string, any>;
}

/**
 * Create a new user with proper user type and custom claims
 * This is a server-side only function (use in API routes)
 */
export async function createUser(params: CreateUserParams) {
  const { email, password, displayName, userType, customClaims = {}, additionalData = {} } = params;

  try {
    // 1. Create Firebase Auth user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: false,
    });

    // 2. Set custom claims based on user type
    const claims: CustomClaims = {
      userType,
      ...customClaims,
    };

    // Validate custom claims match user type
    if (userType === 'platform_admin') {
      claims.platformAdmin = customClaims.platformAdmin || false;
      claims.platformRole = customClaims.platformRole || 'analyst';
      // Remove business-specific claims
      delete claims.businessRoles;
      delete claims.primaryBusinessId;
      delete claims.customerId;
      delete claims.studentBusinessId;
      delete claims.studentCustomerId;
    } else if (userType === 'business_user') {
      claims.businessRoles = customClaims.businessRoles || {};
      claims.primaryBusinessId = customClaims.primaryBusinessId;
      if (customClaims.professionalId) claims.professionalId = customClaims.professionalId;
      // Remove platform and customer claims
      delete claims.platformAdmin;
      delete claims.platformRole;
      delete claims.customerId;
      delete claims.studentBusinessId;
      delete claims.studentCustomerId;
    } else if (userType === 'customer') {
      claims.customerId = userRecord.uid;
      // Remove platform and business claims
      delete claims.platformAdmin;
      delete claims.platformRole;
      delete claims.businessRoles;
      delete claims.primaryBusinessId;
      delete claims.studentBusinessId;
      delete claims.studentCustomerId;
    } else if (userType === 'student') {
      claims.studentBusinessId = customClaims.studentBusinessId;
      claims.studentCustomerId = customClaims.studentCustomerId;
      delete claims.platformAdmin;
      delete claims.platformRole;
      delete claims.businessRoles;
      delete claims.primaryBusinessId;
      delete claims.customerId;
    }

    await auth.setCustomUserClaims(userRecord.uid, claims);

    // 3. Create Firestore user document
    const userDocRef = db.collection('users').doc(userRecord.uid);
    const now = Timestamp.now();

    const userData = {
      id: userRecord.uid,
      email,
      displayName,
      photoURL: '',
      type: userType,
      customClaims: claims,
      phone: '',
      preferences: {
        language: 'pt-BR',
        timezone: 'America/Sao_Paulo',
      },
      createdAt: now,
      lastLoginAt: now,
      consentVersion: '1.0',
      marketingConsent: false,
      ...additionalData,
    };

    // Add type-specific fields
    if (userType === 'business_user' && customClaims.primaryBusinessId) {
      (userData as any).primaryBusinessId = customClaims.primaryBusinessId;
    }

    if (userType === 'customer') {
      (userData as any).loyaltyPoints = 0;
    }
    if (userType === 'student') {
      (userData as any).studentBusinessId = customClaims.studentBusinessId;
      (userData as any).studentCustomerId = customClaims.studentCustomerId;
    }

    await userDocRef.set(userData);

    return {
      success: true,
      userId: userRecord.uid,
      user: userData,
    };
  } catch (error: any) {
    console.error('[createUser] Error creating user:', error);
    throw new Error(`Failed to create user: ${error.message}`);
  }
}

/**
 * Create a platform admin user
 */
export async function createPlatformAdmin(params: {
  email: string;
  password: string;
  displayName: string;
  role?: 'super_admin' | 'support' | 'analyst';
}) {
  return createUser({
    email: params.email,
    password: params.password,
    displayName: params.displayName,
    userType: 'platform_admin',
    customClaims: {
      platformAdmin: true,
      platformRole: params.role || 'analyst',
    },
  });
}

/**
 * Create a business user (owner, manager, or professional)
 */
export async function createBusinessUser(params: {
  email: string;
  password: string;
  displayName: string;
  businessId: string;
  role: 'owner' | 'manager' | 'professional';
}) {
  return createUser({
    email: params.email,
    password: params.password,
    displayName: params.displayName,
    userType: 'business_user',
    customClaims: {
      businessRoles: {
        [params.businessId]: params.role,
      },
      primaryBusinessId: params.businessId,
    },
  });
}

/**
 * Create a customer user
 */
export async function createCustomer(params: {
  email: string;
  password: string;
  displayName: string;
  phone?: string;
}) {
  return createUser({
    email: params.email,
    password: params.password,
    displayName: params.displayName,
    userType: 'customer',
    additionalData: {
      phone: params.phone || '',
    },
  });
}
