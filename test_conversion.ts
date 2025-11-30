
import { convertUnit } from './src/lib/unitConversion';

const val = 0;
const converted = convertUnit(val, 'kPag', 'kPa');
console.log(`0 kPag = ${converted} kPa`);

const val2 = 100;
const converted2 = convertUnit(val2, 'kPag', 'kPa');
console.log(`100 kPag = ${converted2} kPa`);
