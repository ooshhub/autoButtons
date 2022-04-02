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


<table>
<tr><th>{{rollname}}</th></tr>
<tr><td><span class="tcat">Attack: </span>{{attack}} | {{attackadvantage}} vs AC</td></tr>
  {{#damage}}
  <tr>
    <td><span class="tcat">Damage: </span>{{damage}} {{#rollWasCrit() attack}}<span class="tcat">Crit: </span>{{dmgcrit}} {{/rollWasCrit() attack}}</td>
  </tr>
  <tr>
    <td><span class="tcat">Type: </span>{{dmgtype}}</td>
  </tr>
  {{/damage}}
<tr>
  <td><span class="tcat">Effect: </span>{{atteffect}}</td>
</tr>
</table>

createRepeatingEntry('traits', [
  { name: 'name', current: 'Silly Walks' },
  { name: 'description', current: 'Unable to walk sensibly' },
]);

console.log('brk');
// [
// 	{name: 'repeating_traits_-MzYfU7opqGzMiyxp4SF_name', current: 'Silly Walks', max: ''}
// 	{name: 'repeating_traits_-MzYfU7opqGzMiyxp4SF_description', current: 'Unable to walk sensibly', max: ''}
// ]