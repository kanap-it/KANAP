import * as assert from 'node:assert/strict';
import { DEFAULT_CLASSIFICATION_CATALOG as defaults, catalogFromMetadata, highestClassification, resolveClassificationOption, validateClassificationCatalog, validateDuration } from '../../it-ops-settings/classification-catalog';
import { classificationPatch, classificationReadState, copyClassification } from '../services/application-classification';
const catalog = structuredClone(defaults);
for (const value of [-1,0,0.5,NaN,Infinity,2147483648,'60',undefined]) assert.throws(() => validateDuration(value,'rto'));
assert.equal(validateDuration(0,'rpo',true),0);

// Ranks and orders follow array position, whatever the client sends.
const shuffled = structuredClone(catalog);
shuffled.businessCriticalityLevels.forEach((level, index) => { level.rank = [7, 2, 9, 4][index]; });
shuffled.recoveryWaves.forEach((wave, index) => { wave.order = [30, 10, 20, 0][index]; });
const normalized = validateClassificationCatalog(shuffled);
assert.deepEqual(normalized.businessCriticalityLevels.map((item) => [item.code, item.rank]), [['business_critical',4],['high',3],['medium',2],['low',1]]);
assert.deepEqual(normalized.cyberCriticalityLevels.map((item) => item.rank), [4,3,2,1]);
assert.deepEqual(normalized.recoveryWaves.map((item) => item.order), [0,1,2,3]);
// Reading sorts by stored rank so a tenant stored least-severe-first is displayed most-severe-first.
const stored = catalogFromMetadata({ cyber_criticality_levels: [...catalog.cyberCriticalityLevels].reverse() });
assert.deepEqual(stored.cyberCriticalityLevels.map((item) => item.code), ['critical','high','moderate','low']);
assert.deepEqual(catalogFromMetadata({data_classes:[{code:'secret',label:'Custom'},{code:'open',label:'Open'}]}).dataClasses.map(x=>[x.code,x.rank]),[['open',2],['secret',1]]);

for (const mutate of [
  (c: any) => c.cyberCriticalityLevels[1].code = 'low',
  (c: any) => c.cyberCriticalityLevels[1].label = ' critical ',
  (c: any) => c.businessCriticalityLevels[0].maxMtdMinutes = 0,
  (c: any) => c.businessCriticalityLevels[0].maxMtdMinutes = '240',
  (c: any) => c.recoveryWaves = [],
  (c: any) => c.dataClasses.forEach((item: any) => item.deprecated = true),
]) { const bad = structuredClone(catalog); mutate(bad); assert.throws(() => validateClassificationCatalog(bad)); }
// The downtime of a level is optional and unconstrained by the neighbouring levels.
const loose = structuredClone(catalog);
loose.businessCriticalityLevels[0].maxMtdMinutes = null; loose.businessCriticalityLevels[3].maxMtdMinutes = 60;
assert.deepEqual(validateClassificationCatalog(loose).businessCriticalityLevels.map((item) => item.maxMtdMinutes), [null,1440,4320,60]);
const custom = validateClassificationCatalog({ ...structuredClone(catalog), businessCriticalityLevels: [
  {code:'tier_z',label:'A',description:'',rank:0,maxMtdMinutes:30},
  {code:'tier_a',label:'Z',description:'',rank:0,maxMtdMinutes:900},
  {code:'tier_q',label:'B',description:'',rank:0,maxMtdMinutes:null},
]});
assert.deepEqual(highestClassification(['tier_q',null,'tier_z'],custom.businessCriticalityLevels),{code:'tier_z',incomplete:true});
assert.deepEqual(highestClassification(['unknown',null],custom.businessCriticalityLevels),{code:null,incomplete:true});

// Business criticality is chosen directly, by code or by exact label.
const old = {criticality:'medium',classification_revision:0};
assert.equal(classificationPatch({},old,catalog).criticality,undefined);
assert.equal(classificationPatch({},old,catalog).classification_revision,0);
const chosen = {...old,...classificationPatch({criticality:'High'},old,catalog)};
assert.equal(chosen.criticality,'high'); assert.equal(chosen.classification_revision,1);
assert.equal(classificationPatch({criticality:'business_critical'},chosen,catalog).criticality,'business_critical');
assert.equal(classificationPatch({criticality:null},chosen,catalog).criticality,null);
assert.throws(()=>classificationPatch({criticality:'unknown'},old,catalog),/Unknown or ambiguous/);
const deprecatedCatalog = structuredClone(catalog); deprecatedCatalog.businessCriticalityLevels[1].deprecated = true;
assert.throws(()=>classificationPatch({criticality:'high'},old,deprecatedCatalog),/deprecated/);
assert.equal(classificationPatch({criticality:'high'},chosen,deprecatedCatalog).criticality,'high');
for(const key of ['classification_review','classification_revision','classification_review_state']) assert.throws(()=>classificationPatch({[key]:null},old,catalog));
const option = {...catalog.cyberCriticalityLevels[3],deprecated:true};
assert.throws(()=>resolveClassificationOption('low',[option])); assert.equal(resolveClassificationOption('low',[option],'low'),'low');
assert.throws(()=>resolveClassificationOption('Same',[{code:'a',label:'Same'},{code:'b',label:'Same'}]));

// Review is a timestamp: never invalidated by the catalog, flagged when the application changes.
const complete:any = {...chosen,cyber_criticality:'high',data_class:'internal',recovery_wave:'vital',classification_justification:'Agreed service needs',classification_review:null};
assert.deepEqual(classificationReadState({...complete,criticality:null}),{classification_review_state:'incomplete',classification_review_reason:'missing_fields',classification_reviewed_at:null});
assert.equal(classificationReadState(complete).classification_review_reason,'never_reviewed');
complete.classification_review={user_id:'test',reviewed_at:'2026-09-05T00:00:00Z',revision:complete.classification_revision};
assert.equal(classificationReadState(complete).classification_review_state,'reviewed');
assert.equal(classificationReadState({...complete,...classificationPatch({name:'Renamed'},complete,catalog)}).classification_review_state,'reviewed');
const changed = {...complete,...classificationPatch({rpo_minutes:0},complete,catalog)};
assert.deepEqual([classificationReadState(changed).classification_review_state, classificationReadState(changed).classification_review_reason, classificationReadState(changed).classification_reviewed_at],['stale','data_changed','2026-09-05T00:00:00Z']);
assert.equal(classificationReadState({...complete,cyber_criticality:null}).classification_reviewed_at,'2026-09-05T00:00:00Z');
const copy = copyClassification({...complete,last_dr_test:'2026-01-01'},catalog);
assert.deepEqual([copy.criticality,copy.classification_review,copy.classification_revision,copy.last_dr_test],['high',null,0,null]);
console.log('Application classification: catalog order, validation, direct choice, review and copy passed');
