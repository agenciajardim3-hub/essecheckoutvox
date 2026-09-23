import { useEffect, useCallback } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const useNotifications = () => {
  const isNative = Capacitor.isNativePlatform();

  // Request permissions on mount (Android 13+)
  useEffect(() => {
    if (!isNative) return;

    const requestPermissions = async () => {
      try {
        await LocalNotifications.requestPermissions();
      } catch (error) {
        console.warn('Notification permissions not granted:', error);
      }
    };

    requestPermissions();
  }, [isNative]);

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (isNative) {
      try {
        const result = await LocalNotifications.requestPermissions();
        return result.display === 'granted';
      } catch (error) {
        console.warn('Notification permissions not granted:', error);
        return false;
      }
    }

    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    try {
      return (await Notification.requestPermission()) === 'granted';
    } catch (error) {
      console.warn('Browser notification permission was not granted:', error);
      return false;
    }
  }, [isNative]);

  const sendNotification = useCallback(
    async (options: {
      title: string;
      body: string;
      id?: number;
      smallIcon?: string;
      largeBody?: string;
      summary?: string;
    }) => {
      if (!isNative) {
        // For web, use the Notifications API if available
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(options.title, {
            body: options.body,
            icon: options.smallIcon || '/icon.png',
          });
        }
        return;
      }

      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              title: options.title,
              body: options.body,
              id: options.id || Math.floor(Math.random() * 10000),
              smallIcon: options.smallIcon,
              largeBody: options.largeBody,
              schedule: { at: new Date(Date.now() + 1000) }, // 1 second delay to ensure it shows
            },
          ],
        });
      } catch (error) {
        console.error('Error sending notification:', error);
      }
    },
    [isNative]
  );

  const sendNewLeadNotification = useCallback(
    async (leadName: string, product: string) => {
      await sendNotification({
        title: '🎉 Novo Cadastro!',
        body: `${leadName} se cadastrou em "${product}"`,
        // Android espera um ID inteiro compatível com o limite do sistema.
        id: Math.floor(Date.now() / 1000) % 2147483647,
        summary: 'Novo lead recebido',
      });
    },
    [sendNotification]
  );

  return {
    sendNotification,
    sendNewLeadNotification,
    requestNotificationPermission,
    isNative,
  };
};
