import React, { useState, useEffect } from 'react';
import { notificationService } from '../services/NotificationService';

interface NotificationSettingsProps {
  trackingNumber?: string;
  onClose?: () => void;
  className?: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  trackingNumber,
  onClose,
  className = ''
}) => {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [pushSupported, setPushSupported] = useState(false);
  const [notificationSupported, setNotificationSupported] = useState(false);
  const [email, setEmail] = useState('');
  const [enablePush, setEnablePush] = useState(false);
  const [enableEmail, setEnableEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setPermissionStatus(notificationService.getPermissionStatus());
    setPushSupported(notificationService.isPushSupported());
    setNotificationSupported(notificationService.isNotificationSupported());
  }, []);

  const handleRequestPermission = async () => {
    setIsLoading(true);
    const granted = await notificationService.requestPermission();
    if (granted) {
      setPermissionStatus('granted');
      setEnablePush(true);
    }
    setIsLoading(false);
  };

  const handleTestNotification = async () => {
    const success = await notificationService.showNotification({
      title: 'Test Notification',
      body: 'This is a test notification from Shipping Tracker',
      tag: 'test-notification',
    });

    if (success) {
      alert('Test notification sent!');
    } else {
      alert('Failed to send test notification. Please check permissions.');
    }
  };

  const handleSaveSettings = async () => {
    if (!trackingNumber) return;

    setIsLoading(true);
    
    try {
      if (enablePush || enableEmail) {
        const success = await notificationService.scheduleShipmentNotifications(
          trackingNumber,
          enableEmail ? email : undefined
        );
        
        if (success) {
          alert('Notification settings saved successfully!');
          onClose?.();
        } else {
          alert('Failed to save notification settings. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      alert('An error occurred while saving settings.');
    }
    
    setIsLoading(false);
  };

  const getPermissionStatusColor = () => {
    switch (permissionStatus) {
      case 'granted': return 'text-green-600';
      case 'denied': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const getPermissionStatusText = () => {
    switch (permissionStatus) {
      case 'granted': return 'Granted';
      case 'denied': return 'Denied';
      default: return 'Not Requested';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Browser Support Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Browser Support</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>Notifications:</span>
            <span className={notificationSupported ? 'text-green-600' : 'text-red-600'}>
              {notificationSupported ? 'Supported' : 'Not Supported'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Push Notifications:</span>
            <span className={pushSupported ? 'text-green-600' : 'text-red-600'}>
              {pushSupported ? 'Supported' : 'Not Supported'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Permission Status:</span>
            <span className={getPermissionStatusColor()}>
              {getPermissionStatusText()}
            </span>
          </div>
        </div>
      </div>

      {/* Permission Request */}
      {notificationSupported && permissionStatus !== 'granted' && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Enable Notifications</h4>
          <p className="text-blue-700 text-sm mb-3">
            Allow notifications to receive updates about your shipments.
          </p>
          <button
            onClick={handleRequestPermission}
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {isLoading ? 'Requesting...' : 'Request Permission'}
          </button>
        </div>
      )}

      {/* Notification Options */}
      {notificationSupported && (
        <div className="space-y-4">
          {/* Push Notifications */}
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="push-notifications"
              checked={enablePush}
              onChange={(e) => setEnablePush(e.target.checked)}
              disabled={permissionStatus !== 'granted'}
              className="mt-1"
            />
            <div className="flex-1">
              <label htmlFor="push-notifications" className="font-medium text-gray-900">
                Push Notifications
              </label>
              <p className="text-sm text-gray-600">
                Receive browser notifications for shipment updates
              </p>
              {permissionStatus !== 'granted' && (
                <p className="text-xs text-red-600 mt-1">
                  Permission required
                </p>
              )}
            </div>
          </div>

          {/* Email Notifications */}
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="email-notifications"
              checked={enableEmail}
              onChange={(e) => setEnableEmail(e.target.checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <label htmlFor="email-notifications" className="font-medium text-gray-900">
                Email Notifications
              </label>
              <p className="text-sm text-gray-600 mb-2">
                Receive email updates for shipment status changes
              </p>
              {enableEmail && (
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              )}
            </div>
          </div>

          {/* Test Notification */}
          {permissionStatus === 'granted' && (
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleTestNotification}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Send Test Notification
              </button>
            </div>
          )}

          {/* Save Settings */}
          {trackingNumber && (enablePush || enableEmail) && (
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleSaveSettings}
                disabled={isLoading || (enableEmail && !email)}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Notification Settings'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Not Supported Message */}
      {!notificationSupported && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-medium text-yellow-900 mb-2">Notifications Not Supported</h4>
          <p className="text-yellow-700 text-sm">
            Your browser doesn't support notifications. Please use a modern browser like Chrome, Firefox, or Safari.
          </p>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;