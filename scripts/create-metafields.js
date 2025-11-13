const fs = require('fs');
const path = require('path');

// Read .env file manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const SHOPIFY_STORE = 'pond-copenhagen';
const SHOPIFY_ACCESS_TOKEN = envVars.SHOPIFY_ADMIN_ACCESS_TOKEN;

const metafieldsToCreate = [
  {
    name: 'Feature 1 Title',
    namespace: 'custom',
    key: 'feature_1_title',
    type: 'single_line_text_field',
    description: 'Title for the first product feature'
  },
  {
    name: 'Feature 1 Caption',
    namespace: 'custom',
    key: 'feature_1_caption',
    type: 'multi_line_text_field',
    description: 'Caption for the first product feature'
  },
  {
    name: 'Feature 2 Title',
    namespace: 'custom',
    key: 'feature_2_title',
    type: 'single_line_text_field',
    description: 'Title for the second product feature'
  },
  {
    name: 'Feature 2 Caption',
    namespace: 'custom',
    key: 'feature_2_caption',
    type: 'multi_line_text_field',
    description: 'Caption for the second product feature'
  },
  {
    name: 'Feature 3 Title',
    namespace: 'custom',
    key: 'feature_3_title',
    type: 'single_line_text_field',
    description: 'Title for the third product feature'
  },
  {
    name: 'Feature 3 Caption',
    namespace: 'custom',
    key: 'feature_3_caption',
    type: 'multi_line_text_field',
    description: 'Caption for the third product feature'
  }
];

async function createMetafieldDefinition(metafield) {
  const mutation = `
    mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition {
          id
          name
          namespace
          key
          type {
            name
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const response = await fetch(`https://${SHOPIFY_STORE}.myshopify.com/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        definition: {
          name: metafield.name,
          namespace: metafield.namespace,
          key: metafield.key,
          description: metafield.description,
          type: metafield.type,
          ownerType: 'PRODUCT'
        }
      }
    }),
  });

  const data = await response.json();

  if (data.errors) {
    console.error(`❌ Error creating ${metafield.key}:`, JSON.stringify(data.errors, null, 2));
    return false;
  }

  if (data.data.metafieldDefinitionCreate.userErrors.length > 0) {
    console.error(`❌ User errors creating ${metafield.key}:`,
      JSON.stringify(data.data.metafieldDefinitionCreate.userErrors, null, 2));
    return false;
  }

  console.log(`✅ Created: ${metafield.name} (${metafield.namespace}.${metafield.key})`);
  return true;
}

async function createAllMetafields() {
  console.log('Creating metafield definitions...\n');

  for (const metafield of metafieldsToCreate) {
    await createMetafieldDefinition(metafield);
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n✨ Done!');
}

createAllMetafields().catch(console.error);
