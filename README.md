# NumInfo - Information Search Tool

This is a web-based version of the NumInfo Telegram bot, providing various information search capabilities through a clean and modern interface.

## Features

- **Mobile Number Search**: Find information associated with a 10-digit mobile number
- **Aadhar Number Search**: Find information associated with a 12-digit Aadhar number
- **Social Media Search**: Find social media profiles by username or person name
- **Email Breach Check**: Check if an email address has been involved in data breaches
- **Age Check**: Get age range information from an Aadhar number
- **PAN Details**: Get PAN card details using an Aadhar number (requires special API key)

## Setup Instructions

### Method 1: Using Node.js Server (Recommended)

This method solves CORS issues by using a proxy server:

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the server:
   ```
   npm start
   ```
4. Open your browser and navigate to `http://localhost:3000`

For development with auto-restart:
```
npm run dev
```

### Method 2: Direct Browser Opening (Not Recommended)

This method may encounter CORS issues with API calls:

1. Clone this repository
2. Open `index.html` directly in a web browser

## API Requirements

Some features require API keys:

- PAN Details: Requires a special API key which you can get by contacting @icodeinbinary
- The default API keys included are for demonstration purposes and may not work

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)
- Node.js & Express (for proxy server)
- Various APIs for data retrieval

## Security Notice

This tool is for educational purposes only. Use responsibly and legally. The developer is not responsible for any misuse of this tool.

## Troubleshooting

### CORS Issues
If you encounter CORS errors like:
```
Access to fetch at '[API URL]' from origin 'http://localhost:5500' has been blocked by CORS policy
```

Use the Node.js server method (Method 1) which includes a proxy server to handle CORS issues.

## Developer

Created by @icodeinbinary

## License

This project is for personal use only and not licensed for redistribution. 