/**
 * Security Provider Component
 * Provides security context and utilities to child components
 * Requirements: 9.1, 9.2
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { secureSessionManager } from '../utils/secureSessionManagement';
import type { SessionSecurityInfo } from '../utils/secureSessionManagement';
import { checkRateLimit } from '../utils/rateLimiting';
import type { RateLimitResult } from '../utils/rateLimiting';
import { getSecurityConfig, validateSecurityConfig } from '../config/security';
import { useNotifications } from '../store/notificationStore';

interface SecurityContextType {
  sessionSecurity: SessionSecurityInfo | null;
  checkRateLimit: (endpoint: string) => RateLimitResult;
  validateInput: (input: string, rules?: any) => { isValid: boolean; errors: string[] };
  securityConfig: ReturnType<typeof getSecurityConfig>;
  isSecurityEnabled: boolean;
}

const SecurityContext = createContext<SecurityContextType | null>(null);

interface SecurityProviderProps {
  children: ReactNode;
  enableSecurity?: boolean;
}

export function SecurityProvider({ children, enableSecurity = true }: SecurityProviderProps) {
  const [sessionSecurity, setSessionSecurity] = useState<SessionSecurityInfo | null>(null);
  const [securityConfig] = useState(() => getSecurityConfig());
  const { showError, showWarning } = useNotifications();

  useEffect(() => {
    if (!enableSecurity) return;

    // Validate security configuration on startup
    const configValidation = validateSecurityConfig(securityConfig);
    if (!configValidation.isValid) {
      console.error('Security configuration validation failed:', configValidation.errors);
      showError('Security Configuration Error', 'Security configuration is invalid. Please check the console for details.');
      return;
    }

    // Initialize secure session management
    const currentSession = secureSessionManager.getCurrentSession();
    if (currentSession) {
      const security = secureSessionManager.validateSessionSecurity(currentSession.sessionId);
      setSessionSecurity(security);

      // Show warnings for security issues
      if (security.warnings.length > 0) {
        security.warnings.forEach(warning => {
          showWarning('Security Warning', warning);
        });
      }

      // Handle expired or invalid sessions
      if (!security.isValid) {
        if (security.isExpired) {
          showError('Session Expired', 'Your session has expired. Please refresh the page to continue.');
        } else if (security.securityScore < 50) {
          showWarning('Security Alert', 'Potential security issue detected. Please refresh the page if you experience any issues.');
        }
      }
    }

    // Set up periodic security checks
    const securityCheckInterval = setInterval(() => {
      const session = secureSessionManager.getCurrentSession();
      if (session) {
        const security = secureSessionManager.validateSessionSecurity(session.sessionId);
        setSessionSecurity(security);

        // Handle security degradation
        if (security.securityScore < 30) {
          showError('Security Alert', 'Multiple security issues detected. Please refresh the page.');
          secureSessionManager.invalidateSession(session.sessionId);
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => {
      clearInterval(securityCheckInterval);
    };
  }, [enableSecurity, securityConfig, showError, showWarning]);

  const contextValue: SecurityContextType = {
    sessionSecurity,
    checkRateLimit: (endpoint: string) => {
      const currentSession = secureSessionManager.getCurrentSession();
      if (!currentSession) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + 60000,
          retryAfter: 60000,
        };
      }

      return checkRateLimit(currentSession.sessionId, endpoint as any);
    },
    validateInput: (input: string, rules?: any) => {
      // Basic input validation - can be extended
      const errors: string[] = [];
      
      if (rules?.required && (!input || input.trim().length === 0)) {
        errors.push('This field is required');
      }
      
      if (rules?.maxLength && input.length > rules.maxLength) {
        errors.push(`Maximum length is ${rules.maxLength} characters`);
      }
      
      if (rules?.pattern && !rules.pattern.test(input)) {
        errors.push('Input format is invalid');
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    },
    securityConfig,
    isSecurityEnabled: enableSecurity,
  };

  return (
    <SecurityContext.Provider value={contextValue}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}

/**
 * Higher-order component for adding security checks to components
 */
export function withSecurity<P extends object>(
  Component: React.ComponentType<P>,
  securityOptions?: {
    requireValidSession?: boolean;
    minSecurityScore?: number;
    checkRateLimit?: string;
  }
) {
  return function SecurityWrappedComponent(props: P) {
    const { sessionSecurity, checkRateLimit: checkLimit } = useSecurity();
    const { showError } = useNotifications();
    const [isSecurityValid, setIsSecurityValid] = useState(true);

    useEffect(() => {
      if (!securityOptions) {
        setIsSecurityValid(true);
        return;
      }

      let valid = true;

      // Check session validity
      if (securityOptions.requireValidSession && (!sessionSecurity || !sessionSecurity.isValid)) {
        valid = false;
        showError('Security Error', 'Valid session required to access this feature.');
      }

      // Check security score
      if (securityOptions.minSecurityScore && sessionSecurity) {
        if (sessionSecurity.securityScore < securityOptions.minSecurityScore) {
          valid = false;
          showError('Security Error', 'Security requirements not met for this feature.');
        }
      }

      // Check rate limit
      if (securityOptions.checkRateLimit) {
        const rateLimitResult = checkLimit(securityOptions.checkRateLimit);
        if (!rateLimitResult.allowed) {
          valid = false;
          showError('Rate Limit', 'Too many requests. Please try again later.');
        }
      }

      setIsSecurityValid(valid);
    }, [sessionSecurity, securityOptions, checkLimit, showError]);

    if (!isSecurityValid) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-red-500 text-lg font-semibold mb-2">
              Access Denied
            </div>
            <div className="text-gray-600">
              Security requirements not met for this feature.
            </div>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

/**
 * Hook for checking if a specific action is allowed
 */
export function useSecurityCheck() {
  const { sessionSecurity, checkRateLimit } = useSecurity();

  const canPerformAction = (
    action: string,
    options?: {
      requireValidSession?: boolean;
      minSecurityScore?: number;
      checkRateLimit?: boolean;
    }
  ) => {
    if (options?.requireValidSession && (!sessionSecurity || !sessionSecurity.isValid)) {
      return { allowed: false, reason: 'Invalid session' };
    }

    if (options?.minSecurityScore && sessionSecurity) {
      if (sessionSecurity.securityScore < options.minSecurityScore) {
        return { allowed: false, reason: 'Security score too low' };
      }
    }

    if (options?.checkRateLimit) {
      const rateLimitResult = checkRateLimit(action);
      if (!rateLimitResult.allowed) {
        return { allowed: false, reason: 'Rate limit exceeded' };
      }
    }

    return { allowed: true };
  };

  return { canPerformAction };
}

export default SecurityProvider;