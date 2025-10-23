declare module 'swagger-jsdoc' {
  export interface Options {
    definition: any;
    apis: string[];
  }
  const swaggerJsdoc: (options: Options) => any;
  export default swaggerJsdoc;
}

