import { https } from 'firebase-functions/v2';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import * as logger from 'firebase-functions/logger';

// Initialize Firebase Admin (only if not already initialized)
if (!getApps().length) {
  initializeApp();
}

const auth = getAuth();
const db = getFirestore();

interface AcceptInviteRequest {
  inviteToken: string;
}

export const acceptInvite = https.onCall<AcceptInviteRequest>(async (request) => {
  const { inviteToken } = request.data;

  // Verify caller is authenticated
  if (!request.auth) {
    throw new https.HttpsError('unauthenticated', 'Você deve estar autenticado para aceitar convites');
  }

  const userId = request.auth.uid;
  const userEmail = request.auth.token.email || '';

  logger.info(`acceptInvite called by ${userId} with token ${inviteToken}`);

  try {
    // Find invite by token using collection group query
    const invitesQuery = await db
      .collectionGroup('staffInvites')
      .where('inviteToken', '==', inviteToken)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (invitesQuery.empty) {
      throw new https.HttpsError('not-found', 'Convite não encontrado ou já foi utilizado');
    }

    const inviteDoc = invitesQuery.docs[0];
    const inviteData = inviteDoc.data();

    // Verify invite hasn't expired
    const now = Timestamp.now();
    if (inviteData.expiresAt.toMillis() < now.toMillis()) {
      throw new https.HttpsError('failed-precondition', 'Este convite expirou');
    }

    // Verify email matches
    if (userEmail.toLowerCase() !== inviteData.email.toLowerCase()) {
      throw new https.HttpsError(
        'permission-denied',
        `Este convite foi enviado para ${inviteData.email}. Você está logado como ${userEmail}`
      );
    }

    const businessId = inviteData.businessId;

    // Create staff document
    const staffData = {
      userId,
      email: userEmail,
      displayName: request.auth.token.name || '',
      role: inviteData.role,
      permissions: inviteData.permissions || {
        manageServices: false,
        manageProfessionals: false,
        manageBookings: false,
        viewReports: false,
        manageSettings: false,
        manageLocations: false,
        exportData: false,
      },
      professionalId: inviteData.professionalId || null,
      active: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await db
      .collection('businesses')
      .doc(businessId)
      .collection('staff')
      .doc(userId)
      .set(staffData);

    // Get current user's custom claims
    const user = await auth.getUser(userId);
    const currentClaims = user.customClaims || {};
    const businessRoles = (currentClaims.businessRoles as Record<string, string>) || {};

    // Add business role to custom claims
    businessRoles[businessId] = inviteData.role;

    const newClaims = { ...currentClaims, userType: 'business_user', businessRoles } as Record<
      string,
      unknown
    >;
    delete newClaims.studentBusinessId;
    delete newClaims.studentCustomerId;
    delete newClaims.customerId;

    // Set custom claims
    await auth.setCustomUserClaims(userId, newClaims as typeof currentClaims & { userType: string });

    // Update user document
    await db.collection('users').doc(userId).update({
      type: 'staff',
      customClaims: newClaims,
      updatedAt: Timestamp.now(),
    });

    // Mark invite as accepted
    await inviteDoc.ref.update({
      status: 'accepted',
      acceptedBy: userId,
      acceptedAt: Timestamp.now(),
    });

    // Log the action
    await db.collection('auditLogs').add({
      timestamp: Timestamp.now(),
      userId,
      userEmail,
      businessId,
      action: 'acceptInvite',
      resource: 'staffInvite',
      resourceId: inviteDoc.id,
      details: {
        role: inviteData.role,
      },
    });

    logger.info(`Staff invite accepted by ${userId} for business ${businessId}`);

    return {
      success: true,
      message: 'Convite aceito com sucesso',
      businessId,
      role: inviteData.role,
    };
  } catch (error) {
    logger.error(`Error accepting invite:`, error);

    if (error instanceof https.HttpsError) {
      throw error;
    }

    throw new https.HttpsError('internal', 'Erro ao aceitar convite');
  }
});
