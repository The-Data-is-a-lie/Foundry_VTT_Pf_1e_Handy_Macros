// Notes:
// Unified scaling hook — handles both base weapon and conditional damage scaling.

// Damage table for scaling
let damageTable = [
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

// --- Helper functions ---
function calculateAverage(diceFormula) {
  if (!diceFormula) return 0;
  let total = 0;
  let diceMatches = diceFormula.match(/\d+d\d+/g);
  if (diceMatches) {
    for (let dice of diceMatches) {
      let m = dice.match(/(\d+)d(\d+)/);
      if (m) {
        let numDice = parseInt(m[1]);
        let dieSize = parseInt(m[2]);
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
  for (let entry of damageTable) {
    if (entry.average >= targetAverage) return entry.dice;
  }
  return damageTable[damageTable.length - 1].dice;
}

function scaleDice(dice, sizeModifier) {
  let startIndex = damageTable.findIndex((entry) => entry.dice === dice);
  if (startIndex === -1) {
    let avg = calculateAverage(dice);
    let closest = findClosestDice(avg);
    startIndex = damageTable.findIndex((entry) => entry.dice === closest);
    if (startIndex === -1) startIndex = 0;
  }
  let newIndex = Math.min(startIndex + sizeModifier * 2, damageTable.length - 1);
  return damageTable[newIndex].dice;
}

function scaleFormula(formula, sizeModifier) {
  if (!formula) return formula;

  let skipRegex = /\/\s*\(1\)/;
  // regular expression to look for / (1) with any amount of spaces between / and (1). It skips scaling if this is the case

  if (skipRegex.test(formula)) {
    console.log("Skipping scaling for tagged formula:", formula);
    
    return formula;
  }

  return formula.replace(/\d+d\d+/g, (match) => scaleDice(match, sizeModifier));
}

function scalePartArray(arr, sizeModifier) {
  if (!arr) return [];
  return arr.map((part) => [scaleFormula(part[0], sizeModifier), part[1] || ""]);
}

// --- Unified Hook ---
Hooks.on("ckl-roll-bonuses_getConditionalParts", (...args) => {
  let firstArg = args[0];


  if (!firstArg) return;

  let actor = firstArg.actor;
  if (!actor) return;
  let size = actor.system.resources.sizefordamage?.value || 0;

  // --- CASE 1: Base weapon scaling ---
  if (firstArg.item && firstArg.action) {
    let item = firstArg.item;
    let action = firstArg.action;

    let attack2Damage = item._source.system.actions[1]?.damage;
    if (attack2Damage) {
      let scaledDamage = duplicate(attack2Damage);

      // Ensure arrays exist
      scaledDamage.parts = scaledDamage.parts || [];
      scaledDamage.critParts = scaledDamage.critParts || [];
      scaledDamage.nonCritParts = scaledDamage.nonCritParts || [];

      // Scale each group
      for (let group of [scaledDamage.parts, scaledDamage.critParts, scaledDamage.nonCritParts]) {
        group.forEach((p) => {
          if (p.formula) p.formula = scaleFormula(p.formula, size);
        });
      }

      action.damage = scaledDamage;
    }
  }


// --- CASE 2: Conditional damage scaling directly on secondArg ---
console.log("Applying conditional damage scaling for size modifier:", size);

let secondArg = args[1];
// ThirdArg is chat message (everything is already evalulated there)
if (!secondArg) return;
console.log("secondArg before scaling:", secondArg);

// Helper function to scale each damage array
function scaleDamageArray(arr) {
  if (!arr?.length) return;
  console.log("Gate 1 - damage array:", arr);
  for (let dmg of arr) {
    console.log("Original damage entry:", dmg);
    // dmg is an array: [formulaString, setOfTypes, isCritical]
    let original = dmg[0];
    dmg[0] = scaleFormula(dmg[0], size);
    console.log(`Scaled damage "${original}" → "${dmg[0]}"`);
  }
}

// --- Prevent double/triple scaling using a per-roll tracker ---
firstArg._scaledConditionalDamage ??= new Set();

// Use secondArg id or fallback index as unique key
const key = secondArg._id || secondArg?.action?.id || args.indexOf(secondArg);
if (firstArg._scaledConditionalDamage.has(key)) {
  console.log("Conditional damage already scaled for this secondArg, skipping.");
  return;
}

// Scale damage arrays
scaleDamageArray(secondArg["damage.normal"]);
scaleDamageArray(secondArg["damage.crit"]);
scaleDamageArray(secondArg["damage.nonCrit"]);

// Mark as scaled for this roll
firstArg._scaledConditionalDamage.add(key);
console.log("✅ Conditional damages from secondArg scaled once for this roll.");



});