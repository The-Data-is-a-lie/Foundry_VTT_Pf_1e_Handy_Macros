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