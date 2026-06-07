const https=require('https');
const id='89a3ab73-dc76-48f9-888d-c3dc4ca4be79';
const pId='0aa153d7-255d-440b-8945-cc87807fe859';
const q=JSON.stringify({query:`query { app(projectId: "${pId}") { byId(id: "${id}") { status error artifacts { buildUrl } } } }`});
const req=https.request('https://expo.dev/api/graphql',{method:'POST',headers:{'content-type':'application/json'}},res=>{
  let d='';
  res.on('data',c=>d+=c);
  res.on('end',()=>{
    console.log(JSON.parse(d).data.app.byId);
  });
});
req.write(q);
req.end();
