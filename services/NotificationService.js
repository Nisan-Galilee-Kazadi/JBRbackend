const Message = require('../models/Message');

class NotificationService {
    constructor() {
        this.subscribers = new Map(); // Pour les notifications temps réel (WebSocket)
        this.emailQueue = []; // File d'attente pour les emails
    }

    // S'abonner aux notifications temps réel
    subscribe(clientId, callback) {
        this.subscribers.set(clientId, callback);
        return () => this.subscribers.delete(clientId);
    }

    // Notifier tous les abonnés
    notify(event, data) {
        this.subscribers.forEach(callback => {
            try {
                callback({ event, data, timestamp: new Date() });
            } catch (error) {
                console.error('Erreur notification client:', error);
            }
        });
    }

    // Notification pour nouveau message
    async notifyNewMessage(message) {
        const notification = {
            type: 'new_message',
            title: 'Nouveau message reçu',
            message: `Message de ${message.name}: ${message.subject}`,
            priority: message.priority,
            data: {
                id: message._id,
                name: message.name,
                email: message.email,
                subject: message.subject,
                priority: message.priority,
                category: message.category,
                createdAt: message.createdAt
            }
        };

        // Notification temps réel
        this.notify('new_message', notification);

        // Email notification (optionnel)
        await this.sendEmailNotification(notification);

        return notification;
    }

    // Notification pour message urgent
    async notifyUrgentMessage(message) {
        const notification = {
            type: 'urgent_message',
            title: '⚠️ MESSAGE URGENT',
            message: `Message urgent de ${message.name}: ${message.subject}`,
            priority: 'urgent',
            data: {
                id: message._id,
                name: message.name,
                email: message.email,
                subject: message.subject,
                message: message.message.substring(0, 200) + '...',
                phone: message.phone
            }
        };

        // Notification immédiate
        this.notify('urgent_message', notification);

        // Email immédiat pour les messages urgents
        await this.sendEmailNotification(notification, true);

        return notification;
    }

    // Notification pour changement de statut
    async notifyStatusChange(messageId, oldStatus, newStatus, assignedTo = null) {
        const notification = {
            type: 'status_change',
            title: 'Statut de message mis à jour',
            message: `Message #${messageId.toString().slice(-6)}: ${oldStatus} → ${newStatus}`,
            data: {
                messageId,
                oldStatus,
                newStatus,
                assignedTo,
                timestamp: new Date()
            }
        };

        this.notify('status_change', notification);
        return notification;
    }

    // Envoi d'email notification
    async sendEmailNotification(notification, urgent = false) {
        try {
            // Pour l'instant, simulation (à remplacer avec un vrai service email)
            console.log(`[${urgent ? 'URGENT' : 'INFO'}] Notification email:`, notification.title);
            console.log(`Message: ${notification.message}`);
            
            // Logique d'envoi d'email à implémenter avec nodemailer ou autre service
            // Exemple:
            // await emailService.send({
            //     to: 'admin@jeuneballonreves.com',
            //     subject: notification.title,
            //     text: notification.message,
            //     priority: urgent ? 'high' : 'normal'
            // });

            return { success: true, message: 'Email envoyé' };
        } catch (error) {
            console.error('Erreur envoi email notification:', error);
            return { success: false, error: error.message };
        }
    }

    // Notifications quotidiennes (résumé)
    async sendDailySummary() {
        try {
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            
            const stats = await Message.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startOfDay }
                    }
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const totalToday = await Message.countDocuments({
                createdAt: { $gte: startOfDay }
            });

            const urgentToday = await Message.countDocuments({
                createdAt: { $gte: startOfDay },
                priority: 'urgent'
            });

            const summary = {
                type: 'daily_summary',
                title: 'Résumé quotidien des messages',
                message: `${totalToday} messages reçus aujourd'hui, dont ${urgentToday} urgents`,
                data: {
                    date: today.toDateString(),
                    total: totalToday,
                    urgent: urgentToday,
                    byStatus: stats
                }
            };

            await this.sendEmailNotification(summary);
            return summary;
        } catch (error) {
            console.error('Erreur résumé quotidien:', error);
            throw error;
        }
    }

    // Nettoyage des abonnés inactifs
    cleanupSubscribers() {
        // Logique pour nettoyer les connexions fermées
        // À implémenter avec WebSocket
    }
}

module.exports = new NotificationService();
