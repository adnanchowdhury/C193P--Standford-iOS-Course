'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const c = require('./controller.cjs');
const head = 'a'.repeat(40);
const base = 'b'.repeat(40);
const bot = {login:c.BOT, id:c.BOT_ID, type:'Bot'};
function fixture() {
  const repository = {full_name:'owner/repo', default_branch:'main'};
  return {
    repo:'owner/repo',
    pr:{number:1,state:'open',draft:false,merged:false,head:{sha:head,ref:'feature',repo:repository},base:{sha:base,ref:'main',repo:repository}},
    review:{id:7,user:bot,state:'COMMENTED',commit_id:head},
    comments:[{id:8,user:bot,pull_request_review_id:7,commit_id:head,path:'src/a.js',line:2,body:'Fix the boundary check.'}],
    files:[{filename:'src/a.js'}],runs:[],commits:[],runId:9,attempt:1,config:{checks:['node --test']}
  };
}
test('accepts a current review from the verified bot', () => {
  const result = c.decide(fixture());
  assert.equal(result.eligible,true);
  assert.equal(result.findings.length,1);
});
const rejected = {
  'forged bot ID': f => { f.review.user={...bot,id:1}; },
  'human with bot name': f => { f.review.user={...bot,type:'User'}; },
  'stale review': f => { f.review.commit_id=base; },
  'fork head': f => { f.pr.head.repo={full_name:'stranger/repo'}; },
  'closed PR': f => { f.pr.state='closed'; },
  'draft PR': f => { f.pr.draft=true; },
  'default branch destination': f => { f.pr.head.ref='main'; },
  'rerun': f => { f.attempt=2; },
  'duplicate commit run': f => { f.runs=[{id:8,actor:bot,display_title:`Codex autofix #1 ${head}`}]; },
  'previous automatic fix': f => { f.commits=[{commit:{message:'fix\nCodex-Autofix-Review: 6'}}]; },
  'no inline findings': f => { f.comments=[]; },
  'outdated inline finding': f => { f.comments[0].line=null; },
  'missing inline line': f => { delete f.comments[0].line; },
  'different review inline finding': f => { f.comments[0].pull_request_review_id=2; },
  'unverified inline author': f => { f.comments[0].user={...bot,id:1}; },
  'workflow edit in PR': f => { f.files.push({filename:'.github/workflows/ci.yml'}); },
  'renamed protected file': f => { f.files[0].previous_filename='.env'; },
  'no tests configured': f => { f.config.checks=[]; },
  'explicit readiness blocker': f => { f.config.blocked_reason='No deterministic tests.'; }
};
for (const [name, mutate] of Object.entries(rejected)) test(`rejects ${name}`,()=>{
  const f=fixture(); mutate(f); assert.equal(c.decide(f).eligible,false);
});
test('does not treat its own run as a duplicate',()=>{
  const f=fixture(); f.runs=[{id:9,display_title:`Codex autofix #1 ${head}`}];
  assert.equal(c.decide(f).eligible,true);
});
test('a prior human review and a later queued bot run do not block the first bot run',()=>{
  const f=fixture(); f.runs=[{id:7,actor:{id:1,login:'human'},display_title:`Codex autofix #1 ${head}`},{id:10,actor:bot,display_title:`Codex autofix #1 ${head}`}];
  assert.equal(c.decide(f).eligible,true);
});
for (const p of ['../a','/a','a/../../b','a\\b','.env','.github/workflows/x.yml','src/.codex/config.toml','config.ini','AGENTS.md','package-lock.json','composer.json','database/backup.sql','private.pem','node_modules/a.js']) {
  test(`rejects unsafe path ${p}`,()=>assert.equal(c.safePath(p),false));
}
test('applies repository-specific protected paths',()=>{
  assert.equal(c.safePath('content/clinical.json',{protected_paths:['content']}),false);
  assert.equal(c.safePath('src/content.js',{protected_paths:['content']}),true);
});
const change = {path:'src/a.js',mode:'100644',content:'export const value = 2;\n'};
test('accepts a bounded change and new regression test',()=>{
  assert.equal(c.validateChanges([change,{...change,path:'tests/a.test.js'}],{},['src/a.js']).length,2);
});
test('allows configured adjacent tests only for changed source',()=>{
  assert.doesNotThrow(()=>c.validateChanges([{...change,path:'resources/js/a.test.ts'}],{adjacent_tests:true},['resources/js/a.ts']));
  assert.throws(()=>c.validateChanges([{...change,path:'resources/js/unrelated.test.ts'}],{adjacent_tests:true},['resources/js/a.ts']));
});
for (const [name, changes] of Object.entries({
  empty:[],
  duplicate:[change,change],
  unrelated:[{...change,path:'src/unrelated.js'}],
  symlink:[{...change,mode:'120000'}],
  binary:[{...change,content:'a\x00b'}],
  credential:[{...change,content:'sk-proj-'+'x'.repeat(30)}],
  oversized:[{...change,content:'x'.repeat(200001)}],
})) test(`rejects ${name} candidate`,()=>assert.throws(()=>c.validateChanges(changes,{},['src/a.js'])));

function repo(t) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'codex-autofix-test-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const git=(...args)=>cp.execFileSync('git',args,{cwd:dir,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  git('init','-b','main'); git('config','user.name','Synthetic Test'); git('config','user.email','test@example.invalid');
  fs.mkdirSync(path.join(dir,'src')); fs.writeFileSync(path.join(dir,'src/a.js'),'export const value = 1;\n');
  git('add','.');git('commit','-m','Synthetic base');
  return {dir,git,head:git('rev-parse','HEAD')};
}
test('collects new regression files and tracked edits; patch round trips',t=>{
  const r=repo(t);
  fs.writeFileSync(path.join(r.dir,'src/a.js'),change.content);
  fs.mkdirSync(path.join(r.dir,'tests'));fs.writeFileSync(path.join(r.dir,'tests/a.test.js'),'// synthetic test\n');
  const changes=c.collectChanges(r.dir,r.head,{},['src/a.js']);
  assert.equal(changes.length,2);
  r.git('reset','--hard',r.head);fs.rmSync(path.join(r.dir,'tests'),{recursive:true,force:true});
  c.applyChanges(r.dir,changes,{},['src/a.js']);
  assert.deepEqual(c.collectChanges(r.dir,r.head,{},['src/a.js']),changes);
});
test('refuses agent-created commit',t=>{
  const r=repo(t);r.git('commit','--allow-empty','-m','Unexpected commit');
  assert.throws(()=>c.collectChanges(r.dir,r.head,{},['src/a.js']),/revision/);
});
test('rejects symlinked destination parent',t=>{
  const r=repo(t);fs.symlinkSync(os.tmpdir(),path.join(r.dir,'tests'));
  assert.throws(()=>c.applyChanges(r.dir,[{...change,path:'tests/escape.js'}],{},['src/a.js']),/Symlink/);
});
test('collects deletion without reading outside the worktree',t=>{
  const r=repo(t);fs.unlinkSync(path.join(r.dir,'src/a.js'));
  assert.deepEqual(c.collectChanges(r.dir,r.head,{},['src/a.js']),[{path:'src/a.js',mode:'100644',content:null}]);
});
test('cloud validation cannot read or modify trusted runner files or inherit credentials', {skip:process.env.CODEX_TEST_ISOLATION !== 'true'}, t=>{
  const r=repo(t);
  const protectedFile=path.join(os.homedir(), 'codex-isolation-proof-'+process.pid);
  fs.writeFileSync(protectedFile,'trusted');
  t.after(()=>fs.rmSync(protectedFile,{force:true}));
  const quote = s => "'" + s.replace(/'/g, "'\\''") + "'";
  const check = 'node -e ' + quote(`const fs=require('node:fs'); const assert=require('node:assert/strict'); assert.equal(process.env.GITHUB_TOKEN,undefined); assert.equal(process.env.GITHUB_OUTPUT,undefined); assert.throws(()=>fs.readFileSync(${JSON.stringify(protectedFile)})); assert.throws(()=>fs.writeFileSync(${JSON.stringify(protectedFile)},'tampered')); fs.writeFileSync('validation-proof.txt','passed');`);
  const target=c.isolatedChecks(r.dir,{setup:[],checks:[check]});
  t.after(()=>fs.rmSync(path.dirname(target),{recursive:true,force:true}));
  assert.equal(fs.readFileSync(protectedFile,'utf8'),'trusted');
  assert.equal(fs.readFileSync(path.join(target,'validation-proof.txt'),'utf8'),'passed');
});
test('cloud validation refuses changes to any tracked source, even outside the fix', {skip:process.env.CODEX_TEST_ISOLATION !== 'true'}, t=>{
  const r=repo(t);
  assert.throws(()=>c.isolatedChecks(r.dir,{setup:[],checks:["printf 'tampered\\n' > src/a.js"]}),/changed tracked files/);
  assert.equal(fs.readFileSync(path.join(r.dir,'src/a.js'),'utf8'),'export const value = 1;\n');
});
