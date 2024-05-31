import {
  NumberDictionary,
  animals,
  colors,
  uniqueNamesGenerator,
} from 'unique-names-generator';
import { fruits } from './fruitList';

const numberDictionary = NumberDictionary.generate({ min: 10, max: 99 });

export const fruitNameGenerator = () => {
  return uniqueNamesGenerator({
    dictionaries: [fruits],
    style: 'capital',
    length: 1,
  });
};

export const lnAddressGenerator = () => {
  return uniqueNamesGenerator({
    dictionaries: [colors, animals, numberDictionary],
    separator: '',
    style: 'capital',
    length: 3,
  });
};
