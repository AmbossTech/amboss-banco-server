import {
  animals,
  colors,
  NumberDictionary,
  uniqueNamesGenerator,
} from 'unique-names-generator';

import { fruits } from './fruitList';

const numberDictionary = NumberDictionary.generate({ min: 10, max: 99 });

export const generateFruitName = () => {
  return uniqueNamesGenerator({
    dictionaries: [fruits],
    style: 'capital',
    length: 1,
  });
};

export const generateMoneyAddress = () => {
  return uniqueNamesGenerator({
    dictionaries: [colors, animals, numberDictionary],
    separator: '',
    style: 'lowerCase',
    length: 3,
  });
};
