import swaggerJsdoc, { Options } from 'swagger-jsdoc';

const options: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GSDTA API',
      version: '1.0.0',
      description: 'API for GSDTA Web Application',
    },
    servers: [
      {
        url: 'http://localhost:8080/api/v1',
        description: 'Development server',
      },
      {
        url: 'https://www.gsdta.org/api/v1',
        description: 'Production server',
      }
    ],
  },
  apis: ['./src/app/v1/**/*.ts'],
};

export const openapiSpecification = swaggerJsdoc(options);
