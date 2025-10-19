// Notes:
// Top part: Scales base weapon damage
// Bot part: Scales conditional damage

// Damage table for scaling
const damageTable = [
  { dice: "1", average: 1 },
  { dice: "1d2", average: 1.5 },
  { dice: "1d3", average: 2 },
  { dice: "1d4", average: 2.5 },
  { dice: "1d6", average: 3.5 },
  { dice: "1d8", average: 4.5 },
  { dice: "1d10", average: 5.5 },
  { dice: "1d12", average: 6.5 },
  { dice: "2d6", average: 7 },
  { dice: "2d8", average: 9 },
  { dice: "3d6", average: 10.5 },
  { dice: "2d10", average: 11 },
  { dice: "2d12", average: 13 },
  { dice: "3d8", average: 13.5 },
  { dice: "4d6", average: 14 },
  { dice: "4d8", average: 18 },
  { dice: "6d6", average: 21 },
  { dice: "4d10", average: 22 },
  { dice: "4d12", average: 26 },
  { dice: "6d8", average: 27 },
  { dice: "8d6", average: 28 },
  { dice: "5d10", average: 27.5 },
  { dice: "5d12", average: 32.5 },
  { dice: "8d8", average: 36 },
  { dice: "6d12", average: 39 },
  { dice: "12d6", average: 42 },
  { dice: "8d10", average: 44 },
  { dice: "9d10", average: 49.5 },
  { dice: "15d6", average: 52.5 },
  { dice: "12d8", average: 54 },
  { dice: "16d6", average: 56 },
  { dice: "10d10", average: 55 },
  { dice: "10d12", average: 65 },
  { dice: "20d6", average: 70 },
  { dice: "16d8", average: 72 },
  { dice: "12d12", average: 78 },
  { dice: "20d8", average: 90 },
  { dice: "15d12", average: 97.5 },
  { dice: "20d10", average: 110 },
  { dice: "18d12", average: 117 },
  { dice: "20d12", average: 130 },
  { dice: "22d12", average: 143 },
  { dice: "24d12", average: 156 },
  { dice: "26d12", average: 169 }
];

// Helper functions
function calculateAverage(diceFormula) {
  if (!diceFormula) return 0;

  let total = 0;
  const diceMatches = diceFormula.match(/\d+d\d+/g);
  if (diceMatches) {
    for (const dice of diceMatches) {
      const m = dice.match(/(\d+)d(\d+)/);
      if (m) {
        const numDice = parseInt(m[1]);
        const dieSize = parseInt(m[2]);
        total += numDice * (dieSize + 1) / 2;
      }
    }
  }
  return total;
}

function findClosestDice(targetAverage) {
  if (targetAverage <= damageTable[0].average) return damageTable[0].dice;
  if (targetAverage >= damageTable[damageTable.length - 1].average)
    return damageTable[damageTable.length - 1].dice;

  for (const entry of damageTable) {
    if (entry.average >= targetAverage) return entry.dice;
  }
  return damageTable[damageTable.length - 1].dice;
}

function scaleDice(dice, sizeModifier) {
  let startIndex = damageTable.findIndex((entry) => entry.dice === dice);

  if (startIndex === -1) {
    const avg = calculateAverage(dice);
    const closest = findClosestDice(avg);
    startIndex = damageTable.findIndex((entry) => entry.dice === closest);
    if (startIndex === -1) startIndex = 0;
  }

  const newIndex = Math.min(startIndex + sizeModifier * 2, damageTable.length - 1);
  return damageTable[newIndex].dice;
}

function scaleFormula(formula, sizeModifier) {
  if (!formula) return formula;
  return formula.replace(/\d+d\d+/g, (match) => scaleDice(match, sizeModifier));
}

function scalePartArray(arr, sizeModifier) {
  if (!arr) return [];
  return arr.map((part) => [scaleFormula(part[0], sizeModifier), part[1] || ""]);
}

// --- Hook 1: Scale base weapon damage ---
Hooks.on("ckl-roll-bonuses_getConditionalParts", (...args) => {
  const firstArg = args[0];
  if (!firstArg?.actor || !firstArg?.item || !firstArg?.action) return;

  const actor = firstArg.actor;
  const item = firstArg.item;
  const action = firstArg.action;
  const size = actor.system.resources.sizefordamage?.value || 0;

  // Get base attack2 damage
  const attack2Damage = item._source.system.actions[1]?.damage;
  if (!attack2Damage) return;

  const scaledDamage = duplicate(attack2Damage);

  // Ensure all parts exist
  scaledDamage.parts = scaledDamage.parts || [];
  scaledDamage.critParts = scaledDamage.critParts || [];
  scaledDamage.nonCritParts = scaledDamage.nonCritParts || [];

  // Scale each part
  scaledDamage.parts.forEach((p) => { if (p.formula) p.formula = scaleFormula(p.formula, size); });
  scaledDamage.critParts.forEach((p) => { if (p.formula) p.formula = scaleFormula(p.formula, size); });
  scaledDamage.nonCritParts.forEach((p) => { if (p.formula) p.formula = scaleFormula(p.formula, size); });

  action.damage = scaledDamage;
});

// --- Hook 2: Scale conditional damage safely ---
Hooks.on("ckl-roll-bonuses_getConditionalParts", (...args) => {
  for (const part of args) {
    if (part._scaled) continue; // Avoid double-scaling
    part._scaled = true;

    const actor = part.actor;
    if (!actor) continue;
    const size = actor.system.resources.sizefordamage?.value || 0;

    // Safe scaling for conditional damage
    part["damage.crit"] = scalePartArray(part["damage.crit"], size);
    part["damage.nonCrit"] = scalePartArray(part["damage.nonCrit"], size);
    part["damage.normal"] = scalePartArray(part["damage.normal"], size);
  }
});
