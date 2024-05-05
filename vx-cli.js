#!/usr/bin/env node

const fetch = require('node-fetch');
const { bls12_381: bls } = require('@noble/curves/bls12-381');
const { sha256 } = require('@noble/hashes/sha256');
const {
  bytesToHex,
  concatBytes,
  hexToBytes,
  utf8ToBytes,
} = require('@noble/hashes/utils');
const { argv } = require('yargs');

const APP_SLUG = 'bustabit';
const GAME_SALT = '000000000000000000011f6e135efe67d7463dfe7bb955663ef88b1243b2deea';
const COMMITMENT = '567a98370fb7545137ddb53687723cf0b8a1f5e93b1f76f4a1da29416930fa59';
const VX_PUB_KEY = 'b40c94495f6e6e73619aeb54ec2fc84c5333f7a88ace82923946fc5b6c8635b08f9130888dd96e1749a1d5aab00020e4';

async function getVxSignature(gameId, gameHash) {
  const vxData = await getVxData(APP_SLUG, gameId, COMMITMENT);
  if (!vxData) {
    return null;
  }

  // Fix for SHA256 usage to accept Uint8Array and return Uint8Array
  const message = concatBytes(
    sha256(hexToBytes(GAME_SALT)),
    sha256(hexToBytes(gameHash)),
    utf8ToBytes(GAME_SALT)
  );

  const signature = hexToBytes(vxData.vx_signature);
  const isMessageMatch = bytesToHex(message) === vxData.message;
  const isVerified = bls.verify(signature, message, hexToBytes(VX_PUB_KEY));

  return {
    signature,
    message: bytesToHex(message), // Include message for clarity in the output
    messageMatch: isMessageMatch,
    verified: isVerified,
  };
}

async function getVxData(appSlug, index, commitment) {
  const query = `
    query AppsMessagesByIndex($appSlug: String!, $index: Int!, $commitment: String!) {
      appBySlug(slug: $appSlug) {
        id
        name
        vx {
          messagesByIndex(commitment: $commitment, index: $index) {
            vx_signature
            message
          }
        }
      }
    }
  `;

  try {
    const response = await fetch('https://server.actuallyfair.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: {
          appSlug,
          index,
          commitment,
        },
      }),
    });

    if (response.status !== 200) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const json = await response.json();
    if (json.errors) {
      throw new Error(`GraphQL error! ${json.errors[0].message}`);
    }

    return json.data?.appBySlug?.vx?.messagesByIndex?.[0];
  } catch (error) {
    console.error(error.message);
    return null;
  }
}

// Command-line usage
if (argv._[0] === 'query') {
  const gameId = parseInt(argv.gameId);
  const clientSeed = argv.clientSeed;
  // Fix to ensure gameHash input is directly used as a string in the getVxSignature
  const gameHash = argv.gameHash;

  if (isNaN(gameId)) {
    console.error('Game ID must be a number.');
    process.exit(1);
  }

  if (!clientSeed) {
    console.error('Client seed is required.');
    process.exit(1);
  }

  if (!gameHash || gameHash.length !== 64) {
    console.error(
      'Invalid game hash. It must be a 32-byte hexadecimal string.'
    );
    process.exit(1);
  }

  getVxSignature(gameId, clientSeed, gameHash)
    .then((result) => console.log(result))
    .catch((error) => console.error(error.message));
} else {
  console.log(
    'Usage: vx-cli.js query --gameId=<gameId> --clientSeed=<clientSeed> --gameHash=<gameHash>'
  );
}