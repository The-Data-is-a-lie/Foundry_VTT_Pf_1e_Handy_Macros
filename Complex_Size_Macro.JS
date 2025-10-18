// Works as intended, uses the top left as an origin point. As long as the character sheet is within the bounds of the (top left?) map, can grow or shrink to whatever the size is

let tokens = canvas.tokens.controlled;
if (!tokens.length) return ui.notifications.warn("No tokens selected.");

const firstToken = tokens[0];
const content = `
<form>
  <div class="form-group">
    <label>New Width (in grid units):</label>
    <input type="number" name="width" value="${firstToken.document.width}" min="0.01" step="0.01"/>
  </div>
  <div class="form-group">
    <label>New Height (in grid units):</label>
    <input type="number" name="height" value="${firstToken.document.height}" min="0.01" step="0.01"/>
  </div>
</form>
`;

new Dialog({
  title: "Set Token & Actor Prototype Dimensions",
  content,
  buttons: {
    ok: {
      label: "Apply",
      callback: async (html) => {
        const width = parseFloat(html.find('[name="width"]').val());
        const height = parseFloat(html.find('[name="height"]').val());

        if (isNaN(width) || width < 0.01 || isNaN(height) || height < 0.01) {
          return ui.notifications.error("Invalid dimensions entered.");
        }

        const updatedActors = new Set();

        for (let token of tokens) {
          try {
            const actor = token.actor;

            // Validate actor data
            if (!actor || !actor.system) {
              ui.notifications.error(`Actor ${actor?.name || 'Unknown'} has invalid data structure.`);
              continue;
            }

            if (!updatedActors.has(actor.id)) {
              // Update prototype token data (what is on the token on screen)
              await actor.update({
                "prototypeToken.width": width,
                "prototypeToken.height": height
              });

              // Update the current token's document (what is on the sheet in the folder)
              await token.document.update({
                width: width,
                height: height
              });

              const sizeVal = Math.max(width, height);
              await updateSizeBuff(actor, sizeVal);

              // Use core flag scope instead of custom module
              // Update Token
              try {
                await token.document.setFlag("core", "customSize", { 
                  width: width, 
                  height: height,
                  timestamp: Date.now()
                });

              // Update Actor
                await actor.setFlag("core", "customSize", { 
                  width: width, 
                  height: height,
                  timestamp: Date.now()
                });
              } catch (flagError) {
                console.warn("Could not set flags, but size update will still work:", flagError);
              }

              updatedActors.add(actor.id);
            } else {
              // Just update the current token size
              await token.document.update({
                width: width,
                height: height
              });
            }

            // Force redraw
            await token.document.update({ x: token.document.x, y: token.document.y });
            await token.draw();
            
          } catch (error) {
            console.error(`Error updating token ${token.name}:`, error);
            ui.notifications.error(`Failed to update token ${token.name}: ${error.message}`);
          }
        }

        ui.notifications.info(`Updated ${tokens.length} token(s) and ${updatedActors.size} actor(s).`);
      }
    },
    cancel: { label: "Cancel" }
  },
  default: "ok"
}).render(true);

// Add this hook to restore size when tokens are created
Hooks.on("createToken", async (token) => {
  // Check if the actor has a custom size flag
  const actorSize = token.actor?.getFlag("core", "customSize");
  if (actorSize && actorSize.width && actorSize.height) {
    console.log(`Restoring custom size for ${token.name}: ${actorSize.width}x${actorSize.height}`);
    
    // Update the token with the custom size
    await token.update({
      width: actorSize.width,
      height: actorSize.height
    });
    
    // Also update the prototype token for future use
    await token.actor.update({
      "prototypeToken.width": actorSize.width,
      "prototypeToken.height": actorSize.height
    });
  }
});

// Add this hook to restore size when tokens are updated
Hooks.on("updateToken", async (token, changes) => {
  // Only run if the token is being placed on the map (not just moved)
  if (changes.x !== undefined || changes.y !== undefined) {
    const actorSize = token.actor?.getFlag("core", "customSize");
    if (actorSize && actorSize.width && actorSize.height) {
      // Check if the current size matches the saved size
      const currentWidth = token.width || token.document.width;
      const currentHeight = token.height || token.document.height;
      
      if (currentWidth !== actorSize.width || currentHeight !== actorSize.height) {
        console.log(`Restoring custom size for ${token.name}: ${actorSize.width}x${actorSize.height}`);
        
        await token.update({
          width: actorSize.width,
          height: actorSize.height
        });
      }
    }
  }
});

// Size Buff Update Table Setup
const sizeTable = [
  { size: "Fine", max: 0.32, mods:       { str: -14, dex: 8,  con: -2,  natAC: 0,  stealth: 16,  fly: 8,  cmd: -8, cmb: -8, atk: 8,  ac: 8   ,carryStr:  0   ,carryMult: -3/4 } },
  { size: "Diminutive", max: 0.49, mods: { str: -12, dex: 6,  con: -2,  natAC: 0,  stealth: 12,  fly: 6,  cmd: -6, cmb: -6, atk: 4,  ac: 4   ,carryStr:  0   ,carryMult: -1/2 } },
  { size: "Tiny", max: 0.74, mods:       { str: -8,  dex: 4,  con: -2,  natAC: 0,  stealth: 8,   fly: 4,  cmd: -4, cmb: -4, atk: 2,  ac: 2   ,carryStr:  0   ,carryMult: -1/4 } },
  { size: "Small", max: 0.99, mods:      { str: -4,  dex: 2,  con: -2,  natAC: 0,  stealth: 4,   fly: 2,  cmd: -2, cmb: -2, atk: 1,  ac: 1   ,carryStr:  0   ,carryMult: 0    } },
  { size: "Medium", max: 1.9, mods:      { str: 0,   dex: 0,  con: 0,   natAC: 0,  stealth: 0,   fly: 0,  cmd: 0,  cmb: 0,  atk: 0,  ac: 0   ,carryStr:  0   ,carryMult: 0    } },
  { size: "Large", max: 2.9, mods:       { str: 8,   dex: -2, con: 4,   natAC: 2,  stealth: -4,  fly: -2, cmd: 2,  cmb: 2,  atk: -1,  ac: -1 ,carryStr:  0   ,carryMult: 1    } },
  { size: "Huge", max: 3.9, mods:        { str: 16,  dex: -2, con: 8,   natAC: 5,  stealth: -8,  fly: -4, cmd: 4,  cmb: 4,  atk: -2,  ac: -2 ,carryStr:  0   ,carryMult: 2    } },
  { size: "Gargantuan", max: 4.9, mods:  { str: 24,  dex: -2, con: 12,  natAC: 9,  stealth: -12, fly: -6, cmd: 6,  cmb: 6,  atk: -4,  ac: -4 ,carryStr:  0   ,carryMult: 3    } },
  { size: "Colossal", max: 5.9, mods:    { str: 32,  dex: -2, con: 16,  natAC: 14, stealth: -16, fly: -8, cmd: 8,  cmb: 8,  atk: -8,  ac: -8 ,carryStr:  -8  ,carryMult: 4    } }
];

function getSizeMods(sizeValue) {
  const entry = sizeTable.find(e => sizeValue <= e.max);
  if (entry) return entry.mods;

  // Bigger than Colossal → apply step increases
  const colossalMax = sizeTable[sizeTable.length - 1].max;
  const baseMods = { ...sizeTable[sizeTable.length - 1].mods };

  // Step increments for each full size category past Colossal
  const stepIncrease = {
    str:       4,
    dex:       0,
    con:       4,
    natAC:     2,
    stealth:  -4,
    fly:      -2,
    cmd:       2,
    cmb:       2,
    atk:      -2,
    ac:       -2,
    carryStr: -3.5,
    carryMult: 1
  };

  // Figure out how many *full* size steps past Colossal
  // Example: size 6 → steps = 1, size 7 → steps = 2
  const steps = Math.floor(sizeValue - colossalMax + 1);

  // Apply step increases
  for (let i = 0; i < steps; i++) {
    for (const key in stepIncrease) {
      if (key === "carryMult") {
        baseMods[key] *= stepIncrease[key]; // multiplicative scaling
      } else {
        baseMods[key] += stepIncrease[key];
      }
    }
  }

  return baseMods;
}

async function updateSizeBuff(actor, sizeValue) {
  const buffName = "Size-Based Buff";
  const existingBuff = actor.items.find(i => i.name === buffName && i.type === "buff");
  const mods = getSizeMods(sizeValue);

  // Clamp STR, DEX, and CON to at least 1
  const currentStr = actor.system.abilities.str.value;
  const currentDex = actor.system.abilities.dex.value;
  const currentCon = actor.system.abilities.con.value;

  if (currentStr + mods.str < 1) mods.str = 1 - currentStr;
  if (currentDex + mods.dex < 1) mods.dex = 1 - currentDex;
  if (currentCon + mods.con < 1) mods.con = 1 - currentCon;
  
  // Build PF1-style changes array
  const changes = [
    { type: "untyped", operator: "add", priority: 0, formula: `${mods.str}`, target: "str" }
    ,{ type: "untyped", operator: "add", priority: 0, formula: `${mods.con}`, target: "con" }
    ,{ type: "untyped", operator: "add", priority: 0, formula: `${mods.dex}`, target: "dex" }

    ,{ type: "untyped", operator: "add", priority: 0, formula: `${mods.natAC}`, target: "nac" }
    ,{ type: "untyped", operator: "add", priority: 0, formula: `${mods.ac}`, target: "ac" }

    ,{ type: "untyped", operator: "add", priority: 0, formula: `${mods.stealth}`, target: "skill.ste" }
    ,{ type: "untyped", operator: "add", priority: 0, formula: `${mods.fly}`, target: "skill.fly" }
    
    ,{ type: "untyped", operator: "add", priority: 0, formula: `${mods.cmd}`, target: "cmd" }
    ,{ type: "untyped", operator: "add", priority: 0, formula: `${mods.cmb}`, target: "cmb" }
    ,{ type: "untyped", operator: "add", priority: 0, formula: `${mods.atk}`, target: "attack" }

    ,{ type: "untyped", operator: "add", priority: 0, formula: `${mods.carryStr}`, target: "carryStr" }
    ,{ type: "untyped", operator: "add", priority: 0, formula: `${mods.carryMult}`, target: "carryMult" }
  ];

  if (existingBuff) {
   await existingBuff.update({ 
    "system.changes": changes,
    "system.active": true  // force buff to active on update
});
  } else {
    await actor.createEmbeddedDocuments("Item", [{
      name: buffName,
      type: "buff",
      img: "icons/svg/ice-aura.svg",
      system: {
        changes: changes,
        description: { value: "Auto-applied size-based buff." },
        active: true,
        duration: {},
        level: 0,
        subType: "perm",
        tags: []
      }
    }]);
  }
}