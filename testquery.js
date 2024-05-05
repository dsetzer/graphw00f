const fetch = require('node-fetch');

async function sendGraphQLQuery() {
  const graphqlQuery = {
    query: `query {
  apps {
    nodes {
      vxConnectionString
    }
}`, // The query string
};

  try {
    const response = await fetch('https://server.actuallyfair.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(graphqlQuery),
    });

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

sendGraphQLQuery();