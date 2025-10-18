// ==== USER SETTINGS ====
const numRolls = 9999;
const threshold = 19;
const damageFormula = "6d6 + 10";
const nonCritBonusFormula = "1d4";     // Optional bonus for all hits
const critBonusFormula = "1d8";        // Optional bonus only for crits
const critConfirmBonus = 5;

const damageReduction = 30;
const critMultiplier = 4;
const critRange = 20;
const critNegationPercentage = 0.25;
const minRoll = 1;
const numTurns = 3;
const tempHP = 10;
const missChance = 0.4;  // 40% chance to miss even on a hit
// ========================

let totalDamage = 0;
let hitCount = 0;

for (let j = 1; j <= numTurns; j++) {
  for (let i = 1; i <= numRolls; i++) {
    const d20 = new Roll("1d20");
    await d20.evaluate({ async: true });
    const d20Result = Math.max(d20.total, minRoll);

    if (d20Result >= threshold) {
      // Apply miss chance
      if (Math.random() < missChance) continue;

      hitCount++;

      // Crit Confirm section
      let isCrit = false;
      let threatenedCrit = d20Result >= critRange;

      if (threatenedCrit) {
        const confirmRoll = new Roll("1d20 + " + critConfirmBonus);
        await confirmRoll.evaluate({ async: true });
      
        if (confirmRoll.total >= threshold) {
          isCrit = true;
        }
      }

      // Roll base damage
      const damageRoll = new Roll(damageFormula);
      await damageRoll.evaluate({ async: true });
      let damage = damageRoll.total;

      // Roll bonus damage formulas if provided
      let nonCritBonus = 0;
      let critBonus = 0;

      if (nonCritBonusFormula) {
        const nonCritRoll = new Roll(nonCritBonusFormula);
        await nonCritRoll.evaluate({ async: true });
        nonCritBonus = nonCritRoll.total;
      }

      if (isCrit && critBonusFormula) {
        const critRoll = new Roll(critBonusFormula);
        await critRoll.evaluate({ async: true });
        critBonus = critRoll.total;
      }

      // Handle crits
      if (isCrit) {
        const negateCrit = Math.random() < critNegationPercentage;
        if (!negateCrit) {
          damage *= critMultiplier;
          damage += critBonus;
        }
      }

      damage += nonCritBonus;

      // Apply damage reduction
      damage = Math.max(damage - damageReduction, 0);

      // Apply temporary HP
      const tempAbsorb = Math.min(tempHP, damage);
      damage -= tempAbsorb;

      totalDamage += damage;
    }
  }
}

const log = `
🎲 Rolled d20 ${numRolls} times × ${numTurns} turns  
🎯 Threshold: ${threshold}  
🧨 Base Damage: ${damageFormula}  
🧪 Non-Crit Bonus: ${nonCritBonusFormula || "None"}  
💥 Crit-Only Bonus: ${critBonusFormula || "None"}  
🛡️ DR: ${damageReduction}  
✖️ Crit Multiplier: ${critMultiplier}  
🪄 Crit Range: ${critRange}  
🧱 Crit Negation %: ${critNegationPercentage * 100}%  
🪵 Minimum Roll: ${minRoll}  
🧱 Temp HP per Turn: ${tempHP}  
🕒 Number of Turns: ${numTurns}
🎲 Crit Confirm Bonus: ${critConfirmBonus}
🎯 Miss Chance: ${missChance * 100}%

✅ Total Hits: ${hitCount}  
🔥 Total Damage Dealt: ${totalDamage}
`;

ChatMessage.create({
  content: `<pre>${log}</pre>`,
  speaker: ChatMessage.getSpeaker()
});