const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const API_CONFIG = require('./api-config');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Serve static files
app.use(express.static(__dirname));

// For POST requests, we need to parse JSON body
app.use(express.json());

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
    
    // Make the request
    const response = await axios(url, options);
    return response;
  } catch (error) {
    // If we get a 429, wait and retry once
    if (error.response && error.response.status === 429) {
      console.log(`Received 429 for ${type}. Waiting 60 seconds before retrying...`);
      
      // Wait 60 seconds
      await new Promise(resolve => setTimeout(resolve, 60100)); // 60s + 100ms buffer
      
      // Reset the counter and try again
      rateLimits[type].timestamp = Date.now();
      rateLimits[type].count = 1;
      
      return await axios(url, options);
    }
    
    throw error;
  }
}

// Proxy for mobile search
app.get('/api/mobile', async (req, res) => {
  try {
    const mobile = req.query.mobile;
    const url = `${API_CONFIG.MOBILE_SEARCH_API}?key=bhanu&mobile=${mobile}`;
    
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
    
    // If response.data is an array, wrap it in an object
    if (Array.isArray(response.data)) {
      res.json({ data: response.data });
    } else {
      res.json(response.data);
    }
  } catch (error) {
    console.error('Error proxying mobile search:', error.message);
    res.status(500).json({ error: 'Failed to fetch data', message: error.message });
  }
});

// Proxy for aadhar search
app.get('/api/aadhar', async (req, res) => {
  try {
    const aadhar = req.query.aadhar;
    const url = `${API_CONFIG.AADHAR_SEARCH_API}?key=bhanu&aadhar=${aadhar}`;
    
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
    
    // If response.data is an array, wrap it in an object
    if (Array.isArray(response.data)) {
      res.json({ data: response.data });
    } else {
      res.json(response.data);
    }
  } catch (error) {
    console.error('Error proxying aadhar search:', error.message);
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
    
    if (!upiId) {
      return res.status(400).json({ error: 'UPI ID is required' });
    }
    
    // Check if the UPI ID is a FamPay UPI (ends with @fam)
    if (!upiId.toLowerCase().endsWith('@fam')) {
      return res.status(400).json({ error: 'Invalid FamPay UPI ID. Must end with @fam' });
    }
    
    console.log(`Processing FamPay to Phone lookup for: ${upiId}`);
    
    // Make API request to get phone number
    const response = await axios.get(
      `${API_CONFIG.FAMPAY_TO_PHONE_API}/?ng=${encodeURIComponent(upiId)}`
    );
    
    // Log the response for debugging
    console.log('FamPay API Response:', {
      status: response.status,
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : null,
      responseBody: JSON.stringify(response.data).substring(0, 200)
    });
    
    // Check if the response is successful and has the expected structure
    if (response.data && response.data.status === 'success') {
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
      
      res.json(formattedResponse);
    } else {
      res.status(404).json({ 
        error: 'Phone number not found', 
        message: 'Could not retrieve phone number for this FamPay UPI ID'
      });
    }
  } catch (error) {
    console.error('Error proxying FamPay to Phone lookup:', error.message);
    res.status(500).json({ error: 'Failed to fetch data', message: error.message });
  }
});

// Proxy for UPI DETAILS Details
app.get('/api/upi-ifsc', async (req, res) => {
  try {
    const upiId = req.query.upi;
    
    if (!upiId) {
      return res.status(400).json({ error: 'UPI ID is required' });
    }
    
    // Check if the UPI ID is not a FamPay UPI (should not end with @fam)
    if (upiId.toLowerCase().endsWith('@fam')) {
      return res.status(400).json({ 
        error: 'Invalid UPI ID for this endpoint', 
        message: 'For FamPay UPIs, please use the FamPay to Phone endpoint'
      });
    }
    
    console.log(`Processing UPI DETAILS lookup for: ${upiId}`);
    
    // First API call - Get UPI information
    const upiResponse = await axios.get(
      `${API_CONFIG.UPI_DETAILS_API}/?ng=${encodeURIComponent(upiId)}`
    );
    
    // Log the UPI response for debugging
    console.log('UPI API Response:', {
      status: upiResponse.status,
      hasData: !!upiResponse.data,
      dataKeys: upiResponse.data ? Object.keys(upiResponse.data) : null,
      responseBody: JSON.stringify(upiResponse.data).substring(0, 200)
    });
    
    // Check if the UPI response is successful and has the expected structure
    if (upiResponse.data && upiResponse.data.status === 'success' && upiResponse.data.ifsc) {
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
      
      // Second API call - Get IFSC details
      const ifscResponse = await axios.get(`${API_CONFIG.IFSC_DETAILS_API}/${ifscCode}`);
      
      // Log the IFSC response for debugging
      console.log('IFSC API Response:', {
        status: ifscResponse.status,
        hasData: !!ifscResponse.data,
        dataKeys: ifscResponse.data ? Object.keys(ifscResponse.data) : null,
        responseBody: JSON.stringify(ifscResponse.data).substring(0, 200)
      });
      
      // Combine the responses
      const combinedResponse = {
        status: 'success',
        upi_details: {
          upi_id: upiId,
          name: name,
          type: upiResponse.data.type || 'upi',
          extra: extra
        },
        bank_details: ifscResponse.data || {}
      };
      
      res.json(combinedResponse);
    } else {
      res.status(404).json({ 
        error: 'Bank details not found', 
        message: 'Could not retrieve bank details for this UPI ID'
      });
    }
  } catch (error) {
    console.error('Error proxying UPI DETAILS lookup:', error.message);
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
}); 