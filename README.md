# Rural Classroom Client

## Backend Setup

To use this project, you need to set up the backend and machine learning backend either locally or in a production environment. The repositories for these are:

- [Rural Classroom Server](https://github.com/shaukatalidev/rural_classroom_server.git)
- [BTP ML Backend](https://github.com/shaukatalidev/btp-ml-backend.git)

After setting up the backends, update the `endpoints.js` file in this project to configure the base URLs. Replace the following variables with the appropriate URLs for your setup:

```javascript
export const BASE = "http://localhost:5000";
export const BASEML = "http://localhost:8000";
```

Ensure the URLs point to your backend and ML backend instances.
This is a React.js project designed to provide a user-friendly interface for managing and interacting with rural classroom resources.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager

## Installation

1. Clone the repository:

```bash
git clone https://github.com/shaukatalidev/rural_classroom_client.git
```

2. Navigate to the project directory:

```bash
cd rural_classroom_client
```

3. Install dependencies:

```bash
npm install
# or
yarn install
```

## Usage

1. Start the development server:

```bash
npm start
# or
yarn start
```

2. Open your browser and navigate to `http://localhost:3000`.

## Scripts

- `npm start`: Runs the app in development mode.
- `npm run build`: Builds the app for production.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.
