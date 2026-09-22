(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  function origin(){
    if(location.protocol==='http:'||location.protocol==='https:'){
      return location.port==='5000' ? location.origin : `${location.protocol}//${location.hostname}:5000`;
    }
    return 'http://127.0.0.1:5000';
  }
  function authHeaders(){
    const token = localStorage.getItem('cafeAdminAuthToken') || sessionStorage.getItem('cafeAuthToken') || '';
    return token ? {Authorization:`Bearer ${token}`} : {};
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const modal=$('inviteModal'), form=$('inviteForm');
    $('inviteUser')?.addEventListener('click',()=>{
      if(modal) modal.classList.add('open');
      if($('inviteResult')) $('inviteResult').style.display='none';
      if($('inviteMessage')) $('inviteMessage').textContent='';
    });
    $('closeInvite')?.addEventListener('click',()=>modal?.classList.remove('open'));
    form?.addEventListener('submit',async e=>{
      e.preventDefault();
      const button=form.querySelector('button[type="submit"]');
      button.disabled=true;
      button.textContent='Creating...';
      $('inviteMessage').textContent='Creating secure invitation...';
      try{
        const response=await fetch(`${origin()}/api/auth/invites`,{
          method:'POST', credentials:'include',
          headers:{'Content-Type':'application/json',...authHeaders()},
          body:JSON.stringify({email:$('inviteEmailInput').value.trim(),role:$('inviteRoleInput').value,expiresHours:48})
        });
        const data=await response.json().catch(()=>({}));
        if(!response.ok) throw new Error(data.message||'Unable to create invitation.');
        // The backend may upgrade a legacy/fallback Admin session to a
        // database-backed account while creating the first invitation. Keep
        // the refreshed token so all following Admin actions use that account.
        if(data.authToken){
          if(window.CafeAuth?.replaceToken) window.CafeAuth.replaceToken(data.authToken);
          else {
            localStorage.setItem('cafeAdminAuthToken', data.authToken);
            sessionStorage.setItem('cafeAuthToken', data.authToken);
          }
        }
        const link=new URL(data.signupPath, origin()).href;
        $('inviteLink').value=link;
        $('openInvite').href=link;
        $('inviteResult').style.display='block';
        $('inviteMessage').textContent=''; window.CafeMessageDialog?.show('Invitation created. It expires in 48 hours.', {type:'success',title:'Invitation Created'});
      }catch(error){
        $('inviteMessage').textContent=''; window.CafeMessageDialog?.show(error.message, {type:'error',title:'Invitation Error'});
      }finally{
        button.disabled=false;
        button.textContent='Create Invitation';
      }
    });
    $('copyInvite')?.addEventListener('click',async()=>{
      const link=$('inviteLink')?.value||'';
      if(!link) return;
      try{ await navigator.clipboard.writeText(link); $('inviteMessage').textContent=''; window.CafeMessageDialog?.show('Invitation link copied.', {type:'success',title:'Copied'}); }
      catch{ $('inviteLink')?.select(); document.execCommand('copy'); $('inviteMessage').textContent=''; window.CafeMessageDialog?.show('Invitation link copied.', {type:'success',title:'Copied'}); }
    });
  });
})();
