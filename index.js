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

// Home page endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'ServiceM8 Staff Pricing Addon',
        version: '1.0.0',
        status: 'Running',
        endpoints: {
            config: '/config',
            webhook: '/webhook',
            pricing_form: '/pricing-form',
            test: '/test',
            calculate: '/calculate-cost'
        },
        documentation: 'https://github.com/mrg1989/servicem8-pricing-addon'
    });
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

// Configuration endpoint - serves pricing questions form
app.get('/config', (req, res) => {
    res.json({
        name: 'Staff Pricing Logic',
        version: '1.0.0',
        description: 'Automated pricing based on job details and staff assignments',
        pricing_questions: COST_QUESTIONS,
        current_rules: PRICING_RULES
    });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`ServiceM8 Staff Pricing Addon running on port ${PORT}`);
    console.log(`Webhook URL: http://localhost:${PORT}/webhook`);
    console.log(`Config URL: http://localhost:${PORT}/config`);
});
