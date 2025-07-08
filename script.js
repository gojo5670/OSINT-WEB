document.addEventListener('DOMContentLoaded', function() {
    // API endpoints - Updated to use our local proxy server
    const API_ENDPOINTS = {
        MOBILE_SEARCH: "/api/mobile",
        AADHAR_SEARCH: "/api/aadhar",
        AADHAAR_AGE: "/api/age",
        AADHAAR_TO_PAN: "/api/pan",
        SOCIAL_LINKS: "/api/social",
        RC_TO_PHONE: "/api/rc",
        VOTER_DETAILS: "/api/voter",
        PASSWORD_LEAK: "/api/password-leak"
    };

    // API Keys
    const API_KEYS = {
        AADHAAR_API_KEY: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTY0MTIxNDczNSwianRpIjoiMmE4MWZkMTUtNWU0Yy00NjY1LWE0NTItYTE4ZDRmZTRkOTdkIiwidHlwZSI6ImFjY2VzcyIsImlkZW50aXR5IjoiZGV2LmtyNGFsbEBhYWRoYWFyYXBpLmlvIiwibmJmIjoxNjQxMjE0NzM1LCJleHAiOjE5NTY1NzQ3MzUsInVzZXJfY2xhaW1zIjp7InNjb3BlcyI6WyJyZWFkIl19fQ.xq-191hmb69EjYkJ5r4c2yAJNf2lMqnA_3PhfnCrzNY",
        SOCIAL_LINKS_API_KEY: "525a6a5a93msh3b9d06f41651572p16ef82jsnfb8eeb3cc004"
    };

    // Tab functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Show corresponding content
            const tabId = button.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });

    // Modal functionality
    const modal = document.getElementById('info-modal');
    const closeModal = document.querySelector('.close-modal');

    // Close modal when clicking the X
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Close modal when clicking outside the modal content
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Show modal function (can be triggered from anywhere)
    function showInfoModal() {
        modal.style.display = 'block';
    }

    // Add info button to header
    const header = document.querySelector('header');
    const infoButton = document.createElement('button');
    infoButton.innerHTML = '<i class="fas fa-info-circle"></i> BAT MANUAL';
    infoButton.classList.add('info-button');
    infoButton.style.position = 'absolute';
    infoButton.style.top = '20px';
    infoButton.style.right = '20px';
    infoButton.style.padding = '8px 15px';
    infoButton.style.cursor = 'pointer';
    
    infoButton.addEventListener('click', showInfoModal);
    
    // Make header position relative for absolute positioning of the button
    header.style.position = 'relative';
    header.appendChild(infoButton);

    // Helper function to show loading state
    function showLoading() {
        const loadingElement = document.getElementById('loading');
        loadingElement.classList.remove('hidden');
        document.getElementById('results').innerHTML = '';
        
        // Set up terminal text animation
        const terminalText = document.querySelector('.terminal-text');
        if (terminalText) {
            const messages = [
                "Accessing Batcomputer...",
                "Scanning database...",
                "Bypassing security...",
                "Retrieving data...",
                "Decrypting files..."
            ];
            
            let messageIndex = 0;
            
            // Clear any existing interval
            if (window.terminalInterval) {
                clearInterval(window.terminalInterval);
            }
            
            // Set initial message
            terminalText.textContent = messages[0];
            
            // Change message every 4 seconds (matching the animation duration)
            window.terminalInterval = setInterval(() => {
                messageIndex = (messageIndex + 1) % messages.length;
                terminalText.textContent = messages[messageIndex];
            }, 4000);
        }
    }

    // Helper function to hide loading state
    function hideLoading() {
        document.getElementById('loading').classList.add('hidden');
        
        // Clear the interval when hiding the loader
        if (window.terminalInterval) {
            clearInterval(window.terminalInterval);
            window.terminalInterval = null;
        }
    }

    // Add copy button functionality
    const copyButton = document.getElementById('copy-results-btn');
    const resultsContainer = document.getElementById('results');
    
    // Initially hide the copy button
    if (copyButton) {
        copyButton.style.display = 'none';
    }
    
    // Function to check if there are results and show/hide the copy button
    function checkResults() {
        if (copyButton && resultsContainer) {
            // Check if there's any content in the results container
            if (resultsContainer.children.length > 0 && resultsContainer.textContent.trim() !== '') {
                copyButton.style.display = 'flex';
            } else {
                copyButton.style.display = 'none';
            }
        }
    }
    
    // Set up a MutationObserver to watch for changes in the results container
    const observer = new MutationObserver(checkResults);
    
    // Start observing the results container for changes
    if (resultsContainer) {
        observer.observe(resultsContainer, { 
            childList: true,
            subtree: true,
            characterData: true
        });
    }
    
    // Initial check
    checkResults();

    // Helper function to show results - modified to check for copy button visibility
    function showResults(html) {
        document.getElementById('results').innerHTML = html;
        // Check if we should show the copy button
        checkResults();
        // Scroll to results
        document.querySelector('.results-container').scrollIntoView({ behavior: 'smooth' });
    }

    // Helper function to show error message
    function showError(message) {
        const errorHtml = `<div class="error-message">${message}</div>`;
        showResults(errorHtml);
    }

    // Helper function to show rate limit message
    function showRateLimitMessage() {
        const message = `
            <div class="warning-message">
                <h3>⚠️ BATCOMPUTER OVERLOAD</h3>
                <p>The Batcomputer is processing multiple requests. Your search is being processed, but it may take a moment.</p>
                <p>Please be patient while the system recharges.</p>
                <div class="spinner" style="margin: 15px auto;"></div>
            </div>
        `;
        showResults(message);
    }

    // Helper function to validate mobile number
    function isValidMobile(mobile) {
        return /^\d{10}$/.test(mobile);
    }

    // Helper function to validate Aadhar number
    function isValidAadhar(aadhar) {
        return /^\d{12}$/.test(aadhar);
    }

    // Helper function to make API requests
    async function fetchData(url, options = {}) {
        try {
            console.log(`Fetching data from: ${url}`);
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                });
                throw new Error(`HTTP error! Status: ${response.status}, ${errorText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.warn('Response is not JSON:', text);
                throw new Error('Invalid response format: Expected JSON');
            }
            
            const data = await response.json();
            
            // Enhanced logging for password leak endpoint
            if (url.includes('/api/password-leak')) {
                console.log('Password Leak API Response Data:', {
                    status: data.status,
                    found: data.found,
                    resultsLength: data.results?.length,
                    fullData: JSON.stringify(data).substring(0, 500)
                });
            } else {
                console.log('Response data:', data);
            }
            
            // Check for error messages in the response
            if (data && data.error) {
                throw new Error(`API Error: ${data.error}${data.message ? ` - ${data.message}` : ''}`);
            }
            
            return data;
        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    }

    // Function to format person data into HTML
    function formatPersonData(person, index, total) {
        const mobile = person.mobile || 'N/A';
        const altMobile = person.alt || 'N/A';
        const id = person.id || 'N/A';
        const name = person.name || 'N/A';
        const fatherName = person.fname || 'N/A';
        const address = (person.address || 'N/A').replace(/!/g, ', ');
        const circle = person.circle || 'N/A';
        const email = person.email || '';
        
        let html = `
            <div class="result-card">
                <h3>SUBJECT PROFILE (${index + 1}/${total})</h3>
                <p><strong>👤 Name:</strong> ${name}</p>
                <p><strong>👨‍👦 Father's Name:</strong> ${fatherName}</p>
                <p><strong>🏠 Address:</strong> <span class="copyable" onclick="copyToClipboard(this)">${address}</span></p>
                <p><strong>🌎 Circle:</strong> ${circle}</p>
                <p><strong>📱 Mobile:</strong> <span class="copyable" onclick="copyToClipboard(this)">${mobile}</span></p>
                <p><strong>📞 Alt Mobile:</strong> <span class="copyable" onclick="copyToClipboard(this)">${altMobile}</span></p>
                <p><strong>🆔Aadhaar No:</strong> <span class="copyable" onclick="copyToClipboard(this)">${id}</span></p>
        `;
        
        if (email) {
            html += `<p><strong>📧 Email:</strong> <span class="copyable" onclick="copyToClipboard(this)">${email}</span></p>`;
        }
        
        html += '</div>';
        return html;
    }

    // Mobile Search functionality
    document.getElementById('mobile-search-btn').addEventListener('click', async function() {
        const mobileNumber = document.getElementById('mobile-input').value.trim();
        
        if (!isValidMobile(mobileNumber)) {
            showError('Please enter a valid 10-digit mobile number.');
            return;
        }
        
        showLoading();
        
        try {
            const apiUrl = `${API_ENDPOINTS.MOBILE_SEARCH}?mobile=${mobileNumber}`;
            
            // Show rate limit message if this is not the first search
            if (localStorage.getItem('lastMobileSearch') && 
                Date.now() - localStorage.getItem('lastMobileSearch') < 60000) {
                showRateLimitMessage();
            }
            
            // Store the timestamp of this search
            localStorage.setItem('lastMobileSearch', Date.now());
            
            // Make the API request
            const data = await fetchData(apiUrl);
            
            // Debug the response
            console.log('Frontend received data:', data);
            
            // Handle different response formats
            let resultsData = [];
            if (data.data && Array.isArray(data.data)) {
                resultsData = data.data;
            } else if (Array.isArray(data)) {
                resultsData = data;
            }
            
            if (resultsData.length > 0) {
                const count = resultsData.length;
                let resultsHtml = `<div class="success-message">BATCOMPUTER FOUND ${count} RESULT(S) FOR MOBILE: ${mobileNumber}</div>`;
                
                resultsData.forEach((person, index) => {
                    resultsHtml += formatPersonData(person, index, count);
                });
                
                showResults(resultsHtml);
            } else {
                showError('BATCOMPUTER FOUND NO INFORMATION FOR THIS MOBILE NUMBER.');
            }
        } catch (error) {
            if (error.message.includes('429')) {
                showError('BATCOMPUTER OVERLOADED. PLEASE WAIT A MINUTE BEFORE TRYING AGAIN.');
            } else {
                showError(`ERROR: ${error.message}`);
            }
        } finally {
            hideLoading();
        }
    });

    // Aadhar Search functionality
    document.getElementById('aadhar-search-btn').addEventListener('click', async function() {
        const aadharNumber = document.getElementById('aadhar-input').value.trim();
        
        if (!isValidAadhar(aadharNumber)) {
            showError('Please enter a valid 12-digit Aadhar number.');
            return;
        }
        
        showLoading();
        
        try {
            const apiUrl = `${API_ENDPOINTS.AADHAR_SEARCH}?aadhar=${aadharNumber}`;
            
            // Show rate limit message if this is not the first search
            if (localStorage.getItem('lastAadharSearch') && 
                Date.now() - localStorage.getItem('lastAadharSearch') < 60000) {
                showRateLimitMessage();
            }
            
            // Store the timestamp of this search
            localStorage.setItem('lastAadharSearch', Date.now());
            
            const data = await fetchData(apiUrl);
            
            // Debug the response
            console.log('Frontend received data:', data);
            
            // Handle different response formats
            let resultsData = [];
            if (data.data && Array.isArray(data.data)) {
                resultsData = data.data;
            } else if (Array.isArray(data)) {
                resultsData = data;
            }
            
            if (resultsData.length > 0) {
                const count = resultsData.length;
                let resultsHtml = `<div class="success-message">BATCOMPUTER FOUND ${count} RESULT(S) FOR AADHAR: ${aadharNumber}</div>`;
                
                resultsData.forEach((person, index) => {
                    resultsHtml += formatPersonData(person, index, count);
                });
                
                showResults(resultsHtml);
            } else {
                showError('BATCOMPUTER FOUND NO INFORMATION FOR THIS AADHAR NUMBER.');
            }
        } catch (error) {
            if (error.message.includes('429')) {
                showError('BATCOMPUTER OVERLOADED. PLEASE WAIT A MINUTE BEFORE TRYING AGAIN.');
            } else {
                showError(`ERROR: ${error.message}`);
            }
        } finally {
            hideLoading();
        }
    });

    // Social Media Search functionality
    document.getElementById('social-search-btn').addEventListener('click', async function() {
        const query = document.getElementById('social-input').value.trim();
        
        if (!query) {
            showError('Please enter a username or person name.');
            return;
        }
        
        showLoading();
        
        try {
            // Define social networks to search
            const socialNetworks = "facebook,tiktok,instagram,snapchat,twitter,youtube,linkedin,github,pinterest";
            
            const options = {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': API_KEYS.SOCIAL_LINKS_API_KEY,
                    'x-rapidapi-host': 'social-links-search.p.rapidapi.com'
                }
            };
            
            const apiUrl = `${API_ENDPOINTS.SOCIAL_LINKS}?query=${encodeURIComponent(query)}&social_networks=${socialNetworks}`;
            const data = await fetchData(apiUrl, options);
            
            if (data.status === 'OK' && data.data) {
                const resultData = data.data;
                let profilesFound = false;
                let resultsHtml = `<div class="success-message">BATCOMPUTER SOCIAL MEDIA SCAN FOR '${query}'</div>`;
                
                // Process each social network
                for (const [network, links] of Object.entries(resultData)) {
                    if (links && links.length > 0) {
                        profilesFound = true;
                        resultsHtml += `
                            <div class="result-card">
                                <h3>${network.toUpperCase()} PROFILES</h3>
                                <ul>
                        `;
                        
                        links.forEach(link => {
                            resultsHtml += `<li><a href="${link}" target="_blank">${link}</a></li>`;
                        });
                        
                        resultsHtml += `
                                </ul>
                            </div>
                        `;
                    }
                }
                
                if (profilesFound) {
                    showResults(resultsHtml);
                } else {
                    showError(`BATCOMPUTER FOUND NO SOCIAL MEDIA PROFILES FOR '${query}'.`);
                }
            } else {
                const errorMsg = data.message || 'Unknown error occurred';
                showError(`BATCOMPUTER ERROR: ${errorMsg}`);
            }
        } catch (error) {
            showError(`ERROR: ${error.message}`);
        } finally {
            hideLoading();
        }
    });

    // Age Check functionality
    document.getElementById('age-search-btn').addEventListener('click', async function() {
        const aadharNumber = document.getElementById('age-input').value.trim();
        
        if (!isValidAadhar(aadharNumber)) {
            showError('Please enter a valid 12-digit Aadhar number.');
            return;
        }
        
        showLoading();
        
        try {
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEYS.AADHAAR_API_KEY}`
                },
                body: JSON.stringify({
                    id_number: aadharNumber
                })
            };
            
            const data = await fetchData(API_ENDPOINTS.AADHAAR_AGE, options);
            
            if (data.data && data.data.age_range) {
                const ageRange = data.data.age_range;
                const resultsHtml = `
                    <div class="success-message">
                        <h3>🔍 AGE ANALYSIS COMPLETE</h3>
                        <p><strong>Aadhaar Number:</strong> ${aadharNumber}</p>
                        <p><strong>Age Range:</strong> ${ageRange}</p>
                    </div>
                `;
                showResults(resultsHtml);
            } else {
                const errorMsg = data.message || 'Unknown error occurred';
                showError(`BATCOMPUTER ERROR: Could not retrieve age range: ${errorMsg}`);
            }
        } catch (error) {
            showError(`ERROR: ${error.message}`);
        } finally {
            hideLoading();
        }
    });

    // PAN Details functionality
    document.getElementById('pan-search-btn').addEventListener('click', async function() {
        const aadharNumber = document.getElementById('pan-aadhar-input').value.trim();
        const apiKey = document.getElementById('pan-api-key').value.trim();
        
        if (!isValidAadhar(aadharNumber)) {
            showError('Please enter a valid 12-digit Aadhar number.');
            return;
        }
        
        if (!apiKey) {
            showError('Please enter your Special Key for the Aadhaar to PAN API.');
            return;
        }
        
        showLoading();
        
        try {
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-rapidapi-key': apiKey
                },
                body: JSON.stringify({
                    aadhaar_no: aadharNumber
                })
            };
            
            const data = await fetchData(API_ENDPOINTS.AADHAAR_TO_PAN, options);
            
            if (data.status === 'success') {
                const panNumber = data.result.pan;
                const aadhaarLinkStatus = data.result.aadhaar_link_status;
                const statusText = aadhaarLinkStatus === 'Y' ? 'Linked' : 'Not Linked';
                
                const resultsHtml = `
                    <div class="success-message">
                        <h3>🔍 PAN DETAILS RETRIEVED</h3>
                        <p><strong>Aadhaar Number:</strong> ${aadharNumber}</p>
                        <p><strong>PAN Number:</strong> <span class="copyable" onclick="copyToClipboard(this)">${panNumber}</span></p>
                        <p><strong>Link Status:</strong> ${statusText}</p>
                    </div>
                `;
                showResults(resultsHtml);
            } else {
                const errorMsg = data.message || 'Unknown error occurred';
                
                // Check if the error is related to quota exceeded
                if (errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('exceeded')) {
                    showError('SPECIAL KEY EXPIRED💀');
                } else {
                    showError(`BATCOMPUTER ERROR: Could not retrieve PAN information: ${errorMsg}`);
                }
            }
        } catch (error) {
            const errorStr = error.message;
            
            // Check if the error is related to quota exceeded
            if (errorStr.toLowerCase().includes('quota') || errorStr.toLowerCase().includes('exceeded')) {
                showError('SPECIAL KEY EXPIRED💀');
            } else {
                showError(`ERROR: ${errorStr}`);
            }
        } finally {
            hideLoading();
        }
    });

    // RC to Phone Number functionality
    document.getElementById('rc-search-btn').addEventListener('click', async function() {
        const rcNumber = document.getElementById('rc-input').value.trim();
        const apiKey = document.getElementById('rc-api-key').value.trim();
        
        if (!rcNumber) {
            showError('Please enter a valid RC number.');
            return;
        }
        
        if (!apiKey) {
            showError('Please enter your Special Key for the RC to Phone API.');
            return;
        }
        
        showLoading();
        
        try {
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-rapidapi-key': apiKey
                },
                body: JSON.stringify({
                    rcnumber: rcNumber
                })
            };
            
            const data = await fetchData(API_ENDPOINTS.RC_TO_PHONE, options);
            
            if (data.status === 'success' && data.vehicle_info) {
                const vehicleInfo = data.vehicle_info;
                
                const resultsHtml = `
                    <div class="success-message">
                        <h3>🔍 VEHICLE INFORMATION RETRIEVED</h3>
                        <p><strong>RC Number:</strong> ${vehicleInfo.registration_number}</p>
                        <p><strong>Model:</strong> ${vehicleInfo.manufacturer_model}</p>
                    </div>
                    <div class="result-card">
                        <h3>OWNER DETAILS</h3>
                        <p><strong>👤 Name:</strong> ${vehicleInfo.owner_name}</p>
                        <p><strong>📱 Mobile:</strong> <span class="copyable" onclick="copyToClipboard(this)">${vehicleInfo.owner_mobile_no}</span></p>
                        <p><strong>🏠 Permanent Address:</strong> <span class="copyable" onclick="copyToClipboard(this)">${vehicleInfo.permanent_address}</span></p>
                        <p><strong>📍 Current Address:</strong> <span class="copyable" onclick="copyToClipboard(this)">${vehicleInfo.current_address}</span></p>
                    </div>
                    <div class="result-card">
                        <h3>VEHICLE DETAILS</h3>
                        <p><strong>🚗 Manufacturer:</strong> ${vehicleInfo.manufacturer}</p>
                        <p><strong>🎨 Color:</strong> ${vehicleInfo.color}</p>
                        <p><strong>⛽ Fuel Type:</strong> ${vehicleInfo.fuel_type}</p>
                        <p><strong>📅 Registration Date:</strong> ${vehicleInfo.registration_date}</p>
                        <p><strong>🔒 Insurance Valid Until:</strong> ${vehicleInfo.insurance_validity}</p>
                        <p><strong>🔍 Fitness Valid Until:</strong> ${vehicleInfo.fitness_upto}</p>
                        <p><strong>🚘 Vehicle Class:</strong> ${vehicleInfo.vehicle_class}</p>
                        <p><strong>🔢 Engine Number:</strong> <span class="copyable" onclick="copyToClipboard(this)">${vehicleInfo.engine_number}</span></p>
                        <p><strong>🔢 Chassis Number:</strong> <span class="copyable" onclick="copyToClipboard(this)">${vehicleInfo.chassis_number}</span></p>
                    </div>
                `;
                
                showResults(resultsHtml);
            } else {
                const errorMsg = data.message || 'Unknown error occurred';
                showError(`BATCOMPUTER ERROR: Could not retrieve vehicle information: ${errorMsg}`);
            }
        } catch (error) {
            const errorStr = error.message;
            
            // Check if the error is related to quota exceeded
            if (errorStr.toLowerCase().includes('quota') || errorStr.toLowerCase().includes('exceeded')) {
                showError('SPECIAL KEY EXPIRED💀');
            } else {
                showError(`ERROR: ${errorStr}`);
            }
        } finally {
            hideLoading();
        }
    });

    // Voter Card Details functionality
    document.getElementById('voter-search-btn').addEventListener('click', async function() {
        const voterNumber = document.getElementById('voter-input').value.trim();
        const apiKey = document.getElementById('voter-api-key').value.trim();
        
        if (!voterNumber) {
            showError('Please enter a valid Voter ID number.');
            return;
        }
        
        if (!apiKey) {
            showError('Please enter your Special Key for the Voter Card API.');
            return;
        }
        
        showLoading();
        
        try {
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-rapidapi-key': apiKey
                },
                body: JSON.stringify({
                    voternumber: voterNumber
                })
            };
            
            const data = await fetchData(API_ENDPOINTS.VOTER_DETAILS, options);
            
            if (data.status === 'success' && data.voter_info) {
                const voterInfo = data.voter_info;
                
                const resultsHtml = `
                    <div class="success-message">
                        <h3>🔍 VOTER INFORMATION RETRIEVED</h3>
                        <p><strong>EPIC Number:</strong> ${voterInfo.epic_number}</p>
                        <p><strong>Name:</strong> ${voterInfo.name}</p>
                    </div>
                    <div class="result-card">
                        <h3>VOTER DETAILS</h3>
                        <p><strong>👤 Name:</strong> ${voterInfo.name}</p>
                        <p><strong>👨‍👦 Relative Name:</strong> ${voterInfo.relative_name} (${voterInfo.relative_type})</p>
                        <p><strong>🎂 Age:</strong> ${voterInfo.age}</p>
                        <p><strong>⚧️ Gender:</strong> ${voterInfo.gender}</p>
                    </div>
                    <div class="result-card">
                        <h3>CONSTITUENCY DETAILS</h3>
                        <p><strong>🏛️ State:</strong> ${voterInfo.state}</p>
                        <p><strong>🏙️ District:</strong> ${voterInfo.district}</p>
                        <p><strong>🗳️ Assembly:</strong> ${voterInfo.assembly}</p>
                        <p><strong>🏛️ Parliamentary:</strong> ${voterInfo.parliamentary}</p>
                        <p><strong>🔢 Part Number:</strong> ${voterInfo.part_number}</p>
                        <p><strong>📝 Part Name:</strong> ${voterInfo.part_name}</p>
                    </div>
                    <div class="result-card">
                        <h3>POLLING STATION DETAILS</h3>
                        <p><strong>🏫 Polling Station:</strong> ${voterInfo.polling_station}</p>
                        <p><strong>📍 Address:</strong> <span class="copyable" onclick="copyToClipboard(this)">${voterInfo.polling_address}</span></p>
                        <p><strong>🚪 Room Details:</strong> ${voterInfo.room_details}</p>
                    </div>
                `;
                
                showResults(resultsHtml);
            } else {
                const errorMsg = data.message || 'Unknown error occurred';
                showError(`BATCOMPUTER ERROR: Could not retrieve voter information: ${errorMsg}`);
            }
        } catch (error) {
            const errorStr = error.message;
            
            // Check if the error is related to quota exceeded
            if (errorStr.toLowerCase().includes('quota') || errorStr.toLowerCase().includes('exceeded')) {
                showError('SPECIAL KEY EXPIRED💀');
            } else {
                showError(`ERROR: ${errorStr}`);
            }
        } finally {
            hideLoading();
        }
    });

    // Password Leak Checker functionality
    document.getElementById('password-leak-btn').addEventListener('click', async function() {
        const email = document.getElementById('password-leak-input').value.trim();
        
        if (!email || !isValidEmail(email)) {
            showError('Please enter a valid email address.');
            return;
        }
        
        // No longer need API key with the new endpoint
        
        showLoading();
        
        try {
            const data = await fetchData(`${API_ENDPOINTS.PASSWORD_LEAK}?email=${encodeURIComponent(email)}`);
            console.log('Password leak check - results received:', {
                status: data.status,
                found: data.found,
                hasResults: !!(data.results && data.results.length)
            });
            
            if (data.status === 'success') {
                let resultsHtml = `
                    <div class="success-message">
                        <h3>🔍 PASSWORD LEAK CHECK RESULTS</h3>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Breaches Found:</strong> ${data.found}</p>
                    </div>
                `;
                
                if (data.found > 0 && data.results && data.results.length > 0) {
                    data.results.forEach((leak, index) => {
                        resultsHtml += `
                            <div class="result-card">
                                <h3>BREACH #${index + 1}</h3>
                                <p><strong>📧 Email:</strong> ${leak.email}</p>
                                <p><strong>🔍 Source:</strong> ${leak.sources}</p>
                                ${leak.breach_date ? `<p><strong>📅 Date:</strong> ${leak.breach_date}</p>` : ''}
                                ${leak.description ? `<p><strong>📝 Description:</strong> ${leak.description}</p>` : ''}
                                ${leak.data_classes ? `<p><strong>🔒 Exposed Data:</strong> ${leak.data_classes}</p>` : ''}
                            </div>
                        `;
                    });
                    
                    resultsHtml += `
                        <div class="warning-message" style="background-color: rgba(198, 40, 40, 0.2); color: #ef9a9a;">
                            <h3>⚠️ SECURITY ALERT</h3>
                            <p>Your email was found in data breaches. Consider changing your passwords immediately.</p>
                            <p>Use unique passwords for each account and enable two-factor authentication where possible.</p>
                        </div>
                    `;
                } else {
                    resultsHtml += `
                        <div class="success-message" style="background-color: rgba(46, 125, 50, 0.2); color: #81c784;">
                            <h3>✅ GOOD NEWS</h3>
                            <p>No significant data breaches were found for this email address.</p>
                            <p>Continue to practice good security habits to keep your accounts safe:</p>
                            <ul>
                                <li>Use unique passwords for each service</li>
                                <li>Enable two-factor authentication when available</li>                                
                            </ul>
                        </div>
                    `;
                }
                
                showResults(resultsHtml);
            } else {
                const errorMsg = data.message || 'Unknown error occurred';
                showError(`BATCOMPUTER ERROR: Could not check for password leaks: ${errorMsg}`);
            }
        } catch (error) {
            const errorStr = error.message;
            showError(`ERROR: ${errorStr}`);
        } finally {
            hideLoading();
        }
    });

    // Helper function to validate email
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Function to copy text to clipboard
    window.copyToClipboard = function(element) {
        const text = element.textContent;
        navigator.clipboard.writeText(text).then(() => {
            // Visual feedback for copy
            const originalBackground = element.style.backgroundColor;
            element.style.backgroundColor = '#ffcc00';
            element.style.color = '#0a0e14';
            
            setTimeout(() => {
                element.style.backgroundColor = originalBackground;
                element.style.color = '';
            }, 500);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    };

    // Input validation for mobile number (only digits)
    document.getElementById('mobile-input').addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    });

    // Input validation for aadhar number (only digits)
    document.getElementById('aadhar-input').addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    });

    document.getElementById('age-input').addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    });

    document.getElementById('pan-aadhar-input').addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    });

    // Input validation for RC number (alphanumeric)
    document.getElementById('rc-input').addEventListener('input', function() {
        this.value = this.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    });

    // Input validation for Voter ID (alphanumeric)
    document.getElementById('voter-input').addEventListener('input', function() {
        this.value = this.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    });
    
    // Back to Top button functionality
    const backToTopButton = document.getElementById('backToTopBtn');
    
    // Show/hide button based on scroll position
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            backToTopButton.classList.add('visible');
        } else {
            backToTopButton.classList.remove('visible');
        }
    });
    
    // Scroll to top when button is clicked
    backToTopButton.addEventListener('click', function() {
        // Smooth scroll to top
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Add copy results button functionality
    if (copyButton) {
        copyButton.addEventListener('click', function() {
            if (!resultsContainer || !resultsContainer.textContent.trim()) {
                return;
            }
            
            // Extract all text content from the results
            let textToCopy = '';
            
            // Get all result cards or content
            const resultCards = resultsContainer.querySelectorAll('.result-card');
            
            if (resultCards.length > 0) {
                resultCards.forEach(card => {
                    // Get all text content from the card, excluding buttons
                    const cardText = Array.from(card.childNodes)
                        .filter(node => node.nodeType === Node.TEXT_NODE || 
                                (node.nodeType === Node.ELEMENT_NODE && 
                                 !node.classList.contains('copy-btn')))
                        .map(node => node.textContent)
                        .join('\n')
                        .trim();
                    
                    textToCopy += cardText + '\n\n';
                });
            } else {
                // If no result cards, get all text content
                textToCopy = resultsContainer.textContent.trim();
            }
            
            // Copy the text to clipboard
            navigator.clipboard.writeText(textToCopy)
                .then(() => {
                    showCopyMessage('Results copied!', true);
                })
                .catch(err => {
                    showCopyMessage('Failed to copy results!', false);
                    console.error('Failed to copy: ', err);
                });
        });
    }
    
    // Function to show a temporary message after copying
    function showCopyMessage(message, isSuccess) {
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.textContent = message;
        messageEl.style.position = 'fixed';
        messageEl.style.bottom = '20px';
        messageEl.style.right = '20px';
        messageEl.style.padding = '10px 20px';
        messageEl.style.borderRadius = '5px';
        messageEl.style.zIndex = '9999';
        messageEl.style.fontWeight = 'bold';
        
        if (isSuccess) {
            messageEl.style.backgroundColor = 'var(--success-color)';
            messageEl.style.color = 'white';
        } else {
            messageEl.style.backgroundColor = 'var(--danger-color)';
            messageEl.style.color = 'white';
        }
        
        // Add to document
        document.body.appendChild(messageEl);
        
        // Remove after 2 seconds
        setTimeout(() => {
            document.body.removeChild(messageEl);
        }, 2000);
    }
}); 