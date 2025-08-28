/**
 * ServiceM8 Core Handler
 * This is the PROTECTED core that handles ServiceM8 requests
 * DO NOT MODIFY - This is the WORKING version!
 * Last working: 2025-08-28
 */

const ServiceM8Auth = require('./auth');
const ServiceM8Templates = require('./templates');

class ServiceM8Core {
    constructor() {
        this.auth = new ServiceM8Auth();
        this.templates = new ServiceM8Templates();
    }

    /**
     * Main handler for ServiceM8 addon events
     * This is the WORKING method - DO NOT CHANGE!
     * @param {object} req - Express request object  
     * @param {object} res - Express response object
     */
    handleAddonEvent(req, res) {
        try {
            console.log('=== ServiceM8 Addon Called (CORE) ===');
            console.log('Headers:', req.headers);
            console.log('Body type:', typeof req.body);
            console.log('Body content:', req.body);
            
            // CRITICAL: Remove iframe restrictions and set HTML content type
            res.removeHeader('X-Frame-Options');
            res.set('Content-Type', 'text/html; charset=utf-8');
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            
            // Parse authentication and extract data
            const authInfo = this.auth.parseServiceM8Request(req.body);
            
            // Generate the pricing interface HTML
            const htmlContent = this.templates.generatePricingInterface(authInfo, req);
            
            // Return in ServiceM8 format (CRITICAL!)
            const response = this.auth.formatServiceM8Response(htmlContent);
            res.json(response);
            
        } catch (error) {
            console.error('ServiceM8 Core Error:', error);
            
            // Even on error, return proper ServiceM8 format
            const errorHtml = this.templates.generateErrorResponse(error);
            const errorResponse = this.auth.formatServiceM8Response(errorHtml);
            res.json(errorResponse);
        }
    }

    /**
     * Handle GET requests to the addon endpoint (for testing)
     * @param {object} req - Express request object
     * @param {object} res - Express response object  
     */
    handleAddonGet(req, res) {
        try {
            const authInfo = {
                authStatus: 'GET Request - Test Mode',
                jobUUID: 'test-job-uuid',
                jobId: 'TEST-001',
                staffUUID: 'test-staff-uuid',
                companyUUID: 'test-company-uuid',
                hasAppSecret: !!process.env.SERVICEM8_APP_SECRET
            };

            const htmlContent = this.templates.generatePricingInterface(authInfo, req);
            const response = this.auth.formatServiceM8Response(htmlContent);
            res.json(response);
            
        } catch (error) {
            console.error('ServiceM8 Core GET Error:', error);
            const errorHtml = this.templates.generateErrorResponse(error);
            const errorResponse = this.auth.formatServiceM8Response(errorHtml);
            res.json(errorResponse);
        }
    }
}

module.exports = ServiceM8Core;
