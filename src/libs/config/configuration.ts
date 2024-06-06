import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { join, resolve } from 'path';
import { ConfigSchema } from './validation';
import { z } from 'zod';

export default () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const logLevel = process.env.LOG_LEVEL || 'silly';

  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || 'JWT_ACCESS_SECRET';
  const jwtRefreshSecret =
    process.env.JWT_REFRESH_SECRET || 'JWT_REFRESH_SECRET';

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

  return {
    isProduction,
    logLevel,
    auth: { jwtAccessSecret, jwtRefreshSecret },
    ...configYaml,
  };
};
