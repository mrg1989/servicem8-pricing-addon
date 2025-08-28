require('./config'); // Load environment variables
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// ServiceM8 API configuration
const SERVICEM8_API_BASE = 'https://api.servicem8.com/api_1.0';
const SERVICEM8_USERNAME = process.env.SERVICEM8_USERNAME; // Set these in environment
const SERVICEM8_PASSWORD = process.env.SERVICEM8_PASSWORD;

// Pricing logic configuration
const PRICING_RULES = {
    // Base rates by job type
    jobTypes: {
        'plumbing': { baseRate: 120, multiplier: 1.0 },
        'electrical': { baseRate: 150, multiplier: 1.2 },
        'hvac': { baseRate: 130, multiplier: 1.1 },
        'general': { baseRate: 100, multiplier: 1.0 }
    },
    
    // Additional cost factors
    factors: {
        emergency: 1.5,      // 50% surcharge for emergency calls
        weekend: 1.3,        // 30% surcharge for weekends
        afterHours: 1.4,     // 40% surcharge for after hours
        complexity: {
            simple: 1.0,
            medium: 1.2,
            complex: 1.8
        }
    },
    
    // Staff skill multipliers
    staffLevels: {
        trainee: 0.8,
        junior: 1.0,
        senior: 1.3,
        expert: 1.6
    }
};

// Cost calculation questions/logic
const COST_QUESTIONS = {
    jobComplexity: ['simple', 'medium', 'complex'],
    timeOfDay: ['business_hours', 'after_hours'],
    dayType: ['weekday', 'weekend'],
    urgency: ['standard', 'urgent', 'emergency'],
    estimatedHours: 'number'
};
// Webhook endpoint for ServiceM8 events
app.post('/webhook', async (req, res) => {
    try {
        const event = req.body;
        console.log('Received webhook:', event);

        // Handle different event types
        switch (event.event_type) {
            case 'job.created':
                await handleJobCreated(event.data);
                break;
            case 'job.updated':
                await handleJobUpdated(event.data);
                break;
            case 'staff.updated':
                await handleStaffUpdated(event.data);
                break;
            default:
                console.log('Unknown event type:', event.event_type);
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Home page endpoint - return HTML instead of JSON
app.get('/', (req, res) => {
    res.removeHeader('X-Frame-Options');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>ServiceM8 Staff Pricing Addon</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    padding: 40px; 
                    background: #f8f9fa;
                    margin: 0;
                }
                .container {
                    background: white;
                    padding: 40px;
                    border-radius: 8px;
                    max-width: 600px;
                    margin: 0 auto;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                h1 { color: #28a745; margin-bottom: 20px; }
                .status { background: #e7f3ff; padding: 20px; border-radius: 5px; margin: 20px 0; }
                .endpoints { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
                .btn { 
                    background: #007bff; 
                    color: white; 
                    padding: 12px 24px; 
                    text-decoration: none; 
                    border-radius: 4px; 
                    display: inline-block; 
                    margin: 5px;
                }
                .btn:hover { background: #0056b3; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🏠 ServiceM8 Staff Pricing Addon</h1>
                
                <div class="status">
                    <h3>📊 Status</h3>
                    <p><strong>Version:</strong> 1.0.0</p>
                    <p><strong>Status:</strong> ✅ Running</p>
                    <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
                    <p><strong>App Secret:</strong> ${process.env.SERVICEM8_APP_SECRET ? 'Configured ✅' : 'Missing ❌'}</p>
                </div>
                
                <div class="endpoints">
                    <h3>🔗 Available Endpoints</h3>
                    <p><a href="/config" class="btn">View Configuration</a></p>
                    <p><a href="/pricing-form" class="btn">Pricing Form</a></p>
                    <p><a href="/test" class="btn">Test Page</a></p>
                    <p><a href="/addon/event" class="btn">Addon Event (GET)</a></p>
                </div>
                
                <div class="endpoints">
                    <h3>📖 Documentation</h3>
                    <p>This is a ServiceM8 Web Service Hosted Add-on for automated staff pricing calculations.</p>
                    <p><strong>Callback URL:</strong> https://servicem8-pricing-addon.onrender.com/addon/event</p>
                    <p><strong>GitHub:</strong> <a href="https://github.com/mrg1989/servicem8-pricing-addon">View Repository</a></p>
                </div>
            </div>
        </body>
        </html>
    `);
});

// Test page endpoint - for testing without ServiceM8
app.get('/test', (req, res) => {
    const fs = require('fs');
    const html = fs.readFileSync(path.join(__dirname, 'test.html'), 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});

// Pricing form endpoint - serves the HTML form for ServiceM8 UI
app.get('/pricing-form', (req, res) => {
    const jobId = req.query.job_id || req.query.jobId || '';
    
    // Read and serve the HTML form
    const fs = require('fs');
    let html = fs.readFileSync(path.join(__dirname, 'pricing-form.html'), 'utf8');
    
    // Inject job ID into the form if provided
    if (jobId) {
        html = html.replace('value=""', `value="${jobId}"`);
    }
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});

// Configuration endpoint - return HTML instead of JSON
app.get('/config', (req, res) => {
    res.removeHeader('X-Frame-Options');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Addon Configuration</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    padding: 20px; 
                    background: #f8f9fa;
                }
                .container {
                    background: white;
                    padding: 30px;
                    border-radius: 8px;
                    max-width: 800px;
                    margin: 0 auto;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                h1 { color: #28a745; }
                h2 { color: #007bff; margin-top: 30px; }
                .config-section { 
                    background: #f8f9fa; 
                    padding: 20px; 
                    border-radius: 5px; 
                    margin: 20px 0; 
                }
                .pricing-rule { 
                    background: #e7f3ff; 
                    padding: 15px; 
                    border-radius: 5px; 
                    margin: 10px 0; 
                }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background: #f8f9fa; font-weight: bold; }
                code { background: #f1f3f4; padding: 2px 6px; border-radius: 3px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>⚙️ ServiceM8 Staff Pricing Configuration</h1>
                
                <div class="config-section">
                    <h2>📋 Addon Information</h2>
                    <p><strong>Name:</strong> Staff Pricing Logic</p>
                    <p><strong>Version:</strong> 1.0.0</p>
                    <p><strong>Description:</strong> Automated pricing based on job details and staff assignments</p>
                </div>
                
                <div class="config-section">
                    <h2>💰 Base Pricing Rules</h2>
                    <table>
                        <tr><th>Job Type</th><th>Base Rate (£/hr)</th><th>Multiplier</th></tr>
                        <tr><td>Plumbing</td><td>£120</td><td>1.0x</td></tr>
                        <tr><td>Electrical</td><td>£150</td><td>1.2x</td></tr>
                        <tr><td>HVAC</td><td>£130</td><td>1.1x</td></tr>
                        <tr><td>General</td><td>£100</td><td>1.0x</td></tr>
                    </table>
                </div>
                
                <div class="config-section">
                    <h2>📈 Pricing Factors</h2>
                    
                    <div class="pricing-rule">
                        <h3>🚨 Urgency Multipliers</h3>
                        <p><strong>Emergency:</strong> 1.5x (50% surcharge)</p>
                        <p><strong>Urgent:</strong> 1.2x (20% surcharge)</p>
                        <p><strong>Standard:</strong> 1.0x (no surcharge)</p>
                    </div>
                    
                    <div class="pricing-rule">
                        <h3>⏰ Time Multipliers</h3>
                        <p><strong>After Hours:</strong> 1.4x (40% surcharge)</p>
                        <p><strong>Weekend:</strong> 1.3x (30% surcharge)</p>
                        <p><strong>Business Hours:</strong> 1.0x (no surcharge)</p>
                    </div>
                    
                    <div class="pricing-rule">
                        <h3>🔧 Complexity Multipliers</h3>
                        <p><strong>Complex:</strong> 1.8x</p>
                        <p><strong>Medium:</strong> 1.2x</p>
                        <p><strong>Simple:</strong> 1.0x</p>
                    </div>
                </div>
                
                <div class="config-section">
                    <h2>👨‍🔧 Staff Skill Levels</h2>
                    <table>
                        <tr><th>Skill Level</th><th>Multiplier</th></tr>
                        <tr><td>Expert</td><td>1.6x</td></tr>
                        <tr><td>Senior</td><td>1.3x</td></tr>
                        <tr><td>Junior</td><td>1.0x</td></tr>
                        <tr><td>Trainee</td><td>0.8x</td></tr>
                    </table>
                </div>
                
                <div class="config-section">
                    <h2>📝 Pricing Questions</h2>
                    <p>The addon collects the following information to calculate pricing:</p>
                    <ul>
                        <li><strong>Job Complexity:</strong> Simple, Medium, Complex</li>
                        <li><strong>Time of Day:</strong> Business Hours, After Hours</li>
                        <li><strong>Day Type:</strong> Weekday, Weekend</li>
                        <li><strong>Urgency:</strong> Standard, Urgent, Emergency</li>
                        <li><strong>Estimated Hours:</strong> Numeric input</li>
                    </ul>
                </div>
                
                <div class="config-section">
                    <h2>🔗 API Integration</h2>
                    <p><strong>ServiceM8 API Base:</strong> <code>https://api.servicem8.com/api_1.0</code></p>
                    <p><strong>Authentication:</strong> ${process.env.SERVICEM8_USERNAME ? 'Configured ✅' : 'Not configured ❌'}</p>
                    <p><strong>Callback URL:</strong> <code>/addon/event</code></p>
                    <p><strong>Webhook URL:</strong> <code>/webhook</code></p>
                </div>
            </div>
        </body>
        </html>
    `);
});

// Manual cost calculation endpoint
app.post('/calculate-cost', async (req, res) => {
    try {
        const { jobId, answers } = req.body;
        
        if (!jobId) {
            return res.status(400).json({ error: 'Job ID required' });
        }
        
        // Check if this is a test job (starts with 'test-')
        const isTestMode = jobId.startsWith('test-');
        
        let jobDetails;
        if (isTestMode) {
            // Use mock data for testing
            jobDetails = {
                uuid: jobId,
                generated_job_id: 'TEST-001',
                staff_uuid: 'test-staff-456',
                category_uuid: 'test-category-plumbing',
                estimated_hours: answers.estimatedHours || 2
            };
        } else {
            // Get real job details from ServiceM8
            jobDetails = await getJobDetails(jobId);
        }
        
        // Calculate cost based on answers and job data
        const costCalculation = await calculateJobCost(jobDetails, answers, isTestMode);
        
        if (!isTestMode) {
            // Only update ServiceM8 if not in test mode
            await updateJobWithCosts(jobId, costCalculation);
            await createInvoiceItems(jobId, costCalculation);
        }
        
        res.json({
            success: true,
            jobId: jobId,
            calculation: costCalculation,
            testMode: isTestMode,
            message: isTestMode ? 
                'Test calculation completed (no ServiceM8 update)' : 
                'Job updated with calculated costs and invoice items created'
        });
        
    } catch (error) {
        console.error('Cost calculation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Enhanced job processing functions
async function handleJobCreated(jobData) {
    console.log('Processing new job:', jobData.uuid);
    
    // Auto-calculate basic pricing if job has minimum required info
    if (jobData.staff_uuid && jobData.category_uuid) {
        const basicAnswers = {
            jobComplexity: 'medium',  // Default to medium complexity
            timeOfDay: 'business_hours',
            dayType: 'weekday',
            urgency: 'standard',
            estimatedHours: jobData.estimated_hours || 2
        };
        
        try {
            const costCalculation = await calculateJobCost(jobData, basicAnswers);
            await updateJobWithCosts(jobData.uuid, costCalculation);
            await createInvoiceItems(jobData.uuid, costCalculation);
            console.log(`Auto-pricing applied to job ${jobData.uuid}`);
        } catch (error) {
            console.error('Auto-pricing failed:', error);
        }
    }
}

async function handleJobUpdated(jobData) {
    console.log('Processing job update:', jobData.uuid);
    
    // Recalculate pricing if staff assignment or job details changed
    if (jobData.staff_uuid) {
        // Only recalculate if the job doesn't already have custom pricing
        const currentJob = await getJobDetails(jobData.uuid);
        if (!currentJob.custom_pricing_applied) {
            const basicAnswers = {
                jobComplexity: 'medium',
                timeOfDay: 'business_hours', 
                dayType: 'weekday',
                urgency: 'standard',
                estimatedHours: jobData.estimated_hours || 2
            };
            
            try {
                const costCalculation = await calculateJobCost(jobData, basicAnswers);
                await updateJobWithCosts(jobData.uuid, costCalculation);
                console.log(`Updated pricing for job ${jobData.uuid}`);
            } catch (error) {
                console.error('Pricing update failed:', error);
            }
        }
    }
}

async function handleStaffUpdated(staffData) {
    console.log('Staff updated:', staffData.uuid);
    // Could trigger repricing of all active jobs for this staff member
}

// Advanced cost calculation with detailed logic
async function calculateJobCost(jobData, answers, isTestMode = false) {
    try {
        // Get job category/type
        let jobType;
        if (isTestMode) {
            // Mock job type determination for testing
            jobType = jobData.category_uuid?.includes('plumbing') ? 'plumbing' :
                     jobData.category_uuid?.includes('electrical') ? 'electrical' :
                     jobData.category_uuid?.includes('hvac') ? 'hvac' : 'general';
        } else {
            jobType = await determineJobType(jobData.category_uuid);
        }
        
        const baseConfig = PRICING_RULES.jobTypes[jobType] || PRICING_RULES.jobTypes.general;
        
        // Get staff details and skill level
        let staffDetails;
        if (isTestMode) {
            // Mock staff details for testing
            staffDetails = { skill_level: 'senior', name: 'Test Staff Member' };
        } else {
            staffDetails = await getStaffDetails(jobData.staff_uuid);
        }
        
        const staffMultiplier = PRICING_RULES.staffLevels[staffDetails.skill_level] || 1.0;
        
        // Calculate base cost
        let totalCost = baseConfig.baseRate * baseConfig.multiplier;
        
        // Apply factors based on answers
        if (answers.urgency === 'emergency') {
            totalCost *= PRICING_RULES.factors.emergency;
        }
        if (answers.dayType === 'weekend') {
            totalCost *= PRICING_RULES.factors.weekend;
        }
        if (answers.timeOfDay === 'after_hours') {
            totalCost *= PRICING_RULES.factors.afterHours;
        }
        if (answers.jobComplexity) {
            totalCost *= PRICING_RULES.factors.complexity[answers.jobComplexity];
        }
        
        // Apply staff skill multiplier
        totalCost *= staffMultiplier;
        
        // Apply estimated hours
        const estimatedHours = parseFloat(answers.estimatedHours) || 1;
        totalCost *= estimatedHours;
        
        // Round to nearest dollar
        totalCost = Math.round(totalCost * 100) / 100;
        
        // Create detailed breakdown
        const breakdown = {
            baseRate: baseConfig.baseRate,
            jobType: jobType,
            staffLevel: staffDetails.skill_level,
            factors: {
                urgency: answers.urgency,
                timeOfDay: answers.timeOfDay,
                dayType: answers.dayType,
                complexity: answers.jobComplexity
            },
            estimatedHours: estimatedHours,
            staffMultiplier: staffMultiplier,
            totalCost: totalCost
        };
        
        // Generate description
        const description = generateCostDescription(breakdown, jobData);
        
        return {
            totalCost,
            breakdown,
            description,
            calculatedAt: new Date().toISOString(),
            testMode: isTestMode
        };
        
    } catch (error) {
        console.error('Cost calculation error:', error);
        throw new Error(`Failed to calculate cost: ${error.message}`);
    }
}

// Generate detailed cost description
function generateCostDescription(breakdown, jobData) {
    let description = `AUTOMATED PRICING CALCULATION\n\n`;
    description += `Job: ${jobData.generated_job_id || jobData.uuid}\n`;
    description += `Base Rate (${breakdown.jobType}): $${breakdown.baseRate}/hr\n`;
    description += `Staff Level (${breakdown.staffLevel}): ${breakdown.staffMultiplier}x multiplier\n`;
    description += `Estimated Hours: ${breakdown.estimatedHours}\n\n`;
    
    description += `FACTORS APPLIED:\n`;
    description += `• Urgency: ${breakdown.factors.urgency}\n`;
    description += `• Time: ${breakdown.factors.timeOfDay}\n`;
    description += `• Day Type: ${breakdown.factors.dayType}\n`;
    description += `• Complexity: ${breakdown.factors.complexity}\n\n`;
    
    description += `TOTAL CALCULATED COST: $${breakdown.totalCost}\n`;
    description += `Calculated: ${new Date().toLocaleString()}`;
    
    return description;
}

// ServiceM8 API integration functions
async function getJobDetails(jobUuid) {
    try {
        const response = await makeServiceM8Request(`/job/${jobUuid}`);
        return response.data;
    } catch (error) {
        throw new Error(`Failed to get job details: ${error.message}`);
    }
}

async function getStaffDetails(staffUuid) {
    try {
        const response = await makeServiceM8Request(`/staff/${staffUuid}`);
        return response.data;
    } catch (error) {
        // Return default if staff not found
        return { skill_level: 'junior', name: 'Unknown Staff' };
    }
}

async function determineJobType(categoryUuid) {
    try {
        const response = await makeServiceM8Request(`/jobcategory/${categoryUuid}`);
        const category = response.data;
        
        // Map ServiceM8 categories to our pricing types
        const categoryMappings = {
            'plumbing': 'plumbing',
            'electrical': 'electrical', 
            'hvac': 'hvac',
            'heating': 'hvac',
            'cooling': 'hvac'
        };
        
        const categoryName = category.name.toLowerCase();
        for (const [key, type] of Object.entries(categoryMappings)) {
            if (categoryName.includes(key)) {
                return type;
            }
        }
        
        return 'general'; // Default fallback
    } catch (error) {
        return 'general'; // Default if category lookup fails
    }
}

async function updateJobWithCosts(jobUuid, costCalculation) {
    try {
        // Update job with calculated cost and description
        const updateData = {
            job_price: costCalculation.totalCost,
            job_description: costCalculation.description,
            custom_pricing_applied: true,
            pricing_breakdown: JSON.stringify(costCalculation.breakdown)
        };
        
        const response = await makeServiceM8Request(`/job/${jobUuid}`, 'PUT', updateData);
        console.log(`Job ${jobUuid} updated with cost: $${costCalculation.totalCost}`);
        return response.data;
    } catch (error) {
        throw new Error(`Failed to update job: ${error.message}`);
    }
}

async function createInvoiceItems(jobUuid, costCalculation) {
    try {
        // Create invoice line items for the calculated costs
        const invoiceItems = [
            {
                job_uuid: jobUuid,
                description: `Labour - ${costCalculation.breakdown.jobType} (${costCalculation.breakdown.estimatedHours}hrs)`,
                quantity: costCalculation.breakdown.estimatedHours,
                unit_price: costCalculation.totalCost / costCalculation.breakdown.estimatedHours,
                total: costCalculation.totalCost,
                tax_rate: 0.10, // 10% tax rate - adjust as needed
                item_type: 'labour'
            }
        ];
        
        // Add breakdown as separate line items if detailed billing needed
        if (costCalculation.breakdown.factors.urgency === 'emergency') {
            invoiceItems.push({
                job_uuid: jobUuid,
                description: 'Emergency Call Surcharge',
                quantity: 1,
                unit_price: costCalculation.totalCost * 0.5,
                total: costCalculation.totalCost * 0.5,
                tax_rate: 0.10,
                item_type: 'surcharge'
            });
        }
        
        // Create each invoice item
        for (const item of invoiceItems) {
            await makeServiceM8Request('/invoiceitem', 'POST', item);
        }
        
        console.log(`Created ${invoiceItems.length} invoice items for job ${jobUuid}`);
        return invoiceItems;
    } catch (error) {
        throw new Error(`Failed to create invoice items: ${error.message}`);
    }
}

async function makeServiceM8Request(endpoint, method = 'GET', data = null) {
    try {
        if (!SERVICEM8_USERNAME || !SERVICEM8_PASSWORD) {
            throw new Error('ServiceM8 credentials not configured');
        }
        
        const config = {
            method: method,
            url: `${SERVICEM8_API_BASE}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${SERVICEM8_USERNAME}:${SERVICEM8_PASSWORD}`).toString('base64')}`
            }
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
            config.data = data;
        }
        
        const response = await axios(config);
        return response;
    } catch (error) {
        console.error('ServiceM8 API Error:', error.response?.data || error.message);
        throw error;
    }
}

// ServiceM8 Addon Event Handlers - ALWAYS return HTML for iframe display
app.post('/addon/event', async (req, res) => {
    try {
        console.log('=== ServiceM8 Addon Called ===');
        console.log('Headers:', req.headers);
        console.log('Body type:', typeof req.body);
        console.log('Body content:', req.body);
        
        // CRITICAL: Remove iframe restrictions and set HTML content type
        res.removeHeader('X-Frame-Options');
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        
        // Parse potential JWT token or event data
        let eventData = null;
        let authStatus = 'No authentication data';
        
        if (typeof req.body === 'string' && req.body.includes('.')) {
            // Looks like a JWT token
            try {
                const jwt = require('jsonwebtoken');
                if (process.env.SERVICEM8_APP_SECRET) {
                    eventData = jwt.verify(req.body, process.env.SERVICEM8_APP_SECRET);
                    authStatus = '✅ JWT verified successfully';
                } else {
                    const decoded = jwt.decode(req.body, { complete: true });
                    eventData = decoded ? decoded.payload : null;
                    authStatus = '⚠️ JWT decoded without verification (App Secret missing)';
                }
            } catch (jwtError) {
                authStatus = `❌ JWT verification failed: ${jwtError.message}`;
                eventData = { error: 'JWT verification failed' };
            }
        } else if (req.body) {
            eventData = req.body;
            authStatus = 'Event data received';
        }
        
        // Extract job details from event data (if available)
        const jobUUID = eventData?.eventArgs?.jobUUID || eventData?.job?.uuid || 'N/A';
        const jobId = eventData?.eventArgs?.jobId || eventData?.job?.generated_job_id || 'N/A';
        const staffUUID = eventData?.auth?.staffUUID || eventData?.user?.uuid || 'N/A';
        const companyUUID = eventData?.eventArgs?.companyUUID || eventData?.company?.uuid || 'N/A';
        
        // ALWAYS return HTML - this is what ServiceM8 expects for iframe display
        const htmlResponse = `
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
                        <strong>🔐 Authentication Status:</strong> ${authStatus}<br>
                        <strong>📄 Job UUID:</strong> ${jobUUID}<br>
                        <strong>🏷️ Job ID:</strong> ${jobId}<br>
                        <strong>👤 Staff UUID:</strong> ${staffUUID}<br>
                        <strong>🏢 Company UUID:</strong> ${companyUUID}<br>
                        <strong>⏰ Timestamp:</strong> ${new Date().toISOString()}
                    </div>
                    
                    <div class="debug">
                        <strong>🔧 Debug Info:</strong><br>
                        Request Method: ${req.method}<br>
                        Content-Type: ${req.headers['content-type'] || 'Not set'}<br>
                        Body Type: ${typeof req.body}<br>
                        App Secret: ${process.env.SERVICEM8_APP_SECRET ? 'Configured ✅' : 'Missing ❌'}
                    </div>
                </div>
                
                <script>
                    function calculatePricing() {
                        const form = document.getElementById('pricingForm');
                        const formData = new FormData(form);
                        
                        // Build request data
                        const requestData = {
                            jobId: '${jobUUID}' || 'test-job',
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
        
        // Send the HTML response
        res.send(htmlResponse);
        
    } catch (error) {
        console.error('Addon event error:', error);
        
        // Even on error, return HTML (not JSON)
        res.removeHeader('X-Frame-Options');
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.send(`
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
        `);
    }
});

// GET handler for addon event endpoint (for testing)
app.get('/addon/event', (req, res) => {
    res.removeHeader('X-Frame-Options');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>ServiceM8 Addon Event - GET Test</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    padding: 20px; 
                    background: #f8f9fa;
                }
                .container {
                    background: white;
                    padding: 30px;
                    border-radius: 8px;
                    max-width: 600px;
                    margin: 0 auto;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .warning { background: #fff3cd; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .info { background: #e7f3ff; color: #0c5460; padding: 15px; border-radius: 5px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>⚠️ ServiceM8 Addon Event Endpoint</h1>
                
                <div class="warning">
                    <h3>GET Request Detected</h3>
                    <p>This endpoint normally receives POST requests from ServiceM8 with JWT tokens.</p>
                    <p>You're seeing this because you visited the URL directly (GET request).</p>
                </div>
                
                <div class="info">
                    <h3>🔧 Endpoint Information</h3>
                    <p><strong>URL:</strong> /addon/event</p>
                    <p><strong>Expected Method:</strong> POST</p>
                    <p><strong>Expected Content:</strong> JWT token from ServiceM8</p>
                    <p><strong>Response:</strong> HTML page for iframe display</p>
                </div>
                
                <div class="info">
                    <h3>📊 Environment Status</h3>
                    <p><strong>App Secret:</strong> ${process.env.SERVICEM8_APP_SECRET ? 'Configured ✅' : 'Missing ❌'}</p>
                    <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
                    <p><strong>Server:</strong> Running and ready to receive ServiceM8 events</p>
                </div>
                
                <p><a href="/">← Back to Home</a></p>
            </div>
        </body>
        </html>
    `);
});

// Serve addon icon
app.get('/icon.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'icon.png'));
});

// OAuth endpoints for ServiceM8 activation
app.get('/oauth/start', (req, res) => {
    // This is where ServiceM8 sends users to start OAuth
    const accountUuid = req.query.account_uuid;
    const staffUuid = req.query.staff_uuid;
    
    console.log('OAuth start:', { accountUuid, staffUuid });
    
    // Store the account and staff UUIDs for the callback
    // In production, you'd use a proper session store or database
    const state = Buffer.from(JSON.stringify({ accountUuid, staffUuid })).toString('base64');
    
    // Redirect to ServiceM8's OAuth authorization endpoint
    const authUrl = new URL('https://go.servicem8.com/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', process.env.SERVICEM8_APP_ID || 'your_app_id');
    authUrl.searchParams.set('scope', 'read_jobs');
    authUrl.searchParams.set('redirect_uri', 'https://servicem8-pricing-addon.onrender.com/oauth/complete');
    authUrl.searchParams.set('state', state);
    
    console.log('Redirecting to ServiceM8 OAuth:', authUrl.toString());
    res.redirect(authUrl.toString());
});

app.get('/oauth/complete', (req, res) => {
    // Handle the OAuth callback from ServiceM8
    const code = req.query.code;
    const state = req.query.state;
    const error = req.query.error;
    
    console.log('OAuth callback:', { code: code ? 'received' : 'missing', state, error });
    
    if (error) {
        console.error('OAuth error:', error);
        return res.status(400).send(`
            <!DOCTYPE html>
            <html>
            <head><title>OAuth Error</title></head>
            <body>
                <h1>Authorization Failed</h1>
                <p>Error: ${error}</p>
                <p><a href="javascript:window.close()">Close Window</a></p>
            </body>
            </html>
        `);
    }
    
    if (!code) {
        console.error('No authorization code received');
        return res.status(400).send('No authorization code received');
    }
    
    // Decode the state to get account and staff UUIDs
    let accountUuid, staffUuid;
    try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        accountUuid = stateData.accountUuid;
        staffUuid = stateData.staffUuid;
    } catch (err) {
        console.error('Invalid state parameter:', err);
        return res.status(400).send('Invalid state parameter');
    }
    
    // Exchange the authorization code for an access token
    // Note: You would implement the token exchange here
    console.log('Would exchange code for token:', { code, accountUuid, staffUuid });
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Staff Pricing Calculator - Activated</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #f5f5f5; }
                .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 20px; border-radius: 5px; margin: 20px 0; }
            </style>
            <script>
                // Close window and notify ServiceM8 of successful activation
                window.addEventListener('load', function() {
                    setTimeout(function() {
                        window.close();
                    }, 2000);
                });
            </script>
        </head>
        <body>
            <h1>🎉 Staff Pricing Calculator</h1>
            <div class="success">
                <h2>Successfully Activated!</h2>
                <p>Your addon is now active. Look for "Calculate Pricing" buttons on job cards.</p>
                <p><em>This window will close automatically...</em></p>
            </div>
        </body>
        </html>
    `);
});

// Addon activation endpoint
app.get('/activate', (req, res) => {
    // ServiceM8 sends activation parameters
    const accountUuid = req.query.account_uuid;
    const staffUuid = req.query.staff_uuid;
    
    console.log('Activation request received:', { accountUuid, staffUuid });
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Staff Pricing Calculator - Activated</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #f5f5f5; }
                .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 20px; border-radius: 5px; margin: 20px 0; }
                .btn { background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px; }
                .btn:hover { background: #0056b3; }
            </style>
            <script>
                // Notify ServiceM8 that activation is complete
                window.addEventListener('load', function() {
                    if (window.parent && window.parent !== window) {
                        // Send message to ServiceM8 parent window
                        window.parent.postMessage({
                            type: 'addon_activated',
                            success: true,
                            message: 'Staff Pricing Calculator activated successfully'
                        }, '*');
                        
                        // Auto-close after 3 seconds
                        setTimeout(function() {
                            window.parent.postMessage({
                                type: 'close_modal'
                            }, '*');
                        }, 3000);
                    }
                });
            </script>
        </head>
        <body>
            <h1>🎉 Staff Pricing Calculator</h1>
            <div class="success">
                <h2>Successfully Activated!</h2>
                <p>The Staff Pricing Calculator addon has been activated in your ServiceM8 account.</p>
                <p><strong>You can now see "Calculate Pricing" buttons on your job cards!</strong></p>
            </div>
            
            <h3>What's Next?</h3>
            <p>Look for the "Calculate Pricing" button on any job card to automatically calculate pricing based on:</p>
            <ul style="text-align: left; max-width: 400px; margin: 0 auto;">
                <li>Job complexity (Simple, Medium, Complex)</li>
                <li>Urgency level (Standard, Urgent, Emergency)</li>
                <li>Timing (Business hours, After hours, Weekend)</li>
                <li>Estimated duration</li>
            </ul>
            
            <div style="margin-top: 30px;">
                <a href="/pricing-form" class="btn">Test Pricing Calculator</a>
                <a href="/config" class="btn">View Pricing Rules</a>
            </div>
            
            <p style="color: #666; margin-top: 30px;">
                <small>This window will close automatically. You can now return to ServiceM8 and check your job cards.</small>
            </p>
        </body>
        </html>
    `);
});

// Serve manifest file
app.get('/manifest.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'manifest.json'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`ServiceM8 Staff Pricing Addon running on port ${PORT}`);
    console.log(`Webhook URL: http://localhost:${PORT}/webhook`);
    console.log(`Config URL: http://localhost:${PORT}/config`);
});
