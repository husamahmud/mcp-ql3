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
