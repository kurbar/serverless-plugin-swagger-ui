import { Credentials, CredentialsOptions } from 'aws-sdk/lib/credentials';
declare const EXPORT_TYPES: readonly ['oas30', 'swagger'];
declare const ACCEPTS: readonly ['application/json', 'application/yaml'];
declare const EXTENSIONS: readonly [
  'integrations',
  'apigateway',
  'authorizers'
];
declare type ExportType = typeof EXPORT_TYPES[number];
declare type Accepts = typeof ACCEPTS[number];
declare type Extensions = typeof EXTENSIONS[number];
declare type SwaggerUiConfig = {
  [key: string]: unknown;
};
declare type ValidatedConfig = {
  s3Bucket?: string;
  exportType: ExportType;
  accepts: Accepts;
  extensions: Extensions;
  swaggerUiDirectoryName: string;
  swaggerUiConfig?: SwaggerUiConfig;
};
declare type RawConfig = Partial<ValidatedConfig>;
export declare type ServerlessSwaggerUiConfig = RawConfig;
declare type Serverless = {
  getProvider: (providerName: string) => {
    getCredentials: () => {
      credentials?: Credentials | CredentialsOptions;
    };
    naming: {
      getStackName: () => string;
    };
    getRegion: () => string;
    getStage: () => string;
  };
  service: {
    custom?: {
      swaggerUi?: ValidatedConfig;
    };
  };
  config: {
    servicePath: string;
  };
  cli: {
    log: (
      message: string,
      entity?: string,
      opts?: {
        underline?: boolean;
        bold?: boolean;
        color?: string;
      }
    ) => void;
  };
};
export declare class ServerlessSwaggerUi {
  private serverless;
  private credentials?;
  private stackName;
  private region;
  private stage;
  constructor(serverless: Serverless);
  private validateConfig;
  private copySwaggerUi;
  private copyIndexFile;
  private writeConfigYaml;
  private writeDocumentationFile;
  private resolveApiGatewayId;
  private getDocumentation;
  private uploadToS3;
  swaggerUi: () => Promise<void>;
  commands: {
    swaggerUi: {
      usage: string;
      lifecycleEvents: string[];
    };
  };
  hooks: {
    'after:deploy:deploy': () => Promise<void>;
    'swaggerUi:swaggerUi': () => Promise<void>;
  };
}
export {};
