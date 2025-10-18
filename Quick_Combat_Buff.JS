let tokens = canvas.tokens.controlled;
if (!tokens.length) return ui.notifications.warn("No tokens selected.");

const firstToken = tokens[0];
const actor = firstToken.actor;

// Get current initiative (if in combat) and HP

const combatant = game.combat?.combatants.find(c => c.tokenId === firstToken.id);
if (combatant) currentInit = combatant.initiative ?? 0;

let currentInit = actor.system.attributes.init.total;
let currentHP = actor.system.attributes.hp.value;
let maxHP = actor.system.attributes.hp.max;

const content = `
<form>
  <div class="form-group">
    <label>Initiative:</label>
    <input type="number" name="initiative" value="${currentInit}" step="1"/>
  </div>
  <div class="form-group">
    <label>Current HP:</label>
    <input type="number" name="hp" value="${currentHP}" min="0" max="${maxHP}" step="1"/>
  </div>
</form>
`;

async function updateInitHpBuff(actor, newInit, newHP) {
  const buffName = "Quick Combat Buff";
  const existingBuff = actor.items.find(i => i.name === buffName && i.type === "buff");

  // PF1-style changes array: initiative and current HP
  const changes = [
    { type: "untyped", operator: "add", priority: 0, formula: `${newInit}`, target: "init" },
    { type: "untyped", operator: "add", priority: 0, formula: `${newHP}`, target: "mhp" }
  ];

  if (existingBuff) {
    await existingBuff.update({
      "system.changes": changes,
      "system.active": true
    });
  } else {
    await actor.createEmbeddedDocuments("Item", [{
      name: buffName,
      type: "buff",
      img: "icons/svg/aura.svg",
      system: {
        changes: changes,
        description: { value: "Buff to set initiative and HP modifiers." },
        active: true,
        duration: {},
        level: 0,
        subType: "perm",
        tags: []
      }
    }]);
  }
}

new Dialog({
  title: "Quick Combat Buff",
  content: content,
  buttons: {
    update: {
      label: "Update",
      callback: async html => {
        const newInit = parseInt(html.find('[name="initiative"]').val());
        const newHP = parseInt(html.find('[name="hp"]').val());

        await updateInitHpBuff(actor, newInit, newHP);
      }
    },
    cancel: {
      label: "Cancel"
    }
  }
}).render(true);