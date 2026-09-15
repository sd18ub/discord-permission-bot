const { PermissionsBitField } = require('discord.js');

// Liste des noms de permissions valides (cles de PermissionFlagsBits)
const VALID_PERMISSIONS = Object.keys(PermissionsBitField.Flags);

function parsePermissions(input) {
  if (!input) return { valid: [], invalid: [] };

  const names = input
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const valid = [];
  const invalid = [];

  for (const name of names) {
    const match = VALID_PERMISSIONS.find(
      (p) => p.toLowerCase() === name.toLowerCase()
    );
    if (match) {
      valid.push(match);
    } else {
      invalid.push(name);
    }
  }

  return { valid, invalid };
}

module.exports = { VALID_PERMISSIONS, parsePermissions };
