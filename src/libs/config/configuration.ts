import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { join, resolve } from 'path';
import { ConfigSchema } from './validation';
import { z } from 'zod';

export default () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const logLevel = process.env.LOG_LEVEL || 'silly';

  const yamlFilename = process.env.YAML_FILENAME || 'config.yaml';
  const configFilePath = join(resolve(), yamlFilename);

  const configYaml = load(readFileSync(configFilePath, 'utf8')) as Record<
    string,
    any
  >;

  const result = ConfigSchema.safeParse(configYaml);

  if (result.success === false) {
    if (result.error instanceof z.ZodError) {
      console.log('Config parsing issues: ', result.error.issues);
    } else {
      console.log(result.error);
    }

    throw new Error(`Invalid config in yaml file.`);
  }

  if (!isProduction) {
    console.log(result.data);
  }

  return {
    isProduction,
    logLevel,
    ...configYaml,
  };
};
