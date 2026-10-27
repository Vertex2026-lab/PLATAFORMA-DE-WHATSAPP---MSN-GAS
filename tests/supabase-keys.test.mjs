import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from '../lib/store.js';
import {authRequest} from '../lib/auth.js';
test('chaves legadas e novas usam os cabeçalhos adequados, sem trocar o token da sessão', async()=>{
 const originalFetch=globalThis.fetch;
 const names=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','AUTHORIZED_EMAILS'];
 const old=Object.fromEntries(names.map(n=>[n,process.env[n]]));
 process.env.SUPABASE_URL='https://keys.test';process.env.AUTHORIZED_EMAILS='agent@example.test';
 const requests=[];
 globalThis.fetch=async(url,options)=>{requests.push({url,options});return new Response(JSON.stringify(url.includes('/rest/')?[]:{email:'agent@example.test'}),{status:200})};
 try{
  process.env.SUPABASE_SERVICE_ROLE_KEY='legacy-test-jwt';await database('app_state');
  assert.equal(requests.at(-1).options.headers.Authorization,'Bearer legacy-test-jwt');
  process.env.SUPABASE_SERVICE_ROLE_KEY='sb_secret_test_fixture_only';await database('app_state');
  assert.equal(requests.at(-1).options.headers.apikey,'sb_secret_test_fixture_only');
  assert.equal(requests.at(-1).options.headers.Authorization,undefined);
  await authRequest('token?grant_type=password',{email:'agent@example.test',password:'fixture-only'});
  assert.equal(requests.at(-1).options.headers.apikey,'sb_secret_test_fixture_only');
  assert.equal(requests.at(-1).options.headers.Authorization,undefined);
  await authRequest('user',null,'user-session-fixture');
  assert.equal(requests.at(-1).options.headers.Authorization,'Bearer user-session-fixture');
 }finally{globalThis.fetch=originalFetch;for(const n of names){if(old[n]===undefined)delete process.env[n];else process.env[n]=old[n]}}
});
