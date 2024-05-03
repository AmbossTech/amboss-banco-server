import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { join } from 'path';

const YAML_CONFIG_FILENAME = 'config.yaml';

export default () => {
  const isProduction = process.env.NODE_ENV === 'production';

  const configFilePath = join(__dirname, YAML_CONFIG_FILENAME);
  const configYaml = load(readFileSync(configFilePath, 'utf8')) as Record<
    string,
    any
  >;

  //   if (!configYaml) {
  //     console.log('No yaml config file found.');
  //   }

  return { isProduction, ...configYaml };
};
