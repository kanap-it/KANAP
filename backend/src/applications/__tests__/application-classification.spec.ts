import * as assert from 'node:assert/strict';
import { DEFAULT_CLASSIFICATION_CATALOG as defaults, catalogFromMetadata, deriveBusinessCriticality, highestClassification, resolveClassificationOption, validateBusinessMtdChoice, validateClassificationCatalog, validateDuration } from '../../it-ops-settings/classification-catalog';
import { classificationPatch, classificationReadState, copyClassification } from '../services/application-classification';
const catalog = structuredClone(defaults);
for (const [minutes, expected] of [[null,null],[30,'business_critical'],[240,'business_critical'],[241,'high'],[1440,'high'],[1441,'medium'],[4320,'medium'],[4321,'low'],[10080,'low'],[20160,'low']] as const) assert.equal(deriveBusinessCriticality(minutes,catalog.businessCriticalityLevels), expected);
for (const value of [-1,0,0.5,NaN,Infinity,2147483648,'60',undefined]) assert.throws(() => validateDuration(value,'mtd'));
assert.equal(validateDuration(0,'rpo',true),0);
assert.equal(validateBusinessMtdChoice(null,catalog.businessMtdPresets),null);
assert.equal(validateBusinessMtdChoice(777,catalog.businessMtdPresets,777),777);
assert.throws(()=>validateBusinessMtdChoice(777,catalog.businessMtdPresets));
for (const mutate of [
  (c: any) => c.businessCriticalityLevels[1].maxMtdMinutes = 240,
  (c: any) => c.businessCriticalityLevels[3].maxMtdMinutes = 10080,
  (c: any) => c.cyberCriticalityLevels[1].code = 'low',
  (c: any) => c.cyberCriticalityLevels[1].rank = 1,
  (c: any) => c.businessMtdPresets = [],
]) { const bad = structuredClone(catalog); mutate(bad); assert.throws(() => validateClassificationCatalog(bad)); }
const custom = structuredClone(catalog); custom.businessCriticalityLevels = [
  {code:'tier_z',label:'A',description:'',rank:9,maxMtdMinutes:30},
  {code:'tier_a',label:'Z',description:'',rank:5,maxMtdMinutes:900},
  {code:'tier_q',label:'B',description:'',rank:1,maxMtdMinutes:null},
];
validateClassificationCatalog(custom); assert.equal(deriveBusinessCriticality(31,custom.businessCriticalityLevels),'tier_a');
assert.deepEqual(highestClassification(['tier_q',null,'tier_z'],custom.businessCriticalityLevels),{code:'tier_z',incomplete:true});
assert.deepEqual(highestClassification(['unknown',null],custom.businessCriticalityLevels),{code:null,incomplete:true});
const old = {criticality:'medium',legacy_criticality:'medium',business_criticality_origin:'legacy',business_mtd_minutes:null,classification_revision:0};
assert.equal(classificationPatch({},old,catalog).criticality,undefined);
const derived = {...old,...classificationPatch({business_mtd_minutes:1440},old,catalog)};
assert.equal(derived.criticality,'high'); assert.equal(derived.legacy_criticality,'medium');
const cleared = {...derived,...classificationPatch({business_mtd_minutes:null},derived,catalog)};
assert.equal(cleared.criticality,null); assert.equal(cleared.business_criticality_origin,'unset');
assert.throws(()=>classificationPatch({criticality:'high'},old,catalog));
assert.throws(()=>classificationPatch({business_mtd_minutes:1440,criticality:'low'},old,catalog));
assert.equal(classificationPatch({business_mtd_minutes:1440,criticality:'high'},old,catalog).criticality,'high');
assert.throws(()=>classificationPatch({business_mtd_minutes:777},old,catalog),/tenant-configured presets/);
assert.equal(classificationPatch({business_mtd_minutes:777},{...old,business_mtd_minutes:777},catalog).business_mtd_minutes,777);
for(const key of ['classification_review','classification_revision','legacy_criticality','business_criticality_origin']) assert.throws(()=>classificationPatch({[key]:null},old,catalog));
const option = {...catalog.cyberCriticalityLevels[0],deprecated:true};
assert.throws(()=>resolveClassificationOption('low',[option])); assert.equal(resolveClassificationOption('low',[option],'low'),'low');
assert.throws(()=>resolveClassificationOption('Same',[{code:'a',label:'Same'},{code:'b',label:'Same'}]));
const complete:any = {...derived,cyber_criticality:'high',data_class:'internal',recovery_wave:'vital',classification_justification:'Agreed service needs',classification_review:null};
assert.equal(classificationReadState(complete,catalog).classification_review_state,'stale');
complete.classification_review={user_id:'test',reviewed_at:'2026-09-05T00:00:00Z',revision:complete.classification_revision,versions:catalog.classificationVersions};
assert.equal(classificationReadState(complete,catalog).classification_review_state,'reviewed');
assert.equal(classificationReadState({...complete,...classificationPatch({name:'Renamed'},complete,catalog)},catalog).classification_review_state,'reviewed');
assert.equal(classificationReadState({...complete,...classificationPatch({rpo_minutes:0},complete,catalog)},catalog).classification_review_state,'stale');
assert.equal(classificationReadState(complete,{...catalog,classificationVersions:{...catalog.classificationVersions,cyber:2}}).classification_review_reason,'method_changed');
assert.throws(()=>classificationPatch({expected_classification_revision:999},complete,catalog));
assert.throws(()=>classificationPatch({expected_classification_versions:{business:9}},complete,catalog));
assert.equal(copyClassification(complete,catalog).classification_review,null);
assert.equal(copyClassification({...complete,last_dr_test:'2026-01-01'},catalog).last_dr_test,null);
assert.equal(copyClassification(old,catalog).business_criticality_origin,'legacy');
assert.deepEqual(catalogFromMetadata({data_classes:[{code:'secret',label:'Custom'},{code:'open',label:'Open'}]}).dataClasses.map(x=>x.rank),[1,2]);
console.log('Application classification: boundary, catalog, legacy, review, concurrency, copy and tenant defaults passed');
