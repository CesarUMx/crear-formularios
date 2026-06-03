import crypto from 'crypto';
import { HubSpotMatchOperator } from '@prisma/client';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits para GCM
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.HUBSPOT_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('HUBSPOT_ENCRYPTION_KEY no está configurada en las variables de entorno');
  }
  // Derivar 32 bytes desde la clave env (sha256)
  return crypto.createHash('sha256').update(key).digest();
}

export function encryptToken(plainToken: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM;
  const encrypted = Buffer.concat([cipher.update(plainToken, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Formato: iv(12) + authTag(16) + encrypted → hex
  return Buffer.concat([iv, authTag, encrypted]).toString('hex');
}

export function decryptToken(encryptedHex: string): string {
  const key = getEncryptionKey();
  const data = Buffer.from(encryptedHex, 'hex');
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv) as crypto.DecipherGCM;
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

// ─── HubSpot API ─────────────────────────────────────────────────────────────

const HS_API_BASE = 'https://api.hubapi.com/crm/v3/objects';

export interface HubSpotSearchResult {
  total: number;
  results: Array<{ id: string; properties: Record<string, string | null> }>;
}

function buildFilterGroup(
  matchOperator: HubSpotMatchOperator,
  matchProperty: string,
  matchValue: string
) {
  // HubSpot filter operators
  const operatorMap: Record<HubSpotMatchOperator, string> = {
    EQ: 'EQ',
    NEQ: 'NEQ',
    CONTAINS_TOKEN: 'CONTAINS_TOKEN',
    HAS_PROPERTY: 'HAS_PROPERTY',
    NOT_HAS_PROPERTY: 'NOT_HAS_PROPERTY',
  };

  const filter: Record<string, string> = {
    propertyName: matchProperty,
    operator: operatorMap[matchOperator],
  };

  // Estos operadores no usan value
  if (
    matchOperator !== 'HAS_PROPERTY' &&
    matchOperator !== 'NOT_HAS_PROPERTY'
  ) {
    filter.value = matchValue;
  }

  return { filters: [filter] };
}

export async function searchHubSpotObject(
  objectType: 'contacts' | 'deals',
  matchOperator: HubSpotMatchOperator,
  matchProperty: string,
  matchValue: string,
  accessToken: string,
  propertiesToFetch: string[] = []
): Promise<HubSpotSearchResult> {
  const body = {
    filterGroups: [buildFilterGroup(matchOperator, matchProperty, matchValue)],
    sorts: [{ propertyName: 'hs_lastmodifieddate', direction: 'DESCENDING' }],
    properties: [matchProperty, ...propertiesToFetch],
    limit: 5,
    after: 0,
  };

  const response = await fetch(`${HS_API_BASE}/${objectType}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HubSpot API error ${response.status}: ${text}`);
  }

  return response.json() as Promise<HubSpotSearchResult>;
}

export async function updateHubSpotObject(
  objectType: 'contacts' | 'deals',
  objectId: string,
  properties: Record<string, string>,
  accessToken: string
): Promise<void> {
  const response = await fetch(`${HS_API_BASE}/${objectType}/${objectId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ properties }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HubSpot PATCH error ${response.status}: ${text}`);
  }
}
