(()=>{
  const q=s=>document.querySelector(s);
  function setDot(kind=''){const d=q('#floodDot');if(d)d.className='dot '+kind}
  async function load(){
    const status=q('#floodStatus'),detail=q('#floodDetail'),time=q('#floodTime');
    if(!status||!detail||!time)return;
    try{
      const r=await fetch('/api/flood-forecast',{cache:'no-store'});
      const d=await r.json();
      if(!r.ok||!['none','active'].includes(d.state))throw Error(d.error||'取得失敗');
      if(d.state==='none'){
        status.textContent='荒川の氾濫情報なし';
        detail.textContent='';
        time.textContent=statusTimestamp(d.retrievedAt);
        setDot('ok');
        return;
      }
      status.textContent=d.label||'指定河川洪水予報 発表中';
      detail.textContent=d.headline||'荒川の指定河川洪水予報が発表されています。公式情報を確認してください。';
      time.textContent=statusTimestamp(d.retrievedAt,d.reportDatetime);
      setDot(d.level>=5?'lv5':d.level>=4?'lv4':d.level>=3?'warn':'adv');
    }catch{
      status.textContent='取得できません';
      detail.textContent='気象庁の指定河川洪水予報を直接確認してください。';
      time.textContent='取得失敗 '+fmt(Date.now());
      setDot('');
    }
  }
  load();setInterval(load,300000);
})();
