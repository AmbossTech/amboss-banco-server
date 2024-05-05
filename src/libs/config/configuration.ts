import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { join, resolve } from 'path';

export default () => {
  const isProduction = process.env.NODE_ENV === 'production';

  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || 'JWT_ACCESS_SECRET';
  const jwtRefreshSecret =
    process.env.JWT_REFRESH_SECRET || 'JWT_REFRESH_SECRET';

  const yamlFilename = process.env.YAML_FILENAME || 'config.yaml';
  const configFilePath = join(resolve(), yamlFilename);

  const configYaml = load(readFileSync(configFilePath, 'utf8')) as Record<
    string,
    any
  >;

  return {
    isProduction,
    auth: { jwtAccessSecret, jwtRefreshSecret },
    ...configYaml,
  };
};
