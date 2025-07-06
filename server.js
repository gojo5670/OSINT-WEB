const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

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
    const url = `https://presents-specialties-mention-simpson.trycloudflare.com/search?key=bhanu&mobile=${mobile}`;
    
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
    const url = `https://presents-specialties-mention-simpson.trycloudflare.com/search?key=bhanu&aadhar=${aadhar}`;
    
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
    const response = await axios.post('https://kyc-api.aadhaarkyc.io/api/v1/aadhaar-validation/aadhaar-validation', 
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
    const response = await axios.post('https://aadhaar-to-full-pan.p.rapidapi.com/Aadhaar_to_pan',
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
    const response = await axios.get(`https://social-links-search.p.rapidapi.com/search-social-links`, {
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
      'https://vehicle-rc-verification-advance.p.rapidapi.com/Getrcfulldetails',
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
      `https://vehicle-rc-verification2.p.rapidapi.com/vehicle/${rcNumber}`,
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
      'https://voter-card-verification.p.rapidapi.com/Getvoterfulldetails',
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
    
    const response = await axios.get(
      'https://breachdirectory.p.rapidapi.com/',
      {
        params: {
          func: "auto",
          term: email
        },
        headers: {
          'x-rapidapi-key': req.headers['x-rapidapi-key'],
          'x-rapidapi-host': 'breachdirectory.p.rapidapi.com'
        }
      }
    );
    
    // Log the response for debugging
    console.log('Password Leak API Response:', {
      status: response.status,
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : null
    });
    
    if (response.data && response.data.success) {
      // Create a simplified response with only the required fields
      const simplifiedResults = response.data.result.map(item => ({
        email: item.email || email,
        password: item.password || "No password found",
        sources: item.sources || "Unknown source"
      }));
      
      const simplifiedResponse = {
        status: "success",
        found: response.data.found || 0,
        results: simplifiedResults
      };
      
      res.json(simplifiedResponse);
    } else {
      res.status(404).json({ 
        error: 'No leak data found', 
        message: 'No data available for this email'
      });
    }
  } catch (error) {
    console.error('Error proxying Password Leak check:', error.message);
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