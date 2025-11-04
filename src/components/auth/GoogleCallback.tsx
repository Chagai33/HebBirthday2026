import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleCalendar } from '../../contexts/GoogleCalendarContext';
import { useToast } from '../../hooks/useToast';
import { logger } from '../../utils/logger';

export default function GoogleCallback() {
  const navigate = useNavigate();
  const { exchangeAuthCode, refreshStatus } = useGoogleCalendar();
  const { showToast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        if (error) {
          throw new Error(`שגיאת Google: ${error}`);
        }

        if (!code) {
          throw new Error('לא התקבל קוד אימות מ-Google');
        }

        await exchangeAuthCode(code);
        await refreshStatus();

        showToast('החיבור ליומן Google הושלם בהצלחה', 'success');

        let returnUrl = '/';
        if (state) {
          try {
            const stateData = JSON.parse(state);
            returnUrl = stateData.returnUrl || '/';
          } catch (e) {
            logger.warn('Could not parse state:', e);
          }
        }

        navigate(returnUrl);
      } catch (error: any) {
        logger.error('Error in Google callback:', error);
        showToast(error.message || 'שגיאה בחיבור ליומן Google', 'error');
        navigate('/');
      }
    };

    handleCallback();
  }, [navigate, exchangeAuthCode, refreshStatus, showToast]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">מתחבר ליומן Google...</p>
      </div>
    </div>
  );
}
