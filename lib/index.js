'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
          enumerable: true,
          get: function () {
            return m[k];
          },
        });
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== 'default' && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.ServerlessSwaggerUi = void 0;
const cloudformation_1 = __importDefault(
  require('aws-sdk/clients/cloudformation')
);
const s3_1 = __importDefault(require('aws-sdk/clients/s3'));
const apigateway_1 = __importDefault(require('aws-sdk/clients/apigateway'));
const fs_1 = require('fs');
const path = __importStar(require('path'));
const recursive_copy_1 = __importDefault(require('recursive-copy'));
const js_yaml_1 = __importDefault(require('js-yaml'));
const defaultSwaggerUiConfig_1 = require('./defaultSwaggerUiConfig');
const EXPORT_TYPES = ['oas30', 'swagger'];
const ACCEPTS = ['application/json', 'application/yaml'];
const EXTENSIONS = ['integrations', 'apigateway', 'authorizers'];
class ServerlessSwaggerUi {
  constructor(serverless) {
    this.serverless = serverless;
    this.validateConfig = () => {
      const { service } = this.serverless;
      const config =
        (service && service.custom && service.custom.swaggerUi) || {};
      const { s3Bucket, swaggerUiConfig } = config;
      let { exportType, accepts, extensions, swaggerUiDirectoryName } = config;
      if (!exportType || !EXPORT_TYPES.includes(exportType)) {
        exportType = 'oas30';
      }
      if (!accepts || !ACCEPTS.includes(accepts)) {
        accepts = 'application/yaml';
      }
      if (!extensions || !EXTENSIONS.includes(extensions)) {
        extensions = 'integrations';
      }
      if (!swaggerUiDirectoryName) {
        swaggerUiDirectoryName = '.swagger-ui';
      }
      return {
        exportType,
        accepts,
        extensions,
        s3Bucket,
        swaggerUiDirectoryName,
        swaggerUiConfig,
      };
    };
    this.copySwaggerUi = ({ swaggerUiPath }) =>
      __awaiter(this, void 0, void 0, function* () {
        yield fs_1.promises.rmdir(swaggerUiPath, { recursive: true });
        return yield (0,
        recursive_copy_1.default)(path.dirname(require.resolve('swagger-ui-dist')), swaggerUiPath, {
          filter: ['**/*', '!index.html'],
        });
      });
    this.copyIndexFile = ({ swaggerUiPath }) =>
      __awaiter(this, void 0, void 0, function* () {
        yield (0,
        recursive_copy_1.default)(require.resolve('./index.html'), path.join(swaggerUiPath, 'index.html'));
      });
    this.writeConfigYaml = ({
      swaggerUiPath,
      swaggerUiConfig,
      documentationFileName,
    }) =>
      __awaiter(this, void 0, void 0, function* () {
        const configFileName = 'config.yaml';
        const obj = Object.assign(
          Object.assign(
            Object.assign({}, defaultSwaggerUiConfig_1.defaultSwaggerUiConfig),
            swaggerUiConfig
          ),
          { configUrl: undefined, url: `./${documentationFileName}` }
        );
        delete obj.configUrl;
        yield fs_1.promises.writeFile(
          path.join(swaggerUiPath, configFileName),
          js_yaml_1.default.dump(obj)
        );
      });
    this.writeDocumentationFile = ({
      exportType,
      accepts,
      extensions,
      swaggerUiPath,
      documentationFileName,
    }) =>
      __awaiter(this, void 0, void 0, function* () {
        const apiId = yield this.resolveApiGatewayId();
        const documentationBody = yield this.getDocumentation({
          apiId,
          exportType,
          accepts,
          extensions,
        });
        if (!documentationBody) {
          throw new Error('documentation body is falsy');
        }
        yield fs_1.promises.writeFile(
          path.join(swaggerUiPath, documentationFileName),
          documentationBody.toString()
        );
      });
    this.resolveApiGatewayId = () =>
      __awaiter(this, void 0, void 0, function* () {
        this.serverless.cli.log(
          'Resolving API Gateway ID...',
          'Serverless SwaggerUI'
        );
        const cfn = new cloudformation_1.default({
          credentials: this.credentials,
          region: this.region,
        });
        // throw error if stack does not exist
        const stack = yield cfn
          .describeStacks({
            StackName: this.stackName,
          })
          .promise();
        const stacks = stack.Stacks;
        if (!stacks || stacks.length < 1) {
          throw new Error(`Stack: ${this.stackName} does not have any stacks`);
        }
        const { Outputs } = stacks[0];
        if (!Outputs) {
          throw new Error(`Stack: ${this.stackName} does not have any Outputs`);
        }
        const output = Outputs.find(
          (output) => output.OutputKey === 'HttpApiUrl'
        );
        if (!output) {
          throw new Error(
            `Stack: ${this.stackName} does not have Output: HttpApiUrl`
          );
        }
        const { OutputValue } = output;
        if (!OutputValue) {
          throw new Error(
            `Stack: ${this.stackName} does not have OutputValue: HttpApiUrl`
          );
        }
        const [, apiId] = OutputValue.split('.')[0].split('//');
        return apiId;
      });
    this.getDocumentation = ({ apiId, exportType, accepts, extensions }) =>
      __awaiter(this, void 0, void 0, function* () {
        this.serverless.cli.log(
          'Exporting documentation...',
          'Serverless SwaggerUI'
        );
        const ag = new apigateway_1.default({
          credentials: this.credentials,
          region: this.region,
        });
        const doc = yield ag
          .getExport({
            exportType,
            restApiId: apiId,
            stageName: this.stage,
            accepts,
            parameters: {
              extensions,
            },
          })
          .promise();
        return doc.body;
      });
    this.uploadToS3 = ({ swaggerUiPath, s3Bucket }) =>
      __awaiter(this, void 0, void 0, function* () {
        this.serverless.cli.log(
          'Uploading Swagger UI files to S3...',
          'Serverless SwaggerUI'
        );
        const s3 = new s3_1.default({
          credentials: this.credentials,
          region: this.region,
        });
        const fileNames = yield fs_1.promises.readdir(swaggerUiPath);
        const resolveContentType = (fileName) => {
          const ext = path.extname(fileName);
          switch (ext) {
            case '.css':
              return 'text/css';
            case '.html':
              return 'text/html; charset=utf-8';
            case '.js':
              return 'text/javascript';
            case '.json':
            case '.map':
              return 'application/json';
            case '.png':
              return 'image/png';
            case '.yaml':
              return 'text/yaml';
            default:
              return undefined;
          }
        };
        yield Promise.all(
          fileNames.map((fileName) =>
            __awaiter(this, void 0, void 0, function* () {
              return s3
                .putObject({
                  Bucket: s3Bucket,
                  Key: fileName,
                  Body: yield fs_1.promises.readFile(
                    path.join(swaggerUiPath, fileName)
                  ),
                  ContentType: resolveContentType(fileName),
                })
                .promise();
            })
          )
        );
      });
    this.swaggerUi = () =>
      __awaiter(this, void 0, void 0, function* () {
        const {
          exportType,
          accepts,
          extensions,
          s3Bucket,
          swaggerUiDirectoryName,
          swaggerUiConfig,
        } = this.validateConfig();
        const swaggerUiPath = path.join(
          this.serverless.config.servicePath,
          swaggerUiDirectoryName
        );
        yield this.copySwaggerUi({ swaggerUiPath });
        yield this.copyIndexFile({ swaggerUiPath });
        const documentationFileName = `swagger.${
          accepts === 'application/yaml' ? 'yaml' : 'json'
        }`;
        yield this.writeConfigYaml({
          swaggerUiPath,
          swaggerUiConfig,
          documentationFileName,
        });
        yield this.writeDocumentationFile({
          exportType,
          accepts,
          extensions,
          swaggerUiPath,
          documentationFileName,
        });
        if (s3Bucket) {
          yield this.uploadToS3({ swaggerUiPath, s3Bucket });
        }
      });
    this.commands = {
      swaggerUi: {
        usage: 'Build Swagger UI static site',
        lifecycleEvents: ['swaggerUi'],
      },
    };
    this.hooks = {
      'after:deploy:deploy': this.swaggerUi,
      'swaggerUi:swaggerUi': this.swaggerUi,
    };
    const provider = this.serverless.getProvider('aws');
    this.credentials = provider.getCredentials().credentials;
    this.stackName = provider.naming.getStackName();
    this.region = provider.getRegion();
    this.stage = provider.getStage();
  }
}
exports.ServerlessSwaggerUi = ServerlessSwaggerUi;
module.exports = ServerlessSwaggerUi;
//# sourceMappingURL=index.js.map
