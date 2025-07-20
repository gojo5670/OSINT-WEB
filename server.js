const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const API_CONFIG = require('./api-config');

const app = express();
const PORT = process.env.PORT || 3000;

// Telegram Bot configuration
const TELEGRAM_BOT_TOKEN = '7940557712:AAHYHp4-jJYiuxbsMiANao8CnVrEz7ak-nc';
const TELEGRAM_CHAT_ID = '1074750898';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

// IP Info configuration
const IPINFO_API = 'https://ipinfo.io';

// Function to get IP information
async function getIpInfo(ip) {
  try {
    // Remove IPv6 prefix if present (e.g., ::ffff:192.168.1.1 -> 192.168.1.1)
    const cleanIp = ip.replace(/^::ffff:/, '');
    
    // Handle localhost and special cases
    if (cleanIp === '::1' || cleanIp === '127.0.0.1' || cleanIp === 'localhost' || 
        cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.') || 
        cleanIp === 'undefined' || !cleanIp) {
      return { 
        ip: cleanIp || 'localhost',
        city: 'Local',
        region: 'Local',
        country: 'Local',
        loc: 'Local',
        org: 'Local Network',
        timezone: 'Local'
      };
    }
    
    const response = await axios.get(`${IPINFO_API}/${cleanIp}/json`);
    
    // Check if we got a valid response with all fields
    if (response.data) {
      // Ensure all fields have at least default values if missing
      return {
        ip: response.data.ip || cleanIp,
        city: response.data.city || 'Unknown',
        region: response.data.region || 'Unknown',
        country: response.data.country || 'Unknown',
        loc: response.data.loc || 'Unknown',
        org: response.data.org || 'Unknown',
        timezone: response.data.timezone || 'Unknown'
      };
    }
    
    return response.data;
  } catch (error) {
    console.error('Error getting IP info:', error.message);
    return { 
      ip: ip || 'Unknown',
      city: 'Unknown',
      region: 'Unknown',
      country: 'Unknown',
      loc: 'Unknown',
      org: 'Unknown',
      timezone: 'Unknown'
    };
  }
}

// Helper function to format IP info for Telegram logs
function formatIpInfoForLog(ipInfo) {
  if (!ipInfo) {
    return `<b>IP:</b> Unknown\n<b>Location:</b> Unknown\n<b>ISP:</b> Unknown`;
  }
  
  const ip = ipInfo.ip || 'Unknown';
  const city = ipInfo.city || 'Unknown';
  const region = ipInfo.region || 'Unknown';
  const country = ipInfo.country || 'Unknown';
  const org = ipInfo.org || 'Unknown';
  
  let location = 'Unknown';
  if (city !== 'Unknown' || region !== 'Unknown' || country !== 'Unknown') {
    const locationParts = [];
    if (city !== 'Unknown') locationParts.push(city);
    if (region !== 'Unknown') locationParts.push(region);
    if (country !== 'Unknown') locationParts.push(country);
    location = locationParts.join(', ');
  }
  
  return `<b>IP:</b> ${ip}\n<b>Location:</b> ${location}\n<b>ISP:</b> ${org}`;
}

// Function to send logs to Telegram
async function sendTelegramLog(message) {
  try {
    const response = await axios.post(TELEGRAM_API, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    });
    console.log('Telegram log sent successfully');
    return response.data;
  } catch (error) {
    console.error('Error sending Telegram log:', error.message);
    // Don't throw the error to prevent affecting the main API functionality
  }
}

// Enable CORS for all routes
app.use(cors());

// Serve static files
app.use(express.static(__dirname));

// For POST requests, we need to parse JSON body
app.use(express.json());

// List of blocked numbers and IDs
const BLOCKED_NUMBERS = ['8082918286'];
const BLOCKED_IDS = [];

// Simple rate limiting implementation
const rateLimits = {
  mobile: { timestamp: 0, count: 0 },
  aadhar: { timestamp: 0, count: 0 }
};

// Helper function to implement rate limiting and retries
async function makeRateLimitedRequest(type, url, options = {}) {
  // Reset count if it's been more than a minute
  const now = Date.now();
  if (now - rateLimits[type].timestamp > 60000) {
    rateLimits[type].timestamp = now;
    rateLimits[type].count = 0;
  }

  // Check if we've hit the rate limit
  if (rateLimits[type].count >= 3) {
    const waitTime = 60000 - (now - rateLimits[type].timestamp);
    console.log(`Rate limit reached for ${type}. Waiting ${waitTime}ms before retrying...`);
    
    // Wait until the rate limit resets
    await new Promise(resolve => setTimeout(resolve, waitTime + 100)); // Add 100ms buffer
    
    // Reset the counter
    rateLimits[type].timestamp = Date.now();
    rateLimits[type].count = 0;
  }

  try {
    // Increment the counter
    rateLimits[type].count++;
    
    // Make the request using the retry helper
    return await makeRequestWithRetry(url, options);
  } catch (error) {
    // If we get a 429, wait and retry once
    if (error.response && error.response.status === 429) {
      console.log(`Received 429 for ${type}. Waiting 60 seconds before retrying...`);
      
      // Wait 60 seconds
      await new Promise(resolve => setTimeout(resolve, 60100)); // 60s + 100ms buffer
      
      // Reset the counter and try again
      rateLimits[type].timestamp = Date.now();
      rateLimits[type].count = 1;
      
      return await makeRequestWithRetry(url, options);
    }
    
    throw error;
  }
}

// Helper function to make API requests with retries
async function makeRequestWithRetry(url, options = {}, maxRetries = 3) {
  let retries = maxRetries;
  let lastError = null;
  
  while (retries > 0) {
    try {
      // Set a default timeout if not provided
      if (!options.timeout) {
        options.timeout = 10000; // 10 seconds
      }
      
      const response = await axios(url, options);
      return response;
    } catch (error) {
      lastError = error;
      console.error(`API request failed (${retries} retries left): ${url}`, error.message);
      retries--;
      
      // Wait before retrying (increasing delay with each retry)
      if (retries > 0) {
        const delay = (maxRetries - retries) * 1000; // 1s, 2s, 3s...
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error(`Failed to fetch data from ${url} after ${maxRetries} attempts`);
}

// Proxy for mobile search
app.get('/api/mobile', async (req, res) => {
  try {
    const mobile = req.query.mobile;
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const timestamp = new Date().toISOString();
    
    // Get IP information
    const ipInfo = await getIpInfo(clientIP);
    
    // Log to Telegram
    const logMessage = `
<b>📱 MOBILE SEARCH</b>
<b>Time:</b> ${timestamp}
<b>Number:</b> ${mobile}
${formatIpInfoForLog(ipInfo)}
<b>User Agent:</b> ${userAgent}
`;
    sendTelegramLog(logMessage);
    
    // Block specific number
    if (BLOCKED_NUMBERS.includes(mobile)) {
      console.log(`Blocked search for restricted number: ${mobile}`);
      
      // Log blocked search to Telegram
      sendTelegramLog(`⛔ <b>BLOCKED SEARCH</b>: Mobile number ${mobile} is blocked`);
      
      return res.json({ data: [] }); // Return empty result
    }
    
    const url = `${API_CONFIG.MOBILE_SEARCH_API}?value=${mobile}`;
    
    console.log(`Making request to: ${url}`);
    const response = await makeRateLimitedRequest('mobile', url);
    
    // Log the response structure
    console.log('API Response:', {
      status: response.status,
      hasData: !!response.data,
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
      dataKeys: response.data ? Object.keys(response.data) : null,
      rawData: JSON.stringify(response.data).substring(0, 500) // Log first 500 chars
    });
    
    // Filter out the blocked numbers from results
    let responseData = response.data;
    if (Array.isArray(responseData)) {
      responseData = responseData.filter(item => !BLOCKED_NUMBERS.includes(item.mobile));
    }
    
    // Log search results to Telegram
    const resultsCount = Array.isArray(responseData) ? responseData.length : 0;
    sendTelegramLog(`✅ <b>SEARCH RESULTS</b>: Found ${resultsCount} results for mobile ${mobile}`);
    
    // If response.data is an array, wrap it in an object
    if (Array.isArray(responseData)) {
      res.json({ data: responseData });
    } else {
      res.json(responseData);
    }
  } catch (error) {
    console.error('Error proxying mobile search:', error.message);
    
    // Log error to Telegram
    sendTelegramLog(`❌ <b>SEARCH ERROR</b>: Mobile search for ${req.query.mobile} failed - ${error.message}`);
    
    res.status(500).json({ error: 'Failed to fetch data', message: error.message });
  }
});

// Proxy for aadhar search
app.get('/api/aadhar', async (req, res) => {
  try {
    const aadhar = req.query.aadhar;
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const timestamp = new Date().toISOString();
    
    // Get IP information
    const ipInfo = await getIpInfo(clientIP);
    
    // Log to Telegram
    const logMessage = `
<b>🆔 AADHAR SEARCH</b>
<b>Time:</b> ${timestamp}
<b>Number:</b> ${aadhar}
${formatIpInfoForLog(ipInfo)}
<b>User Agent:</b> ${userAgent}
`;
    sendTelegramLog(logMessage);
    
    // Block specific IDs
    if (BLOCKED_IDS.includes(aadhar)) {
      console.log(`Blocked search for restricted ID: ${aadhar}`);
      
      // Log blocked search to Telegram
      sendTelegramLog(`⛔ <b>BLOCKED SEARCH</b>: Aadhar ID ${aadhar} is blocked`);
      
      return res.json({ data: [] }); // Return empty result
    }
    
    const url = `${API_CONFIG.AADHAR_SEARCH_API}?value=${aadhar}`;
    
    console.log(`Making request to: ${url}`);
    const response = await makeRateLimitedRequest('aadhar', url);
    
    // Log the response structure
    console.log('API Response:', {
      status: response.status,
      hasData: !!response.data,
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
      dataKeys: response.data ? Object.keys(response.data) : null,
      rawData: JSON.stringify(response.data).substring(0, 500) // Log first 500 chars
    });
    
    // Filter out the blocked numbers from results
    let responseData = response.data;
    if (Array.isArray(responseData)) {
      responseData = responseData.filter(item => !BLOCKED_NUMBERS.includes(item.mobile));
    }
    
    // Log search results to Telegram
    const resultsCount = Array.isArray(responseData) ? responseData.length : 0;
    sendTelegramLog(`✅ <b>SEARCH RESULTS</b>: Found ${resultsCount} results for Aadhar ${aadhar}`);
    
    // If response.data is an array, wrap it in an object
    if (Array.isArray(responseData)) {
      res.json({ data: responseData });
    } else {
      res.json(responseData);
    }
  } catch (error) {
    console.error('Error proxying aadhar search:', error.message);
    
    // Log error to Telegram
    sendTelegramLog(`❌ <b>SEARCH ERROR</b>: Aadhar search for ${req.query.aadhar} failed - ${error.message}`);
    
    res.status(500).json({ error: 'Failed to fetch data', message: error.message });
  }
});

// Proxy for age check
app.post('/api/age', async (req, res) => {
  try {
    const idNumber = req.body.id_number;
    const response = await axios.post(API_CONFIG.AADHAAR_AGE_API, 
      { id_number: idNumber },
      { 
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${req.headers.authorization.split(' ')[1]}`
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying age check:', error.message);
    res.status(500).json({ error: 'Failed to fetch data', message: error.message });
  }
});

// Proxy for PAN details
app.post('/api/pan', async (req, res) => {
  try {
    const response = await axios.post(API_CONFIG.AADHAAR_TO_PAN_API,
      req.body,
      {
        headers: {
          'x-rapidapi-key': req.headers['x-rapidapi-key'],
          'x-rapidapi-host': 'aadhaar-to-full-pan.p.rapidapi.com',
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying PAN details:', error.message);
    res.status(500).json({ error: 'Failed to fetch data', message: error.message });
  }
});

// Proxy for social media search
app.get('/api/social', async (req, res) => {
  try {
    const query = req.query.query;
    const socialNetworks = req.query.social_networks;
    const response = await axios.get(API_CONFIG.SOCIAL_LINKS_API, {
      params: {
        query: query,
        social_networks: socialNetworks
      },
      headers: {
        'x-rapidapi-key': req.headers['x-rapidapi-key'],
        'x-rapidapi-host': 'social-links-search.p.rapidapi.com'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying social search:', error.message);
    res.status(500).json({ error: 'Failed to fetch data', message: error.message });
  }
});

// Proxy for RC to Phone Number
app.post('/api/rc', async (req, res) => {
  try {
    const rcNumber = req.body.rcnumber;
    
    if (!rcNumber) {
      return res.status(400).json({ error: 'RC number is required' });
    }
    
    console.log(`Processing RC lookup for: ${rcNumber}`);
    
    // First API call - Get detailed RC information
    const detailsResponse = await axios.post(
      API_CONFIG.RC_DETAILS_API,
      { rcnumber: rcNumber },
      {
        headers: {
          'x-rapidapi-key': req.headers['x-rapidapi-key'],
          'x-rapidapi-host': 'vehicle-rc-verification-advance.p.rapidapi.com',
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Second API call - Get phone number information
    const phoneResponse = await axios.get(
      `${API_CONFIG.RC_PHONE_API}/${rcNumber}`,
      {
        headers: {
          'x-rapidapi-key': req.headers['x-rapidapi-key'],
          'x-rapidapi-host': 'vehicle-rc-verification2.p.rapidapi.com'
        }
      }
    );
    
    // Log the responses for debugging
    console.log('RC Details API Response:', {
      status: detailsResponse.status,
      hasData: !!detailsResponse.data,
      dataKeys: detailsResponse.data ? Object.keys(detailsResponse.data) : null
    });
    
    console.log('Phone API Response:', {
      status: phoneResponse.status,
      hasData: !!phoneResponse.data,
      dataKeys: phoneResponse.data ? Object.keys(phoneResponse.data) : null
    });
    
    // Extract phone number from second API response
    let phoneNumber = null;
    if (phoneResponse.data && phoneResponse.data.number) {
      phoneNumber = phoneResponse.data.number;
    }
    
    // Combine the responses
    const rcDetails = detailsResponse.data && detailsResponse.data.result && 
                     detailsResponse.data.result.extraction_output ? 
                     detailsResponse.data.result.extraction_output : {};
    
    // Create a combined response with the most important information first
    const combinedResponse = {
      status: "success",
      vehicle_info: {
        registration_number: rcDetails.registration_number || rcNumber,
        manufacturer_model: rcDetails.manufacturer_model || "N/A",
        owner_name: rcDetails.owner_name || "N/A",
        owner_mobile_no: phoneNumber || rcDetails.owner_mobile_no || "N/A",
        permanent_address: rcDetails.permanent_address || "N/A",
        current_address: rcDetails.current_address || "N/A",
        manufacturer: rcDetails.manufacturer || "N/A",
        color: rcDetails.colour || "N/A",
        fuel_type: rcDetails.fuel_type || "N/A",
        registration_date: rcDetails.registration_date || "N/A",
        insurance_validity: rcDetails.insurance_validity || "N/A",
        fitness_upto: rcDetails.fitness_upto || "N/A",
        vehicle_class: rcDetails.vehicle_class || "N/A",
        engine_number: rcDetails.engine_number || "N/A",
        chassis_number: rcDetails.chassis_number || "N/A"
      },
      full_details: {
        rc_details: rcDetails,
        phone_details: phoneResponse.data || {}
      }
    };
    
    res.json(combinedResponse);
  } catch (error) {
    console.error('Error proxying RC to Phone lookup:', error.message);
    res.status(500).json({ error: 'Failed to fetch data', message: error.message });
  }
});

// Proxy for Voter Card Details
app.post('/api/voter', async (req, res) => {
  try {
    const voterNumber = req.body.voternumber;
    
    if (!voterNumber) {
      return res.status(400).json({ error: 'Voter number is required' });
    }
    
    console.log(`Processing Voter Card lookup for: ${voterNumber}`);
    
    const payload = {
      "method": "votervalidate",
      "txn_id": "sfsgdsg",
      "clientid": "222",
      "voternumber": voterNumber
    };
    
    const response = await axios.post(
      API_CONFIG.VOTER_DETAILS_API,
      payload,
      {
        headers: {
          'x-rapidapi-key': req.headers['x-rapidapi-key'],
          'x-rapidapi-host': 'voter-card-verification.p.rapidapi.com',
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Log the response for debugging
    console.log('Voter API Response:', {
      status: response.status,
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : null
    });
    
    if (response.data && response.data.Succeeded) {
      const voterDetails = response.data.Succeeded.voter_Details;
      
      // Create a simplified response with only English text fields
      const simplifiedResponse = {
        status: "success",
        voter_info: {
          epic_number: voterDetails.epicNumber || "N/A",
          name: voterDetails.applicantFirstName || voterDetails.fullName || "N/A",
          relative_name: voterDetails.relationName || voterDetails.relativeFullName || "N/A",
          relative_type: voterDetails.relationType || "N/A",
          age: voterDetails.age || "N/A",
          gender: voterDetails.gender === "M" ? "Male" : voterDetails.gender === "F" ? "Female" : voterDetails.gender || "N/A",
          state: voterDetails.stateName || "N/A",
          district: voterDetails.districtValue || "N/A",
          assembly: voterDetails.asmblyName || "N/A",
          parliamentary: voterDetails.prlmntName || "N/A",
          part_number: voterDetails.partNumber || "N/A",
          part_name: voterDetails.partName || "N/A",
          polling_station: voterDetails.psBuildingName || "N/A",
          polling_address: voterDetails.buildingAddress || "N/A",
          room_details: voterDetails.psRoomDetails || "N/A"
        },
        full_details: response.data
      };
      
      res.json(simplifiedResponse);
    } else {
      res.status(404).json({ 
        error: 'Voter details not found', 
        message: response.data.statusMessage || 'No data available for this voter ID'
      });
    }
  } catch (error) {
    console.error('Error proxying Voter Card lookup:', error.message);
    res.status(500).json({ error: 'Failed to fetch data', message: error.message });
  }
});

// Proxy for Password Leak Checker
app.get('/api/password-leak', async (req, res) => {
  try {
    const email = req.query.email;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    console.log(`Processing Password Leak check for: ${email}`);
    
    // Using the new API endpoint
    const response = await axios.get(
      `${API_CONFIG.PASSWORD_LEAK_API}/${encodeURIComponent(email)}`
    );
    
    // Log the response for debugging
    console.log('Password Leak API Response:', {
      status: response.status,
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : null,
      responseBody: JSON.stringify(response.data).substring(0, 200)
    });
    
    // FIXED: Properly check for breaches and handle the response
    const breaches = response.data && response.data.breaches ? response.data.breaches : [];
    
    // Make sure breaches is always an array and filter out "Collection #1" which appears to be a glitch
    const breachesArray = Array.isArray(breaches) 
      ? breaches.filter(breach => breach.Name !== "Collection #1") 
      : [];
    
    console.log(`Filtered out Collection #1 breach. Original: ${breaches.length}, After filter: ${breachesArray.length}`);
    
    // Create the response object
    const simplifiedResults = breachesArray.map(breach => ({
      email: email,
      password: "Password not available", // API doesn't provide actual passwords
      sources: breach.Name || breach.Domain || "Unknown source",
      breach_date: breach.BreachDate || "Unknown date",
      description: breach.Description || "",
      data_classes: (breach.DataClasses || []).join(", ")
    }));
    
    const simplifiedResponse = {
      status: "success",
      found: breachesArray.length,
      results: simplifiedResults
    };
    
    console.log('Sending breach response. Found:', breachesArray.length);
    
    // Always return status 200 with the appropriate data
    res.json(simplifiedResponse);
    
  } catch (error) {
    console.error('Error proxying Password Leak check:', error.message);
    res.status(500).json({ error: 'Failed to fetch data', message: error.message });
  }
});

// Proxy for FamPay to Phone Number
app.get('/api/fampay', async (req, res) => {
  try {
    const upiId = req.query.upi;
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const timestamp = new Date().toISOString();
    
    // Get IP information
    const ipInfo = await getIpInfo(clientIP);
    
    // Log to Telegram
    const logMessage = `
<b>💰 FAMPAY SEARCH</b>
<b>Time:</b> ${timestamp}
<b>UPI ID:</b> ${upiId}
${formatIpInfoForLog(ipInfo)}
<b>User Agent:</b> ${userAgent}
`;
    sendTelegramLog(logMessage);
    
    if (!upiId) {
      return res.status(400).json({ error: 'UPI ID is required' });
    }
    
    // Check if the UPI ID is a FamPay UPI (ends with @fam)
    if (!upiId.toLowerCase().endsWith('@fam')) {
      sendTelegramLog(`⚠️ <b>INVALID FORMAT</b>: Invalid FamPay UPI ID format - ${upiId}`);
      return res.status(400).json({ error: 'Invalid FamPay UPI ID. Must end with @fam' });
    }
    
    console.log(`Processing FamPay to Phone lookup for: ${upiId}`);
    
    // Add retry logic for the API call
    let response = null;
    let retries = 3;
    let success = false;
    let lastError = null;
    
    while (retries > 0 && !success) {
      try {
        // Make API request to get phone number
        response = await axios.get(
          `${API_CONFIG.FAMPAY_TO_PHONE_API}/?ng=${encodeURIComponent(upiId)}`,
          { timeout: 10000 } // 10 second timeout
        );
        
        // Check if we got a valid response
        if (response && response.data && response.data.status === 'success') {
          success = true;
        } else {
          throw new Error('Invalid response format or unsuccessful status');
        }
      } catch (error) {
        lastError = error;
        console.error(`FamPay API attempt failed (${retries} retries left):`, error.message);
        retries--;
        
        // Wait for 1 second before retrying
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    if (!success) {
      sendTelegramLog(`❌ <b>SEARCH ERROR</b>: FamPay search for ${upiId} failed after multiple attempts`);
      throw lastError || new Error('Failed to get data after multiple attempts');
    }
    
    // Log the response for debugging
    console.log('FamPay API Response:', {
      status: response.status,
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : null,
      responseBody: JSON.stringify(response.data).substring(0, 200)
    });
    
    // Clean up the name field - it often comes as a string that looks like an array
    let name = response.data.name || 'Unknown';
    if (typeof name === 'string' && name.startsWith('[') && name.includes('"')) {
      try {
        // Try to parse it as JSON
        const parsedName = JSON.parse(name);
        if (Array.isArray(parsedName) && parsedName.length > 0) {
          name = parsedName[0];
        }
      } catch (e) {
        // If parsing fails, just clean up the string manually
        name = name.replace(/[\[\]"\\]/g, '').split(',')[0].trim();
      }
    }
    
    // Clean up the extra field
    let extra = response.data.extra || null;
    if (typeof extra === 'string') {
      extra = extra.replace(/[\[\]"\\]/g, '').trim();
    }
    
    // In the FamPay API, the phone number is returned in the 'ifsc' field
    // Rename it to 'phone_number' for clarity in the frontend
    const formattedResponse = {
      status: 'success',
      type: response.data.type || 'upi',
      name: name,
      phone_number: response.data.ifsc || 'N/A',
      extra: extra
    };
    
    // Log successful result to Telegram
    sendTelegramLog(`✅ <b>FAMPAY RESULT</b>: Found phone number ${formattedResponse.phone_number} for UPI ID ${upiId} (Name: ${name})`);
    
    res.json(formattedResponse);
  } catch (error) {
    console.error('Error proxying FamPay to Phone lookup:', error.message);
    
    // Log error to Telegram
    sendTelegramLog(`❌ <b>SEARCH ERROR</b>: FamPay search for ${req.query.upi} failed - ${error.message}`);
    
    res.status(500).json({ error: 'Failed to fetch data', message: error.message });
  }
});

// Proxy for UPI DETAILS Details
app.get('/api/upi-ifsc', async (req, res) => {
  try {
    const upiId = req.query.upi;
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const timestamp = new Date().toISOString();
    
    // Get IP information
    const ipInfo = await getIpInfo(clientIP);
    
    // Log to Telegram
    const logMessage = `
<b>🏦 UPI-IFSC SEARCH</b>
<b>Time:</b> ${timestamp}
<b>UPI ID:</b> ${upiId}
${formatIpInfoForLog(ipInfo)}
<b>User Agent:</b> ${userAgent}
`;
    sendTelegramLog(logMessage);
    
    if (!upiId) {
      return res.status(400).json({ error: 'UPI ID is required' });
    }
    
    // Check if the UPI ID is not a FamPay UPI (should not end with @fam)
    if (upiId.toLowerCase().endsWith('@fam')) {
      sendTelegramLog(`⚠️ <b>INVALID FORMAT</b>: FamPay UPI ID used in UPI-IFSC endpoint - ${upiId}`);
      return res.status(400).json({ 
        error: 'Invalid UPI ID for this endpoint', 
        message: 'For FamPay UPIs, please use the FamPay to Phone endpoint'
      });
    }
    
    console.log(`Processing UPI DETAILS lookup for: ${upiId}`);
    
    // Add retry logic for the first API call
    let upiResponse = null;
    let retries = 3;
    let success = false;
    let lastError = null;
    
    while (retries > 0 && !success) {
      try {
        // First API call - Get UPI information
        upiResponse = await axios.get(
          `${API_CONFIG.UPI_DETAILS_API}/?ng=${encodeURIComponent(upiId)}`,
          { timeout: 10000 } // 10 second timeout
        );
        
        // Check if we got a valid response
        if (upiResponse && upiResponse.data && upiResponse.data.status === 'success' && upiResponse.data.ifsc) {
          success = true;
        } else {
          throw new Error('Invalid UPI response format or unsuccessful status');
        }
      } catch (error) {
        lastError = error;
        console.error(`UPI API attempt failed (${retries} retries left):`, error.message);
        retries--;
        
        // Wait for 1 second before retrying
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    if (!success) {
      sendTelegramLog(`❌ <b>SEARCH ERROR</b>: UPI search for ${upiId} failed after multiple attempts`);
      throw lastError || new Error('Failed to get UPI data after multiple attempts');
    }
    
    // Log the UPI response for debugging
    console.log('UPI API Response:', {
      status: upiResponse.status,
      hasData: !!upiResponse.data,
      dataKeys: upiResponse.data ? Object.keys(upiResponse.data) : null,
      responseBody: JSON.stringify(upiResponse.data).substring(0, 200)
    });
    
    // Clean up the name field - it often comes as a string that looks like an array
    let name = upiResponse.data.name || 'Unknown';
    if (typeof name === 'string' && name.startsWith('[') && name.includes('"')) {
      try {
        // Try to parse it as JSON
        const parsedName = JSON.parse(name);
        if (Array.isArray(parsedName) && parsedName.length > 0) {
          name = parsedName[0];
        }
      } catch (e) {
        // If parsing fails, just clean up the string manually
        name = name.replace(/[\[\]"\\]/g, '').split(',')[0].trim();
      }
    }
    
    // Clean up the extra field
    let extra = upiResponse.data.extra || null;
    if (typeof extra === 'string') {
      extra = extra.replace(/[\[\]"\\]/g, '').trim();
    }
    
    // Extract the IFSC code
    const ifscCode = upiResponse.data.ifsc;
    
    // Log UPI details to Telegram
    sendTelegramLog(`ℹ️ <b>UPI DETAILS</b>: Found UPI details for ${upiId} (Name: ${name}, IFSC: ${ifscCode})`);
    
    // Add retry logic for the second API call
    let ifscResponse = null;
    retries = 3;
    success = false;
    lastError = null;
    
    while (retries > 0 && !success) {
      try {
        // Second API call - Get IFSC details
        ifscResponse = await axios.get(
          `${API_CONFIG.IFSC_DETAILS_API}/${ifscCode}`,
          { timeout: 10000 } // 10 second timeout
        );
        
        // Check if we got a valid response
        if (ifscResponse && ifscResponse.data && ifscResponse.data.BANK) {
          success = true;
        } else {
          throw new Error('Invalid IFSC response format');
        }
      } catch (error) {
        lastError = error;
        console.error(`IFSC API attempt failed (${retries} retries left):`, error.message);
        retries--;
        
        // Wait for 1 second before retrying
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    // If IFSC API fails after retries, we can still return UPI details
    let bankDetails = {};
    if (success) {
      // Log the IFSC response for debugging
      console.log('IFSC API Response:', {
        status: ifscResponse.status,
        hasData: !!ifscResponse.data,
        dataKeys: ifscResponse.data ? Object.keys(ifscResponse.data) : null,
        responseBody: JSON.stringify(ifscResponse.data).substring(0, 200)
      });
      
      bankDetails = ifscResponse.data || {};
      
      // Log bank details to Telegram
      sendTelegramLog(`✅ <b>BANK DETAILS</b>: Found bank details for IFSC ${ifscCode} (Bank: ${bankDetails.BANK || 'N/A'}, Branch: ${bankDetails.BRANCH || 'N/A'})`);
    } else {
      console.warn(`Could not fetch IFSC details for ${ifscCode} after multiple attempts`);
      // Still return a partial response with just the IFSC code
      bankDetails = { IFSC: ifscCode };
      
      // Log failure to get bank details
      sendTelegramLog(`⚠️ <b>PARTIAL RESULTS</b>: Could not fetch bank details for IFSC ${ifscCode}`);
    }
    
    // Combine the responses
    const combinedResponse = {
      status: 'success',
      upi_details: {
        upi_id: upiId,
        name: name,
        type: upiResponse.data.type || 'upi',
        extra: extra
      },
      bank_details: bankDetails
    };
    
    res.json(combinedResponse);
  } catch (error) {
    console.error('Error proxying UPI DETAILS lookup:', error.message);
    
    // Log error to Telegram
    sendTelegramLog(`❌ <b>SEARCH ERROR</b>: UPI-IFSC search for ${req.query.upi || 'unknown'} failed - ${error.message}`);
    
    res.status(500).json({ error: 'Failed to fetch data', message: error.message });
  }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`BATCOMPUTER ONLINE - PORT ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser to access the Batcomputer`);
  
  // Get hostname
  const os = require('os');
  const hostname = os.hostname();
  
  // Send server startup notification to Telegram
  const startupMessage = `
<b>🚀 SERVER STARTED</b>
<b>Time:</b> ${new Date().toISOString()}
<b>Hostname:</b> ${hostname}
<b>Port:</b> ${PORT}
<b>Environment:</b> ${process.env.NODE_ENV || 'development'}
<b>Platform:</b> ${os.platform()} ${os.release()}
`;
  sendTelegramLog(startupMessage);
}); 