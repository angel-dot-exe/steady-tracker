import test from 'node:test';
import assert from 'node:assert/strict';
import handler,{seal,unseal} from './main.mjs';
process.env.TOKEN_ENCRYPTION_KEY='ab'.repeat(32);
process.env.APPWRITE_FUNCTION_API_ENDPOINT='https://example.invalid/v1';
process.env.APPWRITE_FUNCTION_PROJECT_ID='test-only';
test('provider credentials are encrypted and tampering is rejected',()=>{const value={access_token:'test-token-not-a-real-secret',refresh_token:'test-refresh'};const encrypted=seal(value);assert.equal(encrypted.includes(value.access_token),false);assert.deepEqual(unseal(encrypted),value);const data=Buffer.from(encrypted,'base64');data[data.length-1]^=1;assert.throws(()=>unseal(data.toString('base64')))});
test('an unauthenticated request cannot start a sync or read account status',async()=>{for(const action of ['sync','status','begin','finish']){const result=await handler({req:{headers:{'x-appwrite-key':'test-only'},bodyJson:{action}},res:{json:(body,status=200)=>({body,status})},error:()=>{}});assert.equal(result.status,401);assert.equal(JSON.stringify(result.body).includes('token'),false)}});
