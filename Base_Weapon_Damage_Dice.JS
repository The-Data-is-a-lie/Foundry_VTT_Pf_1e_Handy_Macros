// Base Weapon Damage Dice
Hooks.on("ckl-roll-bonuses_getConditionalParts", (...args) => {
  
  // Log each argument individually
  args.forEach((arg, index) => {
    if (arg && typeof arg === 'object') {
      
      // Look for actor and item data
      if (arg.actor) {
        console.log("Found actor:", arg.actor);
        console.log("Actor items:", arg.actor.items);
        
        // Look for the second attack
        if (arg.actor.items) {
          let secondAttack = arg.actor.items.find(item => item.name === "TESTING Weapon (2)");
          if (secondAttack) {
          }
        }
      }
      
      if (arg.item) {
      }
    }
  });
  
  let firstArg = args[0];
  if (!firstArg || !firstArg.item) return;
  
  let item = firstArg.item;
  let actor = firstArg.actor;
  let action = firstArg.action; // This is what we need to modify!
  
  if (!actor || !item || !action) return;
  
  // Get the size modifier
  let size = actor.system.resources.sizefordamage?.value || 0;

  // Damage scaling table with average values
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

  // Function to calculate average damage for any dice formula
  let calculateAverage = (diceFormula) => {
    if (!diceFormula) return 0;
    
    // Handle simple cases like "1d6", "2d8", etc.
    let match = diceFormula.match(/(\d+)d(\d+)/);
    if (match) {
      let numDice = parseInt(match[1]);
      let dieSize = parseInt(match[2]);
      return numDice * (dieSize + 1) / 2;
    }
    
    // Handle complex formulas by parsing each dice part
    let total = 0;
    let diceMatches = diceFormula.match(/\d+d\d+/g);
    if (diceMatches) {
      diceMatches.forEach(dice => {
        let m = dice.match(/(\d+)d(\d+)/);
        if (m) {
          let numDice = parseInt(m[1]);
          let dieSize = parseInt(m[2]);
          total += numDice * (dieSize + 1) / 2;
        }
      });
    }
    
    return total;
  };

  // Function to find the closest damage dice by average (round up)
  let findClosestDice = (targetAverage) => {
    // If target is less than the smallest, return the smallest
    if (targetAverage <= damageTable[0].average) {
      return damageTable[0].dice;
    }
    
    // If target is greater than the largest, return the largest
    if (targetAverage >= damageTable[damageTable.length - 1].average) {
      return damageTable[damageTable.length - 1].dice;
    }
    
    // Find the first entry with average >= target (round up)
    for (let i = 0; i < damageTable.length; i++) {
      if (damageTable[i].average >= targetAverage) {
        return damageTable[i].dice;
      }
    }
    
    return damageTable[damageTable.length - 1].dice;
  };

  let scaleDice = (dice) => {
    // First, try to find exact match in table
    let startIndex = damageTable.findIndex(entry => entry.dice === dice);
    
    if (startIndex === -1) {
      // Not found in table, calculate average and find closest
      let average = calculateAverage(dice);
      console.log(`Dice ${dice} not found in table. Calculated average: ${average}`);
      
      // Find the closest dice by average
      let closestDice = findClosestDice(average);
      console.log(`Using closest dice: ${closestDice}`);
      
      // Now find the index of the closest dice
      startIndex = damageTable.findIndex(entry => entry.dice === closestDice);
      if (startIndex === -1) startIndex = 0; // Fallback
    }
    
    let newIndex = Math.min(startIndex + size * 2, damageTable.length - 1);
    return damageTable[newIndex].dice;
  };

  let scaleFormula = (formula) => {
    if (!formula) return formula;
    return formula.replace(/\d+d\d+/g, scaleDice);
  };

  // SAFE: Get the damage from the 2nd action (Attack2) as the base
  let attack2Damage = null;
  try {
    // Check if item has the expected structure
    if (item._source?.system?.actions && item._source.system.actions.length > 1) {
      attack2Damage = item._source.system.actions[1].damage;
    } else {
      console.warn(`Item ${item.name} does not have a second action, using first action damage`);
      // Fallback to first action if second doesn't exist
      if (item._source?.system?.actions && item._source.system.actions.length > 0) {
        attack2Damage = item._source.system.actions[0].damage;
      } else {
        console.warn(`Item ${item.name} has no actions at all`);
        return; // Exit early if no actions
      }
    }
  } catch (e) {
    console.error(`Error accessing item actions for ${item.name}:`, e);
    return; // Exit early if there's an error
  }

  if (!attack2Damage) {
    console.warn(`No damage found for item ${item.name}`);
    return;
  }

  // Scale the Attack2 damage based on size
  let scaledDamage = duplicate(attack2Damage);
  
  // SAFE: Scale damage parts
  try {
    if (scaledDamage.parts && Array.isArray(scaledDamage.parts)) {
      scaledDamage.parts.forEach((part, index) => {
        if (part.formula) {
          let originalFormula = part.formula;
          let scaledFormula = scaleFormula(originalFormula);
          part.formula = scaledFormula;
        }
      });
    }
    
    if (scaledDamage.critParts && Array.isArray(scaledDamage.critParts)) {
      scaledDamage.critParts.forEach((part, index) => {
        if (part.formula) {
          let originalFormula = part.formula;
          let scaledFormula = scaleFormula(originalFormula);
          part.formula = scaledFormula;
        }
      });
    }
    
    if (scaledDamage.nonCritParts && Array.isArray(scaledDamage.nonCritParts)) {
      scaledDamage.nonCritParts.forEach((part, index) => {
        if (part.formula) {
          let originalFormula = part.formula;
          let scaledFormula = scaleFormula(originalFormula);
          part.formula = scaledFormula;
        }
      });
    }
  } catch (e) {
    console.error(`Error scaling damage for ${item.name}:`, e);
    return;
  }

  // Apply the SCALED damage to the action (what actually gets rolled)
  try {
    // Ensure all damage parts are arrays before applying
    if (scaledDamage.parts && !Array.isArray(scaledDamage.parts)) {
      scaledDamage.parts = [];
    }
    if (scaledDamage.critParts && !Array.isArray(scaledDamage.critParts)) {
      scaledDamage.critParts = [];
    }
    if (scaledDamage.nonCritParts && !Array.isArray(scaledDamage.nonCritParts)) {
      scaledDamage.nonCritParts = [];
    }
    
    // If any damage parts are missing, initialize them as empty arrays
    if (!scaledDamage.parts) scaledDamage.parts = [];
    if (!scaledDamage.critParts) scaledDamage.critParts = [];
    if (!scaledDamage.nonCritParts) scaledDamage.nonCritParts = [];
    
    action.damage = duplicate(scaledDamage);
  } catch (e) {
    console.error(`Error applying scaled damage for ${item.name}:`, e);
  }
});


// Conditional Damage Portion
// Conditional Damage Portion
// Conditional Damage Portion
// Conditional Damage Portion
// Conditional Damage Portion
// Conditional Damage Portion
// Conditional Damage Portion
// Conditional Damage Portion
// Conditional Damage Portion
Hooks.on("ckl-roll-bonuses_getConditionalParts", (...args) => {
  let actor = args[0]?.actor;
  let item = args[0]?.item;
  if (!actor || !item) return;

  // Create a unique run ID to prevent multiple processing
  if (!args[0]._cklRunId) {
    args[0]._cklRunId = Date.now() + Math.random();
  }
  
  // Check if we've already processed this run
  if (args[0]._cklProcessed) return;
  args[0]._cklProcessed = true;

  let size = actor.system.resources.sizefordamage?.value || 0;

  // Same damage table with averages
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

  // Same helper functions as above
  let calculateAverage = (diceFormula) => {
    if (!diceFormula) return 0;
    
    let match = diceFormula.match(/(\d+)d(\d+)/);
    if (match) {
      let numDice = parseInt(match[1]);
      let dieSize = parseInt(match[2]);
      return numDice * (dieSize + 1) / 2;
    }
    
    let total = 0;
    let diceMatches = diceFormula.match(/\d+d\d+/g);
    if (diceMatches) {
      diceMatches.forEach(dice => {
        let m = dice.match(/(\d+)d(\d+)/);
        if (m) {
          let numDice = parseInt(m[1]);
          let dieSize = parseInt(m[2]);
          total += numDice * (dieSize + 1) / 2;
        }
      });
    }
    
    return total;
  };

  let findClosestDice = (targetAverage) => {
    if (targetAverage <= damageTable[0].average) {
      return damageTable[0].dice;
    }
    
    if (targetAverage >= damageTable[damageTable.length - 1].average) {
      return damageTable[damageTable.length - 1].dice;
    }
    
    for (let i = 0; i < damageTable.length; i++) {
      if (damageTable[i].average >= targetAverage) {
        return damageTable[i].dice;
      }
    }
    
    return damageTable[damageTable.length - 1].dice;
  };

  let scaleDice = (dice) => {
    let startIndex = damageTable.findIndex(entry => entry.dice === dice);
    
    if (startIndex === -1) {
      let average = calculateAverage(dice);
      console.log(`Dice ${dice} not found in table. Calculated average: ${average}`);
      
      let closestDice = findClosestDice(average);
      console.log(`Using closest dice: ${closestDice}`);
      
      startIndex = damageTable.findIndex(entry => entry.dice === closestDice);
      if (startIndex === -1) startIndex = 0;
    }
    
    let newIndex = Math.min(startIndex + size * 2, damageTable.length - 1);
    return damageTable[newIndex].dice;
  };

  let scaleFormula = (formula) => {
    if (!formula) return formula;
    return formula.replace(/\d+d\d+/g, scaleDice);
  };

  // FIXED: Safe array scaling function
  let scalePartArray = (arr) => {
    if (!arr || !Array.isArray(arr)) {
      return [];
    }
    return arr.map(d => {
      if (Array.isArray(d) && d.length >= 1) {
        return [scaleFormula(d[0]), d[1] || ""];
      }
      return d;
    });
  };

  // SAFE: Process each part with comprehensive error handling
  args.forEach((part) => {
    if (part._scaled) return;
    part._scaled = true;

    try {
      // Check if the part has damage properties before trying to access them
      if (part && typeof part === 'object') {
        // Initialize damage arrays if they don't exist
        if (!part["damage.crit"]) part["damage.crit"] = [];
        if (!part["damage.nonCrit"]) part["damage.nonCrit"] = [];
        if (!part["damage.normal"]) part["damage.normal"] = [];
        
        // Only process if the properties exist and are arrays
        if (Array.isArray(part["damage.crit"])) {
          part["damage.crit"] = scalePartArray(part["damage.crit"]);
        }
        
        if (Array.isArray(part["damage.nonCrit"])) {
          part["damage.nonCrit"] = scalePartArray(part["damage.nonCrit"]);
        }
        
        if (Array.isArray(part["damage.normal"])) {
          part["damage.normal"] = scalePartArray(part["damage.normal"]);
        }
      }
    } catch (e) {
      console.error(`Error scaling damage part for ${item?.name || 'unknown item'}:`, e);
      console.error("Part data:", part);
    }
  });
});