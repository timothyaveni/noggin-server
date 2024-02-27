import { prisma } from './prisma.js';

export const getProviderCredentialsForNoggin_OMNISCIENT = async (
  nogginId: number,
) => {
  const noggin = await prisma.noggin.findUnique({
    where: { id: nogginId },
    select: {
      aiModel: {
        select: {
          modelProvider: {
            select: {
              id: true,
              credentialsSchemaVersion: true,
              needsCredentials: true,
            },
          },
        },
      },
      parentOrgId: true,
      userOwnerId: true,
    },
  });

  if (!noggin) {
    throw new Error('Noggin not found');
  }

  let providerCredentials = null;
  if (noggin.parentOrgId) {
    providerCredentials = await prisma.modelProviderOrgCredentials.findUnique({
      where: {
        modelProviderId_organizationId_credentialsVersion: {
          modelProviderId: noggin.aiModel.modelProvider.id,
          organizationId: noggin.parentOrgId,
          credentialsVersion:
            noggin.aiModel.modelProvider.credentialsSchemaVersion,
        },
      },
      select: {
        credentials: true,
        credentialsVersion: true,
      },
    });
  } else {
    if (!noggin.userOwnerId) {
      throw new Error('????? no user id on noggin');
    }

    providerCredentials =
      await prisma.modelProviderPersonalCredentials.findUnique({
        where: {
          modelProviderId_userId_credentialsVersion: {
            modelProviderId: noggin.aiModel.modelProvider.id,
            userId: noggin.userOwnerId,
            credentialsVersion:
              noggin.aiModel.modelProvider.credentialsSchemaVersion,
          },
        },
        select: {
          credentials: true,
          credentialsVersion: true,
        },
      });
  }

  return {
    providerCredentials,
    needsCredentials: noggin.aiModel.modelProvider.needsCredentials,
  };
};
