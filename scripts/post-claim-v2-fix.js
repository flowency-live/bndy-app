const fs=require('fs');
let p='src/features/join/ClaimEvidenceStep.tsx';let s=fs.readFileSync(p,'utf8');
s=s.replace('trackJoin("claim_requested",{entityType,step:"claim",verification:"manual",role:requestedRole});','trackJoin("claim_requested",{entityType,step:"claim",result:"manual_evidence"});');
fs.writeFileSync(p,s);
p='src/features/join/JoinVenueFlow.tsx';s=fs.readFileSync(p,'utf8');s=s.replaceAll(' setClaimSubmitted(false);','').replaceAll('setClaimSubmitted(false);','');fs.writeFileSync(p,s);
