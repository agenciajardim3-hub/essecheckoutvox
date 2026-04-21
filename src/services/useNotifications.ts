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
              summary: options.summary,
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
        id: Date.now(),
        summary: 'Novo lead recebido',
      });
    },
    [sendNotification]
  );

  return {
    sendNotification,
    sendNewLeadNotification,
    isNative,
  };
};
