# MCP QL3 Service

A TypeScript-based service with GitHub and Redis integration.

## Prerequisites

- Node.js >= 18.0.0
- Redis server
- GitHub API credentials

## Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
GITHUB_TOKEN=your_github_token
REDIS_URL=your_redis_url
PORT=3000
```

4. Run the development server:
```bash
npm run dev
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the project
- `npm start` - Start the production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests

## Project Structure

```
/
├── README.md
├── package.json
├── tsconfig.json
├── vercel.json
├── api/
│   └── server.ts
├── src/
│   ├── config/
│   │   └── environment.ts
│   ├── services/
│   │   ├── github/
│   │   │   ├── index.ts
│   │   │   ├── tools.ts
│   │   │   └── types.ts
│   │   └── redis/
│   │       └── client.ts
│   ├── utils/
│   │   ├── http.ts
│   │   └── logging.ts
│   └── mcp/
│       ├── api-handler.ts
│       ├── server.ts
│       └── transport.ts
├── public/
│   └── index.html
└── tests/
├── unit/
│   └── github.test.ts
└── integration/
└── tools.test.ts
```

## License

ISC
