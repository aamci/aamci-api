import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BlocksService } from '../blocks/blocks.service';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private blocksService: BlocksService,
  ) {}

  /**
   * Récupérer toutes les conversations d'un utilisateur
   */
  async getConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [
          { participant1Id: userId },
          { participant2Id: userId },
        ],
      },
      include: {
        participant1: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            role: true,
            doctorProfile: {
              select: { specialty: true },
            },
          },
        },
        participant2: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            role: true,
            doctorProfile: {
              select: { specialty: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true,
            read: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Compter les messages non lus par conversation (exclure les conv avec utilisateurs bloqués)
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const otherId =
          conv.participant1Id === userId ? conv.participant2Id : conv.participant1Id;
        const blocked = await this.blocksService.eitherBlocked(userId, otherId);

        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            read: false,
          },
        });

        const otherParticipant =
          conv.participant1Id === userId ? conv.participant2 : conv.participant1;
        const lastMessage = conv.messages[0] || null;

        return {
          id: conv.id,
          otherParticipant,
          lastMessage: blocked ? null : (lastMessage?.content || null),
          lastMessageTime: lastMessage?.createdAt || conv.createdAt,
          unreadCount: blocked ? 0 : unreadCount,
          isBlocked: blocked,
        };
      }),
    );

    return conversationsWithUnread;
  }

  /**
   * Récupérer les messages d'une conversation
   */
  async getMessages(conversationId: string, userId: string, take = 50, cursor?: string) {
    // Vérifier que l'utilisateur participe à cette conversation
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation non trouvée');
    }

    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      throw new ForbiddenException('Accès non autorisé');
    }

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    // Marquer comme lus les messages de l'autre utilisateur
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        read: false,
      },
      data: { read: true },
    });

    return messages.reverse();
  }

  /**
   * Envoyer un message
   */
  async sendMessage(
    userId: string,
    dto: {
      conversationId?: string;
      recipientId?: string;
      content: string;
      type?: string;
    },
  ) {
    let conversationId = dto.conversationId;

    // Si pas de conversationId, trouver ou créer la conversation
    if (!conversationId && dto.recipientId) {
      const existing = await this.prisma.conversation.findFirst({
        where: {
          OR: [
            { participant1Id: userId, participant2Id: dto.recipientId },
            { participant1Id: dto.recipientId, participant2Id: userId },
          ],
        },
      });

      if (existing) {
        conversationId = existing.id;
      } else {
        // Vérifier que le destinataire existe
        const recipient = await this.prisma.user.findUnique({
          where: { id: dto.recipientId },
        });

        if (!recipient) {
          throw new NotFoundException('Destinataire non trouvé');
        }

        const newConversation = await this.prisma.conversation.create({
          data: {
            participant1Id: userId,
            participant2Id: dto.recipientId,
          },
        });
        conversationId = newConversation.id;
      }
    }

    if (!conversationId) {
      throw new NotFoundException('Conversation non trouvée');
    }

    // Vérifier l'accès
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation non trouvée');
    }

    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      throw new ForbiddenException('Accès non autorisé');
    }

    // Refuser si l'un des participants a bloqué l'autre
    const recipientId =
      conversation.participant1Id === userId
        ? conversation.participant2Id
        : conversation.participant1Id;
    const blocked = await this.blocksService.eitherBlocked(userId, recipientId);
    if (blocked) {
      throw new ForbiddenException('Impossible d\'envoyer un message : utilisateur bloqué');
    }

    // Créer le message
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: dto.content,
        type: (dto.type as any) || 'TEXT',
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Mettre à jour le timestamp de la conversation
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Créer une notification pour le destinataire
    const recipientUserId =
      conversation.participant1Id === userId
        ? conversation.participant2Id
        : conversation.participant1Id;

    const sender = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });

    try {
      await this.notificationsService.create({
        userId: recipientUserId,
        type: 'NEW_MESSAGE',
        title: 'Nouveau message',
        message: `${sender?.fullName || 'Un utilisateur'} vous a envoyé un message`,
      });
    } catch (error) {
      console.error('Failed to create message notification:', error);
    }

    return message;
  }

  /**
   * Marquer les messages comme lus
   */
  async markAsRead(conversationId: string, userId: string) {
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        read: false,
      },
      data: { read: true },
    });

    return { success: true };
  }

  /**
   * Compter les messages non lus
   */
  async getUnreadCount(userId: string) {
    const count = await this.prisma.message.count({
      where: {
        conversation: {
          OR: [
            { participant1Id: userId },
            { participant2Id: userId },
          ],
        },
        senderId: { not: userId },
        read: false,
      },
    });

    return { count };
  }
}
