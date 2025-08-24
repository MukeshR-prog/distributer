# 🚀 Distribution Management System

A comprehensive **MERN Stack** application for intelligent task distribution and management among agents with real-time tracking, analytics, and automated workflows.

![Project Banner](https://img.shields.io/badge/MERN-Stack-blue) ![Version](https://img.shields.io/badge/Version-1.0.0-green) ![License](https://img.shields.io/badge/License-MIT-yellow)

## 🌟 Project Overview

The **Distribution Management System** is a powerful web application designed to streamline the process of distributing tasks, leads, or data records among multiple agents. Built with modern technologies, it provides real-time tracking, comprehensive analytics, and intelligent distribution algorithms.

### 🎯 Purpose
- **Automate** the distribution of records among agents
- **Track** progress and performance in real-time
- **Analyze** completion rates and agent productivity
- **Manage** agent accounts and permissions efficiently
- **Provide** comprehensive reporting and insights

## ✨ Key Features

### 🔐 Advanced Authentication System
- **Dual Login System**: Separate admin and agent authentication
- **JWT Security**: Token-based authentication with secure sessions
- **Role-Based Access**: Granular permissions for different user types
- **Password Security**: Bcrypt hashing with salt rounds (12)
- **Raw Password Storage**: Optional plain text storage for reference
- **Session Management**: Automatic token expiry and refresh

### 👥 Comprehensive User Management
- **Admin Dashboard**: Complete control over system operations
- **Agent Self-Registration**: Streamlined onboarding process
- **Global Country Support**: 195+ country codes with flags
- **Phone Number Validation**: International format support
- **Profile Management**: Detailed user profiles with status tracking
- **Active/Inactive Status**: User account management

### 📂 Intelligent File Processing
- **Multi-Format Support**: CSV, XLSX, XLS file uploads
- **Real-Time Validation**: Format checking and error reporting
- **Required Fields**: FirstName, Phone, Notes columns
- **File Size Tracking**: Complete metadata storage
- **Progress Indicators**: Real-time upload progress
- **Error Handling**: Comprehensive error messages

### 🎯 Smart Distribution Algorithm
- **Equal Distribution**: Automatic even distribution among all active agents
- **Sequential Assignment**: Intelligent remainder handling
- **Agent Availability**: Only active agents receive assignments
- **Flexible Agent Count**: Works with any number of agents (1 to unlimited)
- **Load Balancing**: Ensures fair distribution of workload

### 📊 Real-Time Dashboard Analytics
- **Live Statistics**: Real-time system metrics
- **Progress Tracking**: Visual progress bars and charts
- **Agent Performance**: Individual completion rates and statistics
- **Recent Activity**: Timeline of system activities
- **Distribution Overview**: Comprehensive view of all distributions
- **Status Breakdown**: Pending, In-Progress, Completed, Failed records

### 📋 Advanced Task Management
- **Status Workflow**: Pending → In-Progress → Completed/Failed
- **Real-Time Updates**: Instant status synchronization
- **Notes Management**: Additional context for each record
- **Assignment Tracking**: Complete audit trail
- **Completion Metrics**: Percentage-based progress tracking
- **Cross-Distribution View**: Agent's records from all distributions

### 📈 Comprehensive Reporting
- **Distribution History**: Complete audit trail of all uploads
- **Agent Performance Metrics**: Detailed productivity analytics
- **System Statistics**: Overall completion rates and trends
- **Visual Charts**: Interactive progress indicators
- **Export Capabilities**: Data export functionality
- **Time-Based Analytics**: Activity tracking over time

### 🔄 Real-Time Features
- **Live Status Updates**: Instant record status changes
- **Dynamic Statistics**: Auto-updating dashboard metrics
- **Progress Synchronization**: Real-time progress reflection
- **Activity Feeds**: Live activity streams
- **Notification System**: Success/error message handling

## 🛠️ Technology Stack

### 🔧 Backend Technologies
```javascript
{
  "runtime": "Node.js v18+",
  "framework": "Express.js v4.18+",
  "database": "MongoDB with Mongoose ODM",
  "authentication": "JWT (JSON Web Tokens)",
  "security": "Bcrypt password hashing",
  "fileUpload": "Multer middleware",
  "fileProcessing": ["CSV-Parser", "XLSX"],
  "middleware": ["CORS", "Morgan", "Helmet"],
  "validation": "Express-validator",
  "rateLimiting": "Express-rate-limit"
}
```
### 🎨 Frontend Technologies
```javascript
{
  "framework": "Next.js v15.5.0",
  "library": "React v19",
  "routing": "App Router (Next.js 13+)",
  "styling": "Tailwind CSS v3",
  "httpClient": "Axios",
  "storage": "localStorage",
  "icons": "Heroicons (SVG)",
  "responsive": "Mobile-first design"
}
```

### 🗄️ Database & Storage
```javascript
{
  "database": "MongoDB",
  "ODM": "Mongoose v7+",
  "storage": "Local file system (uploads)",
  "indexing": "MongoDB indexes for performance",
  "relationships": "Population for references"
}
```

## 📁 Project Structure
```plaintext
distributer/
├── 📁 backend/
│   ├── 📁 config/
│   │   └── 📄 database.js              # MongoDB connection configuration
│   ├── 📁 controllers/
│   │   ├── 📄 authController.js        # Authentication logic
│   │   ├── 📄 agentControllerNew.js    # Agent management operations
│   │   └── 📄 distributionControllerNew.js # Distribution & file handling
│   ├── 📁 middleware/
│   │   ├── 📄 auth.js                  # JWT authentication middleware
│   │   ├── 📄 errorHandler.js          # Global error handling
│   │   └── 📄 rateLimiter.js           # API rate limiting
│   ├── 📁 models/
│   │   ├── 📄 User.js                  # User schema (Admin/Agent)
│   │   ├── 📄 Agent.js                 # Agent-specific schema
│   │   └── 📄 Distribution.js          # Distribution & records schema
│   ├── 📁 routes/
│   │   ├── 📄 auth.js                  # Authentication routes
│   │   ├── 📄 agentsNew.js             # Agent management routes
│   │   └── 📄 distributionsNew.js      # Distribution routes
│   ├── 📁 utils/
│   │   ├── 📄 jwt.js                   # JWT token utilities
│   │   └── 📄 upload.js                # File upload configuration
│   ├── 📁 uploads/                     # Temporary file storage
│   ├── 📄 package.json                 # Backend dependencies
│   └── 📄 server.js                    # Express server entry point
│
├── 📁 client/
│   ├── 📁 src/
│   │   ├── 📁 app/
│   │   │   ├── 📁 admin/
│   │   │   │   ├── 📁 dashboard/
│   │   │   │   │   └── 📄 page.js      # Admin dashboard with analytics
│   │   │   │   ├── 📁 distributions/
│   │   │   │   │   └── 📁 [id]/
│   │   │   │   │       └── 📄 page.js  # Distribution detail view
│   │   │   │   └── 📁 login/
│   │   │   │       └── 📄 page.js      # Admin login interface
│   │   │   ├── 📁 agent/
│   │   │   │   ├── 📁 dashboard/
│   │   │   │   │   └── 📄 page.js      # Agent task dashboard
│   │   │   │   └── 📁 login/
│   │   │   │       └── 📄 page.js      # Agent login/register
│   │   │   ├── 📄 favicon.ico          # App favicon
│   │   │   ├── 📄 globals.css          # Global styles & custom CSS
│   │   │   ├── 📄 layout.js            # Root layout component
│   │   │   └── 📄 page.js              # Landing page
│   │   └── 📁 utils/
│   │       └── 📄 countryCodes.js      # Country codes database
│   ├── 📁 public/                      # Static assets
│   ├── 📄 package.json                 # Frontend dependencies
│   ├── 📄 next.config.mjs              # Next.js configuration
│   ├── 📄 tailwind.config.mjs          # Tailwind CSS config
│   └── 📄 postcss.config.mjs           # PostCSS configuration
│
└── 📄 README.md                        # Project documentation

```
## 🚀 Getting Started
### Prerequisites
- Node.js v18+
- MongoDB instance (local or cloud)
- npm or yarn package manager

### Installation
1. Clone the repository:
   ```bash
   git clone 
    cd distributer
    ```
2. Setup Backend:
    ```bash
    cd backend
    npm install

    # Install specific packages
    npm install express mongoose bcryptjs jsonwebtoken
    npm install multer csv-parser xlsx cors morgan helmet
    npm install express-validator express-rate-limit
    npm install express-async-handler dotenv
    ```
3. Install Frontend Dependencies
    ```bash
    cd ../client
    npm install
    cd ../client
    npm install

    # Install specific packages
    npm install next react react-dom
    npm install tailwindcss postcss autoprefixer
    npm install axios
    ```
4. Configure Environment Variables:
```
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGO_URI=mongodb://localhost:27017/distributer_db

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_here_minimum_32_characters
JWT_EXPIRE=30d

# File Upload Configuration
MAX_FILE_SIZE=10485760  # 10MB in bytes
UPLOAD_PATH=./uploads

# Rate Limiting
API_RATE_LIMIT=100      # requests per window
RATE_WINDOW_MS=900000   # 15 minutes
```
5. Database Setup
```bash
# Ensure MongoDB is running
mongod

# Create admin user (run this once)
cd backend
node -e "
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/distributer_db');

const createAdmin = async () => {
  const hashedPassword = await bcrypt.hash('Password123', 12);
  await User.create({
    name: 'System Administrator',
    email: 'admin@example.com',
    password: hashedPassword,
    rawPassword: 'Password123',
    countryCode: '+1',
    phone: '1234567890',
    role: 'admin'
  });
  console.log('Admin created successfully');
  process.exit(0);
};

createAdmin();
"
```
6. Start the Application
Terminal 1 (Backend):
```bash
cd backend
npm run dev
```
Terminal 2 (Frontend):
```bash
cd client
npm run dev
```
### 💻 Usage Guide
## 👨‍💼 For Administrators
1. Dashboard Overview
System Statistics: Total distributions, records, agents
Progress Tracking: Visual completion rates
Agent Performance: Individual agent metrics
Recent Activity: Timeline of system events
2. Agent Management
```javascript
{
  name: "John Doe",
  email: "john@example.com",
  countryCode: "+1",
  phone: "1234567890",
  password: "SecurePassword123"
}
```
3. File Upload & Distribution
- Supported Formats: CSV, XLSX, XLS
// Required CSV Format
FirstName,Phone,Notes
Alice,5551234567,Follow up on project
Bob,5559876543,New lead from website
Carol,5555555555,Interested in services
Upload Process:

Select CSV/Excel file
Validate format automatically
Distribute among active agents
Monitor progress in real-time

4. Analytics & Reporting
View distribution history
Export agent performance data
Monitor completion rates
Track system usage metrics
## 👨‍💼 For Agents
1. Registration Process
```java
// Self-Registration Form
{
  name: "Agent Name",
  email: "agent@example.com",
  countryCode: "+91",  // Select from 195+ countries
  phone: "9876543210",
  password: "MyPassword123"
}
```
2. Dashboard Features
Assigned Records: View all tasks across distributions
Status Management: Update record progress
Search & Filter: Find specific records
Progress Tracking: Personal completion statistics
3. Record Management
// Status Workflow
"pending" → "in-progress" → "completed" | "failed"

// Record Actions
- Update status
- Add notes
- Track completion time
- View assignment details

### 🔧 API Documentation
🔐 Authentication Endpoints
```java
// User Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

// Agent Registration
POST /api/auth/register
{
  "name": "Agent Name",
  "email": "agent@example.com",
  "countryCode": "+1",
  "phone": "1234567890",
  "password": "password123",
  "role": "agent"
}
```
👥 Agent Management
// Get All Agents (Admin Only)
GET /api/agents
Authorization: Bearer <jwt_token>

// Create Agent (Admin Only)
POST /api/agents
Authorization: Bearer <jwt_token>

// Delete Agent (Admin Only)
DELETE /api/agents/:id
Authorization: Bearer <jwt_token>

## 📊 Distribution Management
```plaintext
// Upload & Distribute File (Admin Only)
POST /api/distributions/upload
Content-Type: multipart/form-data
Authorization: Bearer <jwt_token>
{
  "file": <csv/excel_file>,
  "strategy": "equal"
}

// Get All Distributions
GET /api/distributions?page=1&limit=10
Authorization: Bearer <jwt_token>

// Get Agent's Records (Agent Only)
GET /api/distributions/my-records
Authorization: Bearer <jwt_token>

// Update Record Status (Agent Only)
PATCH /api/distributions/records/:recordId/status
Authorization: Bearer <jwt_token>
{
  "status": "completed"
}

// Get System Statistics (Admin Only)
GET /api/distributions/stats
Authorization: Bearer <jwt_token>
```

📈 Response Formats
```javascript
// Success Response
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation completed successfully"
}

// Error Response
{
  "success": false,
  "message": "Error description",
  "errors": [ /* validation errors */ ]
}

// Pagination Response
{
  "success": true,
  "data": {
    "distributions": [ /* array of items */ ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "pages": 5
    }
  }
}
```
### 🔒 Security Features
## 🛡️ Authentication Security
```java
// JWT Configuration
{
  "algorithm": "HS256",
  "expiresIn": "30d",
  "issuer": "distributer-app",
  "audience": "distributer-users"
}

// Password Security
{
  "algorithm": "bcrypt",
  "saltRounds": 12,
  "minLength": 8,
  "requirements": ["lowercase", "uppercase", "number"]
}
```
## 🔐 API Security
Rate Limiting: 100 requests per 15 minutes
CORS Protection: Configured allowed origins
Helmet Middleware: Security headers
Input Validation: Comprehensive validation
SQL Injection Prevention: NoSQL injection protection
## 🔒 Data Protection
Encrypted Storage: Hashed passwords
Secure Headers: Security-focused HTTP headers
File Upload Security: Type and size validation
Error Handling: No sensitive data exposure

### 📊 Database Schema
## 👤 User Model
```javascript
{
  _id: ObjectId,
  name: String (required),
  email: String (required, unique),
  password: String (required),        // Bcrypt hashed
  rawPassword: String (required),     // Plain text reference
  countryCode: String (required),     // e.g., "+1"
  phone: String (required),           // e.g., "1234567890"
  mobile: String (virtual),           // countryCode + phone
  role: String (enum: ['admin', 'agent']),
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```
## 📋 Distribution Model
```javascript
{
  _id: ObjectId,
  fileName: String (required),
  originalFileName: String (required),
  fileSize: Number (required),
  totalRecords: Number (required),
  uploadedBy: ObjectId (ref: 'User'),
  distributionStrategy: String (default: 'equal'),
  status: String (enum: ['processing', 'completed', 'failed']),
  agents: [{
    agentId: ObjectId (ref: 'User'),
    agentName: String (required),
    agentEmail: String (required),
    assignedCount: Number,
    records: [{
      _id: ObjectId,
      firstName: String,
      phone: String,
      notes: String,
      status: String (enum: ['pending', 'in-progress', 'completed', 'failed']),
      assignedAt: Date,
      updatedAt: Date
    }]
  }],
  summary: {
    totalAgentsAssigned: Number,
    averageRecordsPerAgent: Number,
    distributionTime: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```