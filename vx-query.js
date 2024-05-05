const fetch = require('node-fetch');
const { argv } = require('yargs');
const https = require('https');

// Enhanced HTTPS Agent for secured connections; optional
const agent = new https.Agent({
  keepAlive: true, // Keep connections alive (optional)
  rejectUnauthorized: true, // Ensure certificates must be valid
});

async function sendGraphQLQuery(query) {
  try {
    const response = await fetch('https://server.actuallyfair.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      agent, // Applies the HTTPS agent to the request
    });

    if (response.status !== 200) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const json = await response.json();

    // Checking for errors within the successful GraphQL response
    if (json.errors) {
      console.error('GraphQL error:', json.errors);
      return null;
    }

    return json;
  } catch (error) {
    console.error('Request failed:', error.message);
    return null;
  }
}

// Command-line usage
if (argv._[0] === 'query') {
  const graphqlQuery = argv.query;

  if (!graphqlQuery) {
    console.error('GraphQL query is required.');
    process.exit(1);
  }

  sendGraphQLQuery(graphqlQuery)
    .then((result) => {
      if (result)console.log(JSON.stringify(result, null, 1));
    })
    .catch((error) => console.error('Unexpected error:', error.message));
} else {
  console.log('Usage: vx-query.js query --query="<YourGraphQLQuery>"');
}