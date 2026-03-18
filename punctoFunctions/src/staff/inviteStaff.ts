import { https } from 'firebase-functions/v2';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import * as logger from 'firebase-functions/logger';
import { randomUUID } from 'crypto';
import { sendZeptoEmail } from '../lib/zeptomail';

// Initialize Firebase Admin (only if not already initialized)
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

interface StaffPermissions {
  manageServices: boolean;
  manageProfessionals: boolean;
  manageBookings: boolean;
  viewReports: boolean;
  manageSettings: boolean;
  manageLocations: boolean;
  exportData: boolean;
}

interface InviteStaffRequest {
  businessId: string;
  email: string;
  role: 'owner' | 'manager' | 'professional';
  permissions?: StaffPermissions;
  professionalId?: string;
}

export const inviteStaff = https.onCall<InviteStaffRequest>(async (request) => {
  const { businessId, email, role, permissions, professionalId } = request.data;

  // Verify caller is authenticated
  if (!request.auth) {
    throw new https.HttpsError('unauthenticated', 'Você deve estar autenticado para convidar funcionários');
  }

  const callerId = request.auth.uid;
  const callerClaims = request.auth.token;

  logger.info(`inviteStaff called by ${callerId} for business ${businessId}`);

  try {
    // Authorization check: Only business owners or platform admins can invite staff
    const callerBusinessRoles = (callerClaims.businessRoles as Record<string, string>) || {};
    const isOwner = callerBusinessRoles[businessId] === 'owner';
    const isPlatformAdmin = callerClaims.platformAdmin === true;

    if (!isOwner && !isPlatformAdmin) {
      throw new https.HttpsError(
        'permission-denied',
        'Apenas proprietários podem convidar funcionários'
      );
    }

    // Validate business exists
    const businessDoc = await db.collection('businesses').doc(businessId).get();
    if (!businessDoc.exists) {
      throw new https.HttpsError('not-found', 'Negócio não encontrado');
    }

    // Validate permissions are provided for managers
    if (role === 'manager' && !permissions) {
      throw new https.HttpsError(
        'invalid-argument',
        'Permissões devem ser especificadas para gerentes'
      );
    }

    // Generate unique invite token
    const inviteToken = randomUUID();

    // Calculate expiration date (7 days from now)
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    // Create staff invite document
    const inviteData = {
      businessId,
      email: email.toLowerCase(),
      role,
      permissions: permissions || null,
      professionalId: professionalId || null,
      inviteToken,
      invitedBy: callerId,
      invitedAt: Timestamp.now(),
      expiresAt,
      status: 'pending',
    };

    const inviteRef = await db
      .collection('businesses')
      .doc(businessId)
      .collection('staffInvites')
      .add(inviteData);

    logger.info(`Staff invite created: ${inviteRef.id}`);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://puncto.com.br';
    const inviteLink = `${appUrl}/auth/accept-invite?token=${inviteToken}`;

    // Send invite email via ZeptoMail
    const business = businessDoc.data();
    const result = await sendZeptoEmail({
      to: email,
      subject: `Convite para acessar ${business?.displayName || 'Puncto'}`,
      html: `
        <p>Olá,</p>
        <p>Você foi convidado para fazer parte da equipe de <strong>${business?.displayName || 'Puncto'}</strong> como ${role === 'owner' ? 'proprietário' : role === 'manager' ? 'gerente' : 'profissional'}.</p>
        <p>Clique no link abaixo para aceitar o convite e configurar sua conta:</p>
        <p><a href="${inviteLink}" style="color:#2563eb;">Aceitar convite</a></p>
        <p>Ou copie e cole no navegador: ${inviteLink}</p>
        <p>Este convite expira em 7 dias.</p>
        <p>— Equipe Puncto</p>
      `,
    });
    if (!result.success) {
      logger.warn(`[inviteStaff] Email failed for ${email}: ${result.error}`);
    }

    // Log the action
    await db.collection('auditLogs').add({
      timestamp: Timestamp.now(),
      userId: callerId,
      userEmail: request.auth.token.email || '',
      businessId,
      action: 'inviteStaff',
      resource: 'staffInvite',
      resourceId: inviteRef.id,
      details: {
        email,
        role,
      },
    });

    return {
      success: true,
      message: 'Convite enviado com sucesso',
      inviteId: inviteRef.id,
      inviteLink,
      inviteToken, // For development/testing
    };
  } catch (error) {
    logger.error(`Error inviting staff to business ${businessId}:`, error);

    if (error instanceof https.HttpsError) {
      throw error;
    }

    throw new https.HttpsError('internal', 'Erro ao enviar convite');
  }
});
