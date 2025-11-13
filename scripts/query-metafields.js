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

async function queryMetafieldDefinitions() {
  const query = `
    query MetafieldDefinitions($ownerType: MetafieldOwnerType!, $first: Int) {
      metafieldDefinitions(ownerType: $ownerType, first: $first) {
        nodes {
          id
          name
          namespace
          key
          type {
            name
          }
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
      query,
      variables: {
        ownerType: 'PRODUCT',
        first: 50,
      },
    }),
  });

  const data = await response.json();

  if (data.errors) {
    console.error('GraphQL Errors:', JSON.stringify(data.errors, null, 2));
    return;
  }

  console.log('Existing metafield definitions:');
  console.log(JSON.stringify(data.data.metafieldDefinitions.nodes, null, 2));
}

queryMetafieldDefinitions().catch(console.error);
