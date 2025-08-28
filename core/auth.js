/**
 * ServiceM8 Authentication Handler
 * This file contains the WORKING authentication logic - DO NOT MODIFY!
 * Last working version: 2025-08-28
 */

const jwt = require('jsonwebtoken');

class ServiceM8Auth {
    constructor() {
        this.appSecret = process.env.SERVICEM8_APP_SECRET;
        this.appId = process.env.SERVICEM8_APP_ID;
    }

    /**
     * Parse and verify ServiceM8 JWT token
     * @param {string|object} requestBody - The request body from ServiceM8
     * @returns {object} - Parsed event data and auth status
     */
    parseServiceM8Request(requestBody) {
        let eventData = null;
        let authStatus = 'No authentication data';
        let jobUUID = 'N/A';
        let jobId = 'N/A';
        let staffUUID = 'N/A';
        let companyUUID = 'N/A';

        console.log('=== ServiceM8 Auth Handler ===');
        console.log('App Secret:', this.appSecret ? 'SET' : 'MISSING');
        console.log('Body type:', typeof requestBody);
        console.log('Body content:', requestBody);

        if (typeof requestBody === 'string' && requestBody.includes('.')) {
            // Looks like a JWT token
            try {
                if (this.appSecret) {
                    eventData = jwt.verify(requestBody, this.appSecret, { algorithms: ['HS256'] });
                    authStatus = '✅ JWT verified successfully';
                } else {
                    const decoded = jwt.decode(requestBody, { complete: true });
                    eventData = decoded ? decoded.payload : null;
                    authStatus = '⚠️ JWT decoded without verification (App Secret missing)';
                }
            } catch (jwtError) {
                authStatus = `❌ JWT verification failed: ${jwtError.message}`;
                eventData = { error: 'JWT verification failed' };
                console.error('JWT error:', jwtError);
            }
        } else if (requestBody) {
            eventData = requestBody;
            authStatus = 'Event data received';
        }

        // Extract job details from event data (if available)
        if (eventData) {
            jobUUID = eventData?.eventArgs?.jobUUID || eventData?.job?.uuid || 'N/A';
            jobId = eventData?.eventArgs?.jobId || eventData?.job?.generated_job_id || 'N/A';
            staffUUID = eventData?.auth?.staffUUID || eventData?.user?.uuid || 'N/A';
            companyUUID = eventData?.eventArgs?.companyUUID || eventData?.company?.uuid || 'N/A';
        }

        return {
            eventData,
            authStatus,
            jobUUID,
            jobId,
            staffUUID,
            companyUUID,
            isAuthenticated: authStatus.includes('✅'),
            hasAppSecret: !!this.appSecret
        };
    }

    /**
     * Format response for ServiceM8 (CRITICAL - DO NOT CHANGE!)
     * @param {string} htmlContent - The HTML content to return
     * @returns {object} - ServiceM8 formatted response
     */
    formatServiceM8Response(htmlContent) {
        // This is the WORKING format that ServiceM8 requires
        return { eventResponse: htmlContent };
    }
}

module.exports = ServiceM8Auth;
