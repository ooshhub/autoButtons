const generateUUID = (repeatingRow = false) => {
  var e = new Date().getTime() + 0;
  let g =[], o;
  for (var n = Array(8), m = 7; 0 <= m; m--) n[m] = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(e % 64), e = Math.floor(e / 64);
  if (e = n.join(""), o) {
    for (let m = 11; 0 <= m && g[m] === 63; m--) g[m] = 0;
    g[m]++
  } else
    for (let m = 0; 12 > m; m++) g[m] = Math.floor(64 * Math.random());
  for (m = 0; 12 > m; m++) e += "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(g[m]);
  return repeatingRow ? e.replace(/_/g, '-') : e; // The lazy way to deal with repeating row ids
}

const createRepeatingEntry = (section, attributeArray = []) => {
  const rowId = generateUUID(true),
    prefix = `repeating_${section}_${rowId}_`;
  return attributeArray.map(attr => {
    return {
      name: `${prefix}${attr.name}`,
      current:  attr.current || '',
      max: attr.max || ''
    }
  });
}

// createRepeatingEntry('traits', [
//   { name: 'name', current: 'Silly Walks' },
//   { name: 'description', current: 'Unable to walk sensibly' },
// ]);
// 
// Expected output:
// 
// [
// 	{name: 'repeating_traits_-MzYfU7opqGzMiyxp4SF_name', current: 'Silly Walks', max: ''},
// 	{name: 'repeating_traits_-MzYfU7opqGzMiyxp4SF_description', current: 'Unable to walk sensibly', max: ''}
// ]

const createObj = () => {console.log('*')};
const setAttributes = (characterId, attributeArray, triggerWorkers = true) => {
  attributeArray.forEach(attr => {
    const newAttrId = createObj('attribute', {
      characterid: characterId,
      name: attr.name,
      current: triggerWorkers ? '' : attr.current,
      max: attr.max
    });
    if (triggerWorkers) getObj('attribute', newAttrId).setWithWorker({ current: attr.current });
  });
}

const createTrait = (characterId, traitName, traitDescription) => {
  const newRow = createRepeatingEntry('traits', [ { name: 'name', current: traitName||'' }, { name: 'description', current: traitDescription||'' }]);
  setAttributes(characterId, newRow);
}


createRepeatingEntry('traits', [
  { name: 'name', current: 'Silly Walks' },
  { name: 'description', current: 'Unable to walk sensibly' },
]);

const _defaultButtons = {
  damageCrit: {
    sheets: ['dnd5e_r20'],
    tooltip: `Crit (%)`,
    style: 'baahd',
    default: true,
    math: (damage, crit) => -(damage.total + crit.total),
    content: 'kk',
  },
  damageFull: {
    sheets: ['dnd5e_r20'],
    tooltip: `Full (%)`,
    style: 'baahd',
    default: true,
    math: (damage) => -(1 * damage.total),
    content: 'k',
  },
  damageHalf: {
    sheets: ['dnd5e_r20'],
    tooltip: `Half (%)`,
    style: 'baahd',
    default: true,
    math: (damage) => -(Math.floor(0.5 * damage.total)),
    content: 'b',
  },
  healingFull: {
    sheets: ['dnd5e_r20'],
    tooltip: `Heal (%)`,
    style: 'baahd',
    default: true,
    math: (damage) => (damage.total),
    content: '&',
  },
  newButton: {
    sheets: [],
    tooltip: `Heal (%)`,
    style: 'baahd',
    default: false,
    math: (damage) => (damage.total),
    content: '&',
  },
};

const str = 'blah'

let arr = [];

arr.push(...str)
console.log(arr);

console.log('brk');
// [
// 	{name: 'repeating_traits_-MzYfU7opqGzMiyxp4SF_name', current: 'Silly Walks', max: ''}
// 	{name: 'repeating_traits_-MzYfU7opqGzMiyxp4SF_description', current: 'Unable to walk sensibly', max: ''}
// ]