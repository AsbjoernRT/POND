const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'locales');
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json') && !f.includes('schema'));

const translations = {
  volume_discount_remaining: "Add {{ count }} more to get {{ discount }}% off!",
  volume_discount_eligible: "You're getting {{ discount }}% off {{ count }} items!"
};

files.forEach(file => {
  const filePath = path.join(localesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');

  try {
    const json = JSON.parse(content);

    // Add translations if cart section exists and translations are missing
    if (json.cart) {
      if (!json.cart.volume_discount_remaining) {
        json.cart.volume_discount_remaining = translations.volume_discount_remaining;
      }
      if (!json.cart.volume_discount_eligible) {
        json.cart.volume_discount_eligible = translations.volume_discount_eligible;
      }

      // Write back
      fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
      console.log(`✅ Updated: ${file}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
});

console.log('\n✨ Done!');
