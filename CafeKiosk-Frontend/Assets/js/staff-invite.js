(function(){
  'use strict';
  const $ = id => document.getElementById(id);

  function origin(){
    if(location.protocol==='http:'||location.protocol==='https:'){
      const p=location.port;
      return (!p||p==='80'||p==='443'||p==='5000') ? location.origin : `${location.protocol}//${location.hostname}:5000`;
    }
    return 'http://127.0.0.1:5000';
  }

  function authHeaders(){
    const token = localStorage.getItem('cafeAdminAuthToken') || sessionStorage.getItem('cafeAuthToken') || '';
    return token ? {Authorization:`Bearer ${token}`} : {};
  }

  function setDelivery(text, type='info'){
    const el=$('inviteDeliveryStatus');
    if(!el) return;
    el.textContent=text||'';
    el.dataset.type=type;
    el.style.display=text?'block':'none';
  }

  document.addEventListener('DOMContentLoaded',()=>{
    const modal=$('inviteModal'), form=$('inviteForm');

    $('inviteUser')?.addEventListener('click',()=>{
      if(modal) modal.classList.add('open');
      if($('inviteResult')) $('inviteResult').style.display='none';
      if($('inviteMessage')) $('inviteMessage').textContent='';
      if($('inviteEmailInput')) $('inviteEmailInput').value='';
      if($('inviteRoleInput')) $('inviteRoleInput').value='Staff';
      setDelivery('');
      setTimeout(()=>$('inviteEmailInput')?.focus(),80);
    });

    $('closeInvite')?.addEventListener('click',()=>modal?.classList.remove('open'));

    form?.addEventListener('submit',async e=>{
      e.preventDefault();
      const button=form.querySelector('button[type="submit"]');
      const email=$('inviteEmailInput').value.trim();
      const role=$('inviteRoleInput').value;
      button.disabled=true;
      button.textContent='Sending...';
      $('inviteMessage').textContent='Creating a secure invitation and sending email...';
      setDelivery('');

      try{
        const response=await fetch(`${origin()}/api/auth/invites`,{
          method:'POST',
          credentials:'include',
          headers:{'Content-Type':'application/json',...authHeaders()},
          body:JSON.stringify({email,role,expiresHours:48})
        });
        const data=await response.json().catch(()=>({}));
        if(!response.ok) throw new Error(data.message||'Unable to send invitation.');

        if(data.authToken){
          if(window.CafeAuth?.replaceToken) window.CafeAuth.replaceToken(data.authToken);
          else {
            localStorage.setItem('cafeAdminAuthToken', data.authToken);
            sessionStorage.setItem('cafeAuthToken', data.authToken);
          }
        }

        const link=data.inviteUrl || new URL(data.signupPath, origin()).href;
        $('inviteLink').value=link;
        $('openInvite').href=link;
        $('inviteResult').style.display='block';
        $('inviteMessage').textContent='';

        if(data.emailSent){
          setDelivery(`Email sent to ${data.invitedEmail || email}. The invitation expires in ${data.expiresHours || 48} hours.`, 'success');
          window.CafeMessageDialog?.show(
            `${data.role || role} invitation sent to ${data.invitedEmail || email} for ${data.cafeName || 'this cafe'}.`,
            {type:'success',title:'Invitation Email Sent'}
          );
        }else{
          const detail=data.emailError ? ` ${data.emailError}` : '';
          setDelivery(`The secure invitation was created, but email delivery did not complete.${detail} Use the backup link below.`, 'warning');
          window.CafeMessageDialog?.show(
            `Invitation created, but the email was not sent.${detail} You can copy the backup signup link.`,
            {type:'warning',title:'Email Not Sent'}
          );
        }
      }catch(error){
        $('inviteMessage').textContent='';
        window.CafeMessageDialog?.show(error.message, {type:'error',title:'Invitation Error'});
      }finally{
        button.disabled=false;
        button.textContent='Send Email Invitation';
      }
    });

    $('copyInvite')?.addEventListener('click',async()=>{
      const link=$('inviteLink')?.value||'';
      if(!link) return;
      try{
        await navigator.clipboard.writeText(link);
        window.CafeMessageDialog?.show('Backup invitation link copied.', {type:'success',title:'Copied'});
      }catch{
        $('inviteLink')?.select();
        document.execCommand('copy');
        window.CafeMessageDialog?.show('Backup invitation link copied.', {type:'success',title:'Copied'});
      }
    });
  });
})();
