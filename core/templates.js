/**
 * ServiceM8 Response Templates
 * This file contains working HTML templates - DO NOT MODIFY!
 * Last working version: 2025-08-28
 */

class ServiceM8Templates {
    
    /**
     * Generate the main pricing calculator interface
     * @param {object} authInfo - Authentication information
     * @param {object} req - Express request object
     * @returns {string} - HTML content
     */
    generatePricingInterface(authInfo, req) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>ServiceM8 Staff Pricing Calculator</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        padding: 20px; 
                        background: #f8f9fa;
                        margin: 0;
                    }
                    .container {
                        background: white;
                        padding: 30px;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        max-width: 600px;
                        margin: 0 auto;
                    }
                    h1 { color: #28a745; margin-bottom: 20px; }
                    h2 { color: #007bff; margin-top: 30px; }
                    .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    .info { background: #e7f3ff; color: #0c5460; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    .form-group { margin-bottom: 15px; }
                    label { display: block; margin-bottom: 5px; font-weight: bold; }
                    select, input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
                    .btn { 
                        background: #007bff; 
                        color: white; 
                        padding: 12px 24px; 
                        border: none; 
                        border-radius: 4px; 
                        cursor: pointer; 
                        font-size: 16px;
                        width: 100%;
                        margin-top: 10px;
                    }
                    .btn:hover { background: #0056b3; }
                    .cost-preview { 
                        background: #f8f9fa; 
                        padding: 15px; 
                        border-radius: 4px; 
                        margin-top: 20px; 
                        border: 1px solid #dee2e6;
                    }
                    .debug { 
                        background: #f8f9fa; 
                        padding: 10px; 
                        border-radius: 4px; 
                        margin-top: 20px; 
                        font-size: 12px; 
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>✅ ServiceM8 Staff Pricing Calculator</h1>
                    
                    <div class="success">
                        Successfully connected to ServiceM8! This addon is working correctly.
                    </div>
                    
                    <h2>📋 Calculate Job Pricing</h2>
                    <p>Use this form to calculate pricing based on job details and requirements:</p>
                    
                    <form id="pricingForm">
                        <div class="form-group">
                            <label>Job Type:</label>
                            <select name="jobType" required>
                                <option value="plumbing">Plumbing (£120/hr base)</option>
                                <option value="electrical">Electrical (£150/hr base)</option>
                                <option value="hvac">HVAC (£130/hr base)</option>
                                <option value="general">General (£100/hr base)</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Job Complexity:</label>
                            <select name="complexity" required>
                                <option value="simple">Simple (1.0x multiplier)</option>
                                <option value="medium" selected>Medium (1.2x multiplier)</option>
                                <option value="complex">Complex (1.8x multiplier)</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Urgency Level:</label>
                            <select name="urgency" required>
                                <option value="standard" selected>Standard</option>
                                <option value="urgent">Urgent</option>
                                <option value="emergency">Emergency (1.5x surcharge)</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Timing:</label>
                            <select name="timing" required>
                                <option value="business_hours" selected>Business Hours</option>
                                <option value="after_hours">After Hours (1.4x surcharge)</option>
                                <option value="weekend">Weekend (1.3x surcharge)</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Estimated Hours:</label>
                            <input type="number" name="hours" min="0.5" step="0.5" value="2" required>
                        </div>
                        
                        <button type="button" class="btn" onclick="calculatePricing()">Calculate Pricing</button>
                    </form>
                    
                    <div id="costPreview" class="cost-preview" style="display: none;"></div>
                    
                    <div class="info">
                        <strong>🔐 Authentication Status:</strong> ${authInfo.authStatus}<br>
                        <strong>📄 Job UUID:</strong> ${authInfo.jobUUID}<br>
                        <strong>🏷️ Job ID:</strong> ${authInfo.jobId}<br>
                        <strong>👤 Staff UUID:</strong> ${authInfo.staffUUID}<br>
                        <strong>🏢 Company UUID:</strong> ${authInfo.companyUUID}<br>
                        <strong>⏰ Timestamp:</strong> ${new Date().toISOString()}
                    </div>
                    
                    <div class="debug">
                        <strong>🔧 Debug Info:</strong><br>
                        Request Method: ${req.method}<br>
                        Content-Type: ${req.headers['content-type'] || 'Not set'}<br>
                        Body Type: ${typeof req.body}<br>
                        App Secret: ${authInfo.hasAppSecret ? 'Configured ✅' : 'Missing ❌'}
                    </div>
                </div>
                
                <script>
                    function calculatePricing() {
                        const form = document.getElementById('pricingForm');
                        const formData = new FormData(form);
                        
                        // Build request data
                        const requestData = {
                            jobId: '${authInfo.jobUUID}' || 'test-job',
                            answers: {
                                jobComplexity: formData.get('complexity'),
                                timeOfDay: formData.get('timing') === 'business_hours' ? 'business_hours' : 'after_hours',
                                dayType: formData.get('timing') === 'weekend' ? 'weekend' : 'weekday',
                                urgency: formData.get('urgency'),
                                estimatedHours: parseFloat(formData.get('hours'))
                            }
                        };
                        
                        // Calculate basic pricing (client-side for demo)
                        const baseRates = {
                            plumbing: 120,
                            electrical: 150,
                            hvac: 130,
                            general: 100
                        };
                        
                        const complexityMultipliers = {
                            simple: 1.0,
                            medium: 1.2,
                            complex: 1.8
                        };
                        
                        const urgencyMultipliers = {
                            standard: 1.0,
                            urgent: 1.2,
                            emergency: 1.5
                        };
                        
                        const timingMultipliers = {
                            business_hours: 1.0,
                            after_hours: 1.4,
                            weekend: 1.3
                        };
                        
                        const jobType = formData.get('jobType');
                        const baseRate = baseRates[jobType];
                        const hours = parseFloat(formData.get('hours'));
                        const complexity = complexityMultipliers[formData.get('complexity')];
                        const urgency = urgencyMultipliers[formData.get('urgency')];
                        const timing = timingMultipliers[formData.get('timing')];
                        
                        const totalCost = Math.round(baseRate * hours * complexity * urgency * timing * 100) / 100;
                        
                        // Display results
                        document.getElementById('costPreview').innerHTML = 
                            '<h3>💰 Calculated Pricing</h3>' +
                            '<p><strong>Total Cost: £' + totalCost + '</strong></p>' +
                            '<p>Base Rate: £' + baseRate + '/hr (' + jobType + ')</p>' +
                            '<p>Hours: ' + hours + '</p>' +
                            '<p>Complexity: ' + formData.get('complexity') + ' (' + complexity + 'x)</p>' +
                            '<p>Urgency: ' + formData.get('urgency') + ' (' + urgency + 'x)</p>' +
                            '<p>Timing: ' + formData.get('timing') + ' (' + timing + 'x)</p>' +
                            '<p><em>Pricing calculated successfully!</em></p>';
                        document.getElementById('costPreview').style.display = 'block';
                    }
                </script>
            </body>
            </html>
        `;
    }

    /**
     * Generate error response template
     * @param {Error} error - The error object
     * @returns {string} - HTML error content
     */
    generateErrorResponse(error) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Error - ServiceM8 Addon</title>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; background: #f8f9fa; }
                    .error { background: #f8d7da; color: #721c24; padding: 20px; border-radius: 5px; }
                </style>
            </head>
            <body>
                <div class="error">
                    <h2>❌ Error</h2>
                    <p>Something went wrong: ${error.message}</p>
                    <p>But the addon is still responding with HTML!</p>
                </div>
            </body>
            </html>
        `;
    }
}

module.exports = ServiceM8Templates;
