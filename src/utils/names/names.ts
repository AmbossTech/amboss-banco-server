import { uniqueNamesGenerator } from 'unique-names-generator';
import { fruits } from './fruitList';

export const fruitNameGenerator = () => {
  return uniqueNamesGenerator({
    dictionaries: [fruits],
    style: 'capital',
    length: 1,
  });
};
